const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Photographer = require("../models/photographerModel");
const LayoutContent = require("../models/layoutContentModel");
const UserType = require("../models/typeModel");
const asyncHandler = require("express-async-handler");
const ImageVault = require("../models/imagebase/imageVaultModel");
const GST = require("../models/gstModel");
const Coupon = require("../models/couponModel");
const ReferralBalance = require("../models/referralBalanceModel");
const User = require("../models/userModel.js");
const Referral = require("../models/referralModel.js");
const Paper = require("../models/imagebase/paperModel");
const Frame = require("../models/imagebase/frameModel.js");
const Razorpay = require("razorpay");
const Monetization = require("../models/monetizationModel.js");
const ImageAnalytics = require("../models/imagebase/imageAnalyticsModel.js");
const { sendOrderThankYouMail } = require("../middleware/handleEmail.js");
const BuyerCounter = require("../models/buyerCounterModel.js");
const moment = require("moment");
const {
  registerDeliveryFromOrder,
} = require("../controller/deliveryController.js");
const {
  sendNotificationToUser,
} = require("../middleware/notificationUtils.js");
const { default: axios } = require("axios");

const getCounter = async (financialYear) => {
  const counterDoc = await BuyerCounter.findOne({ financialYear }).sort({
    createdAt: -1,
  });
  if (!counterDoc) {
    await BuyerCounter.create({ financialYear, counter: 0 });
    return 1;
  }
  return counterDoc.counter + 1;
};

const incrementCounter = async (financialYear) => {
  await BuyerCounter.findOneAndUpdate(
    { financialYear },
    { $inc: { counter: 1 } },
    { new: true }
  );
  return;
};

const deleteOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.query;

  if (!orderId) {
    res.status(400);
    throw new Error("Order Id is required to delete");
  }

  await Order.findByIdAndDelete(orderId);
  res.status(200).send({ message: "Order deleted" });
});

const createOrder = asyncHandler(async (req, res) => {
  const {
    userId,
    orderItems,
    paymentMethod,
    shippingAddress,
    discount,
    finalAmount,
    orderStatus,
    invoiceId,
    coupon,
    isPaid,
    gst,
    printStatus,
    link,
  } = req.body;

  const userType = await UserType.findOne({ user: userId }).select("type -_id");
  const type = userType?.type || null;

  const orderExist = await Order.findOne({ "userInfo.user": userId });

  const layoutContent = await LayoutContent.findOne({});
  const deliveryCharge = layoutContent?.charges?.delivery || false;
  const platformFees = layoutContent?.charges?.platform || false;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const financialYear =
    currentMonth < 3
      ? `${currentYear - 1}-${currentYear.toString().slice(-2)}`
      : `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

  const nextCounter = await getCounter(financialYear);
  let invoiceNumber = nextCounter.toString().padStart(4, "0");
  invoiceNumber = `CAB/${financialYear}/${invoiceNumber}`;

  const groupedOrders = orderItems.reduce((acc, item) => {
    const originalValue =
      item.initialSubTotal || item.imageInfo?.initialPrice || 0;
    const photographerId = item.imageInfo?.photographer;

    if (photographerId && originalValue >= 0) {
      if (!acc[photographerId]) acc[photographerId] = [];
      acc[photographerId].push(item);
    } else if (originalValue >= 0) {
      const printKey = `print-${acc.nextPrintId || 1}`;
      acc[printKey] = [item];
      acc.nextPrintId = (acc.nextPrintId || 1) + 1;
    }
    return acc;
  }, {});

  delete groupedOrders.nextPrintId;

  const orders = [];
  for (const [key, items] of Object.entries(groupedOrders)) {
    let totalAmount = 0;
    let discountForEachOrder = 0;

    const updatedItems = [];
    let totalDeliveryCharge = 0;
    for (let item of items) {
      let finalPrice = item.finalPrice || 0;
      let itemDiscount =
        (item.imageInfo?.discount || 0) +
        (item.frameInfo?.discount || 0) +
        (item.paperInfo?.discount || 0);

      // Apply Photographer discount from Paper model if userType is Photographer
      // if (type === "Photographer" && item.paperInfo?.paper) {
      //   const paper = await Paper.findById(item.paperInfo.paper).select(
      //     "photographerDiscount"
      //   );
      //   if (paper?.photographerDiscount) {
      //     const photographerDiscountAmount =
      //       (finalPrice * paper.photographerDiscount) / 100;
      //     itemDiscount += photographerDiscountAmount;
      //     finalPrice -= photographerDiscountAmount; // subtract before GST
      //   }
      // }

      const sgst = finalPrice * 0.09;
      const cgst = finalPrice * 0.09;
      const totalGST = sgst + cgst || 0;

      if (!item.paperInfo || !item.paperInfo.size) {
        totalDeliveryCharge += 0;
      } else if (deliveryCharge) {
        totalDeliveryCharge += await calculateDelhiveryCharge(
          item.paperInfo.size.width,
          item.paperInfo.size.height,
          !!item.frameInfo?.frame,
          shippingAddress.pincode
        );
      }

      updatedItems.push({
        ...item,
        sgst,
        cgst,
        totalGST,
      });

      totalAmount += finalPrice;
      discountForEachOrder += itemDiscount;
    }

    const hasPaper = updatedItems.some(
      (item) => item.paperInfo && item.paperInfo.paper
    );

    const order = new Order({
      userInfo: {
        user: userId,
        userType: type,
      },
      orderItems: updatedItems,
      paymentMethod,
      shippingAddress,
      discount: discountForEachOrder,
      totalAmount,
      orderStatus,
      invoiceId,
      finalAmount,
      isPaid,
      gst,
      printStatus: hasPaper ? "processing" : "no-print",
      invoiceNumber,
      invoiceNumber,
      deliveryCharge: updatedItems.every((item) => item.subTotal > 0)
        ? deliveryCharge
        : false,
      platformFees,
      platformFeesAmount: platformFees
        ? Number(
            (
              (totalAmount +
                (deliveryCharge ? totalDeliveryCharge : 0) +
                (totalAmount + (totalDeliveryCharge || 0)) * 0.18) *
              0.02
            ).toFixed(2)
          )
        : 0,
      deliveryChargeAmount: deliveryCharge ? totalDeliveryCharge : 0,
    });

    const savedOrder = await order.save();
    orders.push(savedOrder);
  }

  await incrementCounter(financialYear);

  if (coupon) {
    const couponData = await Coupon.findOne({ code: coupon });
    if (couponData) {
      couponData.usageCount += 1;
      couponData.users.push({ user: userId, userType: type });
      await couponData.save();
    }
  }

  const Model = type === "User" ? User : Photographer;
  const user = await Model.findOne({ _id: userId });

  if (user && user.referralcode && !orderExist) {
    const referral = await Referral.findOne({ code: user.referralcode });
    if (referral && referral.applicableTo === "user") {
      const commissionRate = referral.commissionRate;
      const price = (orders[0].finalAmount * 100) / (100 + 18);
      const balance = Math.round(price * (commissionRate / 100));

      await ReferralBalance.create({
        photographer: referral.photographer,
        amount: balance,
      });
    }
  }

  const customerName = `${user.firstName} ${user.lastName}`;
  const customerEmail = user.email;
  const orderDate = moment().format("dddd, MMMM Do YYYY");
  let itemNames = [];

  for (let item of orderItems) {
    if (item.imageInfo && item.imageInfo.image) {
      const image = await ImageVault.findById(item.imageInfo.image);
      if (image && image.title) itemNames.push(image.title);

      if (image && image._id) {
        const downloads = await Order.countDocuments({
          "orderItems.imageInfo.image": image._id,
        });

        await ImageAnalytics.findOneAndUpdate(
          { image: image._id },
          { downloads }
        );
      }
    }

    if (item.frameInfo && item.frameInfo.frame) {
      const frame = await Frame.findById(item.frameInfo.frame).select("name");
      if (frame && frame.name) itemNames.push(frame.name);
    }

    if (item.paperInfo && item.paperInfo.paper) {
      const paper = await Paper.findById(item.paperInfo.paper).select("name");
      if (paper && paper.name) itemNames.push(paper.name);
    }
  }

  const items = itemNames;
  const s3Links = orders.map((ord) => `https://clickedart.com/bill/${ord._id}`);

  await sendOrderThankYouMail(
    customerName,
    orderDate,
    items,
    customerEmail,
    s3Links
  );

  for (const ord of orders) {
    const order = await Order.findOne({ _id: ord._id }).populate(
      "userInfo.user"
    );

    if (!order) {
      console.error(`Order not found for ID: ${ord._id}`);
      continue;
    }

    if (order.printStatus === "no-print") continue;

    console.log("Fetched Order:", order);
    await registerDeliveryFromOrder(order);
  }

  res.status(201).send(orders);
});

const getAllOrders = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;

  const orders = await Order.find({})
    .populate({
      path: "orderItems",
      populate: [
        {
          path: "imageInfo.image",
          populate: {
            path: "photographer",
          },
        },
        {
          path: "frameInfo.frame",
        },
        {
          path: "paperInfo.paper",
        },
        {
          path: "imageInfo.photographer",
        },
      ],
    })
    .populate("userInfo.user")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  if (!orders || orders.length === 0)
    return res.status(400).send({ message: "Order not found" });

  const totalDocuments = await Order.countDocuments({});
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({ orders, pageCount });
});

const getFailedOrders = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;

  const orders = await Order.find({ orderStatus: "failed" })
    .populate({
      path: "orderItems",
      populate: [
        {
          path: "imageInfo.image",
          populate: {
            path: "photographer",
          },
        },
        {
          path: "frameInfo.frame",
        },
        {
          path: "paperInfo.paper",
        },
        {
          path: "imageInfo.photographer",
        },
      ],
    })
    .populate("userInfo.user")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  if (!orders || orders.length === 0)
    return res.status(400).send({ message: "Order not found" });

  const totalDocuments = await Order.countDocuments({ orderStatus: "failed" });
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({ orders, pageCount });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { userId, pageNumber = 1, pageSize = 20 } = req.query;
  const orders = await Order.find({ "userInfo.user": userId })
    .populate({
      path: "orderItems",
      populate: [
        {
          path: "imageInfo.image",
          select:
            "imageLinks.thumbnail photographer  resolutions title description story keywords category photographer license price location cameraDetails",
          populate: {
            path: "photographer",
          },
        },
        {
          path: "frameInfo.frame",
        },
        {
          path: "paperInfo.paper",
        },
        {
          path: "imageInfo.photographer",
        },
      ],
    })
    .populate("userInfo.user")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  if (!orders || orders.length === 0) {
    res.status(400);
    throw new Error("Order not found");
  }

  const totalDocuments = await Order.countDocuments({
    "userInfo.user": userId,
  });
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({ orders, pageCount });
});

const getOrdersByPhotographer = asyncHandler(async (req, res) => {
  const { photographer, pageNumber = 1, pageSize = 20 } = req.query;

  const orders = await Order.find({
    "orderItems.imageInfo.photographer": photographer,
    orderStatus: "completed",
  })
    .populate({
      path: "orderItems",
      populate: [
        {
          path: "imageInfo.image",
          select:
            "imageLinks.thumbnail photographer  resolutions title description story keywords category photographer license price location cameraDetails",
          populate: {
            path: "photographer",
          },
        },
        {
          path: "frameInfo.frame",
        },
        {
          path: "paperInfo.paper",
        },
        {
          path: "imageInfo.photographer",
        },
      ],
    })
    .populate("userInfo.user")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize);

  if (!orders || orders.length === 0) {
    res.status(404);
    throw new Error("No Orders Found");
  }

  const totalDocuments = await Order.countDocuments({
    "orderItems.imageInfo.photographer": photographer,
  });
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({ orders, pageCount });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, orderId } = req.body;

  if (!orderStatus || !orderId) {
    res.status(400);
    throw new Error("Order Status and Order Id is required to update");
  }

  const order = await Order.findById(orderId);
  const validStatusTypes = new Set(["pending", "completed", "cancelled"]);
  if (!validStatusTypes.has(orderStatus)) {
    res.status(400);
    throw new Error("Invalid order status");
  }

  order.orderStatus = orderStatus;

  if (orderStatus === "cancelled" || orderStatus === "pending") {
    order.isPaid = false;
  } else {
    order.isPaid = true;
  }

  await sendNotificationToUser({
    userId: order.userInfo.user,
    userType: order.userInfo.userType,
    title: `Order Status Updated`,
    body: `Your order is now: ${
      orderStatus?.slice(0, 1).toUpperCase() + orderStatus?.slice(1)
    }`,
    type: "order",
    data: {
      url: `${
        order.userInfo.userType === "User" ? "clickedart" : "clickedartartist"
      }://${order.printStatus === "no-print" ? "digitalorder" : "printorder"}/${
        order._id
      }`,
    },
  });

  await order.save();
  res.status(200).send({ message: "Order status updated" });
});

const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.query;

  if (!orderId)
    return res.status(400).send({ message: "Order Id is required" });

  const order = await Order.findById(orderId)
    .populate({
      path: "orderItems",
      populate: [
        {
          path: "imageInfo.image",
          select:
            "imageLinks.thumbnail photographer resolutions title description story keywords category photographer license price location cameraDetails featuredArtwork notForSale",
          populate: {
            path: "photographer",
          },
        },
        {
          path: "frameInfo.frame",
        },
        {
          path: "paperInfo.paper",
        },
        {
          path: "imageInfo.photographer",
        },
      ],
    })
    .populate("userInfo.user");

  res.status(200).send({ order });
});

const getOrderByStatus = asyncHandler(async (req, res) => {
  const { status, pageNumber = 1, pageSize = 20 } = req.query;

  const validStatusTypes = new Set(["pending", "completed", "cancelled"]);

  if (!validStatusTypes.has(status?.toLowerCase())) {
    return res.status(400).json({ status: false, message: "Invalid Action" });
  }

  const orders = await Order.find({ orderStatus: status })
    .populate({
      path: "orderItems",
      populate: [
        {
          path: "imageInfo.image",
          populate: {
            path: "photographer",
          },
        },
        {
          path: "frameInfo.frame",
        },
        {
          path: "paperInfo.paper",
        },
        {
          path: "imageInfo.photographer",
        },
      ],
    })
    .populate("userInfo.user")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageNumber);

  if (!orders || orders.length === 0) {
    res.status(404);
    throw new Error("Order not found");
  }

  const totalDocuments = await Order.countDocuments({ orderStatus: status });
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({ orders, pageCount });
});

const payment = asyncHandler(async (req, res) => {
  const { total, userId } = req.body; // Access from req.body

  if (!total || !userId) {
    res.status(400).json({ message: "Total amount and user ID are required." });
    return;
  }

  const user =
    (await User.findById(userId)) || (await Photographer.findById(userId));

  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const instance = new Razorpay({
    key_id: process.env.RAZOR_PAY_ID,
    key_secret: process.env.RAZOR_PAY_SECRET,
  });

  const result = await instance.orders.create({
    amount: Math.round(total * 100), // Convert amount to paise
    currency: "INR",
    receipt: `receipt_${userId}`,
    notes: {
      userId: user._id,
      key: process.env.RAZOR_PAY_ID,
    },
  });

  res.status(200).json({ result });
});

const calculateCartItemsPrice = async (
  items,
  couponCode,
  photographerId,
  isCustom = false,
  isCustomDiscount = false,
  deliveryPincode
) => {
  try {
    let totalFinalPrice = 0;
    let totalDeliveryCharge = 0;
    let totalPhotographerDiscount = 0;
    let rawCouponDiscount = 0;

    const frameIds = items
      ?.filter((item) => item.frameId)
      .map((item) => item.frameId);

    const paperIds = items
      ?.filter((item) => item.paperId)
      .map((item) => item.paperId);

    const frames = await Frame.find({ _id: { $in: frameIds } });
    const papers = await Paper.find({ _id: { $in: paperIds } });
    const layoutContent = await LayoutContent.findOne({});
    const coupon = await Coupon.findOne({ code: couponCode });

    const couponDiscountPercentage = coupon?.discountPercentage || 0;
    const maxDiscount = coupon?.maxDiscountAmount || 0;

    let subtotal = 0;

    for (let item of items) {
      const { imageId, paperId, frameId, width, height, resolution } = item;

      let imagePrice = 0;
      let paperPrice = 0;
      let framePrice = 0;
      let photographerDiscountAmount = 0;

      const image = await ImageVault.findById(imageId);

      if (!paperId && image && !isCustom) {
        imagePrice =
          resolution === "small"
            ? image.price.small
            : resolution === "medium"
            ? image.price.medium
            : image.price.original;

        rawCouponDiscount += imagePrice * (couponDiscountPercentage / 100);
        subtotal += imagePrice;
        totalFinalPrice += imagePrice;
      }

      if (paperId) {
        const paper = papers.find((p) => p._id.toString() === paperId);
        if (paper) {
          const customDimension = paper.customDimensions.find(
            (dim) => dim.width === width && dim.height === height
          );

          paperPrice = customDimension
            ? customDimension.price
            : width * height * paper.basePricePerSquareInch;

          if (photographerId) {
            photographerDiscountAmount =
              paperPrice * ((paper.photographerDiscount || 0) / 100);
            totalPhotographerDiscount += photographerDiscountAmount;
          }

          rawCouponDiscount +=
            (paperPrice - photographerDiscountAmount) *
            (couponDiscountPercentage / 100);

          if (frameId) {
            const frame = frames.find((f) => f._id.toString() === frameId);
            if (frame)
              framePrice = width * height * frame.basePricePerLinearInch;
          }

          if (layoutContent?.charges?.delivery) {
            const itemDeliveryCharge = await calculateDelhiveryCharge(
              width,
              height,
              !!frameId,
              deliveryPincode
            );

            totalDeliveryCharge += itemDeliveryCharge;
          }

          subtotal += paperPrice + framePrice;
          totalFinalPrice +=
            paperPrice + framePrice - photographerDiscountAmount;
        }
      }
    }

    const totalCouponDiscount = Math.min(rawCouponDiscount, maxDiscount);
    totalFinalPrice -= totalCouponDiscount;

    const orderValueBeforeGSTAndPlatform =
      subtotal - totalPhotographerDiscount - totalCouponDiscount;

    if (orderValueBeforeGSTAndPlatform >= 3000) {
      totalDeliveryCharge = 0;
    }

    totalFinalPrice += totalDeliveryCharge;

    const gstCharge = totalFinalPrice * 0.18;
    totalFinalPrice += gstCharge;

    if (layoutContent?.charges?.platform) {
      const platformFee = totalFinalPrice * 0.02;
      totalFinalPrice += platformFee;
    }

    return Number(totalFinalPrice.toFixed(2));
  } catch (error) {
    console.error(error);
    throw new Error("Server error.");
  }
};

const paymentHandler = asyncHandler(async (req, res) => {
  try {
    const {
      userId,
      items,
      couponCode,
      photographerId,
      isCustom = false,
      isCustomDiscount = false,
      deliveryPincode,
    } = req.body;

    if (!userId || !items || items.length === 0) {
      res
        .status(400)
        .json({ message: "Total amount and user ID are required." });
      return;
    }

    const user =
      (await User.findById(userId)) || (await Photographer.findById(userId));

    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }

    const total = await calculateCartItemsPrice(
      items,
      couponCode,
      photographerId,
      isCustom,
      isCustomDiscount,
      deliveryPincode
    );

    const instance = new Razorpay({
      key_id: process.env.RAZOR_PAY_ID,
      key_secret: process.env.RAZOR_PAY_SECRET,
    });

    const result = await instance.orders.create({
      amount: Math.round(total * 100), // Convert amount to paise
      currency: "INR",
      receipt: `receipt_${userId}`,
      notes: {
        userId: user._id,
        key: process.env.RAZOR_PAY_ID,
      },
    });

    return res.send({ result });
  } catch (e) {
    console.log(e);
    throw new Error("Server error");
  }
});

const getPendingOrders = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;

  const orders = await Order.find({ orderStatus: "pending" })
    .populate({
      path: "orderItems",
      populate: [
        {
          path: "imageInfo.image",
          populate: {
            path: "photographer",
          },
        },
        {
          path: "frameInfo.frame",
        },
        {
          path: "paperInfo.paper",
        },
        {
          path: "imageInfo.photographer",
        },
      ],
    })
    .populate("userInfo.user")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  if (!orders || orders.length === 0)
    return res.status(400).send({ message: "Order not found" });

  const totalDocuments = await Order.countDocuments({ orderStatus: "pending" });
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({ orders, pageCount });
});

// const calculateCartPrice = async (req, res) => {
//   try {
//     const {
//       items,
//       couponCode,
//       photographerId,
//       isCustom = false,
//       isCustomDiscount = false,
//     } = req.body;

//     let totalImagePrice = 0;
//     let totalPaperPrice = 0;
//     let totalFramePrice = 0;
//     let totalFinalPrice = 0;
//     let maxDeliveryCharge = 0;
//     let totalPhotographerDiscount = 0;

//     const frameIds = items
//       ?.filter((item) => item.frameId)
//       .map((item) => item.frameId);
//     const paperIds = items
//       ?.filter((item) => item.paperId)
//       .map((item) => item.paperId);

//     const frames = await Frame.find({ _id: { $in: frameIds } });
//     const papers = await Paper.find({ _id: { $in: paperIds } });

//     const content = await LayoutContent.findOne();

//     for (let item of items) {
//       const { imageId, paperId, frameId, width, height, resolution } = item;

//       const image = await ImageVault.findById(imageId);
//       if (!image && !isCustom) continue;

//       const ownImage =
//         photographerId &&
//         (isCustom || image.photographer?.toString() === photographerId);

//       const imagePrice = isCustom
//         ? 0
//         : resolution === "small"
//         ? image.price.small
//         : resolution === "medium"
//         ? image.price.medium
//         : image.price.original;

//       let paperPrice = 0;
//       let framePrice = 0;
//       let discount = 0;

//       if (paperId) {
//         const paper = papers.find((p) => p._id.toString() === paperId);
//         if (paper) {
//           const customDimension = paper.customDimensions.find(
//             (dim) => dim.width === width && dim.height === height
//           );
//           const photographerDiscount = paper?.photographerDiscount || 0;
//           discount = ownImage || isCustomDiscount ? photographerDiscount : 0;

//           if (customDimension) {
//             paperPrice = customDimension.price;
//           } else {
//             const area = width * height;
//             paperPrice = area * paper.basePricePerSquareInch;
//           }

//           if (content?.charges?.delivery) {
//             const itemDeliveryCharge = width * height * 1; // ₹1 per sq.in.
//             maxDeliveryCharge = Math.max(maxDeliveryCharge, itemDeliveryCharge);
//           }
//         }
//       }

//       if (frameId) {
//         const frame = frames.find((f) => f._id.toString() === frameId);
//         if (frame) {
//           const frameArea = width * height;
//           framePrice = frameArea * frame.basePricePerLinearInch;
//         }
//       }

//       totalImagePrice += imagePrice;
//       totalPaperPrice += paperPrice;
//       totalFramePrice += framePrice;

//       totalFinalPrice += paperPrice
//         ? (paperPrice + framePrice) * (1 - discount / 100)
//         : imagePrice + paperPrice + framePrice;

//       totalPhotographerDiscount += discount * (paperPrice + framePrice) * 0.01;
//     }

//     const coupon = await Coupon.findOne({  code: couponCode })
//     const couponDiscount = coupon.discount

//     res.json({
//       totalImagePrice,
//       totalPaperPrice,
//       totalFramePrice,
//       couponDiscount,
//       totalFinalPrice: Number(totalFinalPrice.toFixed(2)),
//       totalPhotographerDiscount: Number(totalPhotographerDiscount.toFixed(2)),
//       totalDeliveryCharge: maxDeliveryCharge,
//       platformFeeAllowed: !!content?.charges?.platform,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error." });
//   }
// };

// const calculateCartSecondPrice = async (req, res) => {
//   try {
//     const {
//       items,
//       couponCode,
//       photographerId,
//       isCustom = false,
//       isCustomDiscount = false,
//     } = req.body;

//     let totalImagePrice = 0;
//     let totalPaperPrice = 0;
//     let totalFramePrice = 0;
//     let totalFinalPrice = 0;
//     let maxDeliveryCharge = 0;
//     let totalPhotographerDiscount = 0;
//     let totalCouponDiscount = 0;

//     const frameIds = items
//       ?.filter((item) => item.frameId)
//       .map((item) => item.frameId);
//     const paperIds = items
//       ?.filter((item) => item.paperId)
//       .map((item) => item.paperId);

//     const frames = await Frame.find({ _id: { $in: frameIds } });
//     const papers = await Paper.find({ _id: { $in: paperIds } });

//     const content = await LayoutContent.findOne();

//     const coupon = await Coupon.findOne({  code: couponCode })
//     let couponDiscount
//     let maxDiscount
//     let couponDiscountPercentage
//     if(coupon) {
//         couponDiscountPercentage = coupon.discountPercentage
//         maxDiscount = coupon.maxDiscountAmount
//     }

//     for (let item of items) {
//       const { imageId, paperId, frameId, width, height, resolution } = item;

//       const image = await ImageVault.findById(imageId);
//       if (!image && !isCustom) continue;

//       // const ownImage =
//       //   photographerId &&
//       //   (isCustom || image.photographer?.toString() === photographerId);

//       const ownImage = paperId || imageId ? true : false

//       const imagePrice = isCustom
//         ? 0
//         : resolution === "small"
//         ? image.price.small
//         : resolution === "medium"
//         ? image.price.medium
//         : image.price.original;

//       let paperPrice = 0;
//       let framePrice = 0;
//       let discount = 0;

//       if (paperId) {
//         const paper = papers.find((p) => p._id.toString() === paperId);
//         if (paper) {
//           const customDimension = paper.customDimensions.find(
//             (dim) => dim.width === width && dim.height === height
//           );
//           const photographerDiscount = paper?.photographerDiscount || 0;
//           discount = ownImage || isCustomDiscount ? photographerDiscount : 0;

//           if (customDimension) {
//             paperPrice = customDimension.price;
//           } else {
//             const area = width * height;
//             paperPrice = area * paper.basePricePerSquareInch;
//           }

//           if (content?.charges?.delivery) {
//             const itemDeliveryCharge = width * height * 1; // ₹1 per sq.in.
//             maxDeliveryCharge = Math.max(maxDeliveryCharge, itemDeliveryCharge);
//           }
//         }
//       }

//       if (frameId) {
//         const frame = frames.find((f) => f._id.toString() === frameId);
//         if (frame) {
//           const frameArea = width * height;
//           framePrice = frameArea * frame.basePricePerLinearInch;
//         }
//       }

//       if(imagePrice && !paperPrice) {
//         const discountForThisImage = imagePrice * (couponDiscountPercentage / 100);
//         totalCouponDiscount += Math.min(discountForThisImage, maxDiscount || discountForThisImage);
//         imagePrice -= discountForThisImage;
//       }

//       if (paperPrice > 0) {
//         if(photographerId) {
//           const photographerDiscountAmount = discount * (paperPrice + framePrice) * 0.01;
//           totalPhotographerDiscount += photographerDiscountAmount;
//           paperPrice -= photographerDiscountAmount;
//         }
//         const discountForThisPaper = paperPrice * (couponDiscountPercentage / 100);
//         totalCouponDiscount += Math.min(discountForThisPaper, maxDiscount || discountForThisPaper);
//         paperPrice -= discountForThisPaper
//       }

//       totalImagePrice += imagePrice;
//       totalPaperPrice += paperPrice;
//       totalFramePrice += framePrice;

//       totalFinalPrice += paperPrice
//         ? (paperPrice + framePrice) * (1 - discount / 100)
//         : imagePrice + paperPrice + framePrice;

//     }

//     const layoutContent = await LayoutContent.findOne({  })
//     let gstCharge = totalFinalPrice * (18/100)
//     totalFinalPrice = gstCharge + totalFinalPrice

//     const { platform } = layoutContent.charges

//     if(platform) {
//       let platformFess = totalFinalPrice * 0.02
//       totalFinalPrice = totalFinalPrice + platformFess
//     }

//     // const result =  await paymentHandler(totalFinalPrice, userId)

//     // if(!result) {
//     //   return res.status(400).send({ message: "UserId is required" })
//     // }

//     res.json({
//       totalImagePrice,
//       totalPaperPrice,
//       totalFramePrice,
//       couponDiscount: totalCouponDiscount,
//       totalFinalPrice: Number(totalFinalPrice.toFixed(2)),
//       totalPhotographerDiscount: Number(totalPhotographerDiscount.toFixed(2)),
//       totalDeliveryCharge: maxDeliveryCharge,
//       platformFeeAllowed: !!content?.charges?.platform,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error." });
//   }
// };

const inchToCm = 2.54;

async function calculateDelhiveryCharge(width, height, hasFrame, d_pin) {
  let length_cm, height_cm, depth_cm;

  if (hasFrame) {
    length_cm = (width + 4) * inchToCm;
    height_cm = (height + 4) * inchToCm;
    depth_cm = 8; // cm fixed for framed print
  } else {
    const biggestSide = Math.max(width, height);
    length_cm = (biggestSide + 4) * inchToCm;
    height_cm = 10; // roll diameter increased to 10cm
    depth_cm = 10;
  }

  const volumetricWeight = (length_cm * height_cm * depth_cm) / 5000; // kg
  const cgm = Math.ceil(volumetricWeight * 1000); // grams

  const apiUrl = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=S&ss=Delivered&d_pin=${d_pin}&o_pin=226028&cgm=${cgm}&pt=Pre-paid`;

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Token ${process.env.DEHLIVERYONE_LIVE_TOKEN}`,
      },
    });

    return response.data?.[0]?.total_amount || 0;
  } catch (err) {
    console.log("Delhivery error:", err?.response?.data || err);
    return 0;
  }
}

const calculateCartPrice = async (req, res) => {
  try {
    const {
      items,
      couponCode,
      photographerId,
      isCustom = false,
      isCustomDiscount = false,
      deliveryPincode,
    } = req.body;

    let totalImagePrice = 0;
    let totalPaperPrice = 0;
    let totalFramePrice = 0;
    let subtotal = 0;
    let totalFinalPrice = 0;

    let totalDeliveryCharge = 0; // SUM OF ALL ITEM DELIVERY CHARGES
    let totalPhotographerDiscount = 0;
    let rawCouponDiscount = 0;
    let totalPlatformFee = 0;

    const frameIds = items
      ?.filter((item) => item.frameId)
      .map((item) => item.frameId);

    const paperIds = items
      ?.filter((item) => item.paperId)
      .map((item) => item.paperId);

    const frames = await Frame.find({ _id: { $in: frameIds } });
    const papers = await Paper.find({ _id: { $in: paperIds } });
    const layoutContent = await LayoutContent.findOne({});
    const coupon = await Coupon.findOne({ code: couponCode });

    const couponDiscountPercentage = coupon?.discountPercentage || 0;
    const maxDiscount = coupon?.maxDiscountAmount || 0;

    for (let item of items) {
      const { imageId, paperId, frameId, width, height, resolution } = item;

      let imagePrice = 0;
      let paperPrice = 0;
      let framePrice = 0;
      let photographerDiscount = 0;

      const image = await ImageVault.findById(imageId);

      // 📌 PAPER BASED ORDER
      if (paperId) {
        const paper = papers.find((p) => p._id.toString() === paperId);

        if (paper) {
          const customDimension = paper.customDimensions.find(
            (dim) => dim.width === width && dim.height === height
          );

          paperPrice = customDimension
            ? customDimension.price
            : width * height * paper.basePricePerSquareInch;

          // Photographer discount
          if (photographerId) {
            photographerDiscount =
              paperPrice * ((paper.photographerDiscount || 0) / 100);
            totalPhotographerDiscount += photographerDiscount;
          }

          // Raw coupon discount (before max cap)
          rawCouponDiscount +=
            (paperPrice - photographerDiscount) *
            (couponDiscountPercentage / 100);

          // Frame price
          if (frameId) {
            const frame = frames.find((f) => f._id.toString() === frameId);
            if (frame) {
              framePrice = width * height * frame.basePricePerLinearInch;
            }
          }

          // 📦 SHIPPING (calculated per-item)
          if (layoutContent?.charges?.delivery) {
            const itemDeliveryCharge = await calculateDelhiveryCharge(
              width,
              height,
              !!frameId,
              deliveryPincode
            );

            totalDeliveryCharge += itemDeliveryCharge; // sum (NOT max)
          }

          totalPaperPrice += paperPrice;
          totalFramePrice += framePrice;
          subtotal += paperPrice + framePrice;
          totalFinalPrice += paperPrice + framePrice - photographerDiscount;
        }
      }

      // 📌 IMAGE ONLY ORDER
      else if (image && !isCustom) {
        imagePrice =
          resolution === "small"
            ? image.price.small
            : resolution === "medium"
            ? image.price.medium
            : image.price.original;

        rawCouponDiscount += imagePrice * (couponDiscountPercentage / 100);

        totalImagePrice += imagePrice;
        subtotal += imagePrice;
        totalFinalPrice += imagePrice;
      }
    }

    // ------------------------------------------
    // 🎟 FINAL COUPON DISCOUNT (APPLIED ONCE)
    // ------------------------------------------
    const totalCouponDiscount = Math.min(rawCouponDiscount, maxDiscount);
    totalFinalPrice -= totalCouponDiscount;

    // ------------------------------------------
    // 🚚 FREE DELIVERY RULE — ABOVE ₹3000
    // ------------------------------------------
    const orderValueBeforeGSTAndPlatform =
      subtotal - totalPhotographerDiscount - totalCouponDiscount;

    if (orderValueBeforeGSTAndPlatform >= 3000) {
      totalDeliveryCharge = 0; // FREE DELIVERY
    }

    // ADD DELIVERY
    totalFinalPrice += totalDeliveryCharge;

    // GST 18%
    const gstCharge = totalFinalPrice * 0.18;
    totalFinalPrice += gstCharge;

    // Platform fee 2%
    if (layoutContent?.charges?.platform) {
      totalPlatformFee = totalFinalPrice * 0.02;
      totalFinalPrice += totalPlatformFee;
    }

    res.json({
      subtotal: Number(subtotal.toFixed(2)),
      totalImagePrice: Number(totalImagePrice.toFixed(2)),
      totalPaperPrice: Number(totalPaperPrice.toFixed(2)),
      totalFramePrice: Number(totalFramePrice.toFixed(2)),
      totalPhotographerDiscount: Number(totalPhotographerDiscount.toFixed(2)),
      totalCouponDiscount: Number(totalCouponDiscount.toFixed(2)),
      totalDeliveryCharge: Number(totalDeliveryCharge.toFixed(2)),
      gstCharge: Number(gstCharge.toFixed(2)),
      totalFinalPrice: Number(totalFinalPrice.toFixed(2)),
      totalPlatformFee: Number(totalPlatformFee.toFixed(2)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};

const updatePrintStatus = asyncHandler(async (req, res) => {
  const { orderId, printStatus } = req.body;

  const order = await Order.findOne({ _id: orderId });

  order.printStatus = printStatus;

  await order.save();

  await sendNotificationToUser({
    userId: order.userInfo.user,
    userType: order.userInfo.userType,
    title: "Print Status Updated",
    body: `Your order is now: ${
      printStatus?.slice(0, 1).toUpperCase() + printStatus?.slice(1)
    }`,
    type: "order",
    data: {
      url: `${
        order.userInfo.userType === "User" ? "clickedart" : "clickedartartist"
      }://${printStatus === "no-print" ? "digitalorder" : "printorder"}/${
        order._id
      }`,
    },
  });

  res.status(200).send({ message: "Print Status updated successfully" });
});

const updateReadyToShipStatus = asyncHandler(async (req, res) => {
  const { orderId, status = false } = req.body;

  if (!orderId) {
    return res.status(400).send({ message: "Order Id not found" });
  }
  let readyToShipTimeStamp;
  if (status === true) {
    readyToShipTimeStamp = new Date();
  }

  await Order.findOneAndUpdate(
    { _id: orderId },
    { readyToShip: status, readyToShipTimeStamp }
  );

  res
    .status(200)
    .send({ message: "Ready To Ship Status Updated Successfully" });
});

module.exports = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrdersByPhotographer,
  getOrderByStatus,
  updateOrderStatus,
  getOrderById,
  payment,
  getPendingOrders,
  calculateCartPrice,
  updatePrintStatus,
  deleteOrder,
  getFailedOrders,
  updateReadyToShipStatus,
  paymentHandler,
};
