const User = require("../models/userModel.js");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const { generateFromEmail } = require("unique-username-generator");
const Photographer = require("../models/photographerModel.js");
const UserType = require("../models/typeModel.js");
const {
  sendResetEmail,
  sendVerificationEmail,
} = require("../middleware/handleEmail.js");
const { sendOtpSms } = require("../middleware/sendOtpSms.js");
const { differenceInYears, parseISO, isValid } = require("date-fns");
const Referral = require("../models/referralModel.js");

const userRegistration = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    mobile,
    whatsapp,
    shippingAddress,
    dob,
    image,
    interests,
    connectedAccounts,
    isMarried,
    anniversary,
    referralcode,
  } = req.body;

  // Email check
  const emailExist = await User.findOne({ email });
  if (emailExist) {
    return res
      .status(409)
      .send({ message: "Email already exist. Please use a different email" });
  }

  // Number check
  const mobileExist = await User.findOne({ mobile });
  if (mobileExist) {
    return res.status(409).send({
      message: "Mobile number already exist. Please use a different number",
    });
  }

  // Calculate age
  let age;
  if (dob) {
    const birthDate = parseISO(dob);
    if (isValid(birthDate)) {
      age = differenceInYears(new Date(), birthDate);
    } else {
      return res
        .status(400)
        .send({ status: false, message: "Invalid date of birth" });
    }
  }

  // Referral code validation
  if (referralcode) {
    const now = Date.now();
    const referral = await Referral.findOne({
      code: referralcode,
      status: "active",
      expirationDate: { $gt: now },
    }).populate("photographer");
    if (!referral) {
      return res.status(400).send({ message: "Referral Code is not valid" });
    }
  }

  if (firstName && email && password) {
    let user = new User({
      firstName,
      lastName,
      email,
      password,
      mobile,
      whatsapp,
      shippingAddress,
      age,
      dob,
      username,
      image,
      interests,
      connectedAccounts,
      isMarried,
      anniversary,
      referralcode,
    });

    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log(otp);

    let emailSent = false;
    let smsSent = false;
    let notificationErrors = [];

    try {
      await sendVerificationEmail(otp, email);
      emailSent = true;
    } catch (error) {
      notificationErrors.push("Email failed: " + error.message);
    }

    try {
      await sendOtpSms(mobile, otp);
      smsSent = true;
    } catch (error) {
      notificationErrors.push("SMS failed: " + error.message);
    }

    if (!emailSent && !smsSent) {
      return res.status(500).send({
        status: false,
        message: "Failed to send OTP via email and SMS. Registration aborted.",
        errors: notificationErrors,
      });
    }

    user.otp = otp.toString();
    await user.save();

    await UserType.create({
      user: user._id,
      username: user.username,
      type: user.type,
    });

    return res.status(201).json({
      status: true,
      message: `Verification OTP sent via ${
        emailSent && smsSent ? "email and SMS" : emailSent ? "email" : "SMS"
      }. Please verify your email for login.`,
      errors: notificationErrors.length ? notificationErrors : undefined,
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        username: user.username,
      },
    });
  } else {
    return res
      .status(400)
      .send({ status: false, message: "All Fields are required" });
  }
});

const userLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    let user = await User.findOne({ email });
    if (user && (await user.isPasswordCorrect(password)) && user.isActive) {
      if (user.deleted === true) {
        throw new Error("user deleted");
      }
      user.password = undefined;
      const token = await user.generateAccessToken();
      res.json({
        status: true,
        user,
        token,
      });
    } else {
      res.status(400);
      throw new Error("Invalid credentials");
    }
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).send({ status: true, message: "Email not Found" });
  }
  const existedUser = await User.findOne({ email: email.toLowerCase() });
  if (!existedUser) {
    return res.status(400).send({ status: false, message: "Email not exist" });
  }

  const randomPassword = await sendResetEmail(existedUser.email);

  existedUser.password = randomPassword;
  console.log("randomPassword", randomPassword);
  console.log(existedUser);
  await existedUser.save();
  res.status(200).send({
    status: true,
    message: "OTP sent to your email. Please check for passwrod reset",
  });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;

  const users = await User.find({ isActive: true })
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  if (!users || users.length === 0) {
    return res.status(400).send({ message: "Users not found" });
  }

  const totalDocuments = await User.countDocuments({ isActive: true });
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({ users, pageCount });
});

const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.query;

  const user = await User.findOne({ _id: userId });

  if (!user) return res.status(400).send({ message: "User not found" });

  res.status(200).send({ user });
});

const userProfileUpdate = asyncHandler(async (req, res) => {
  const {
    userId,
    firstName,
    lastName,
    email,
    oldPassword,
    password,
    mobile,
    whatsapp,
    shippingAddress,
    dob,
    image,
    interests,
    connectedAccounts,
    isMarried,
    anniversary,
  } = req.body;
  const user = await User.findOne({ _id: userId });
  if (!user) {
    return res.status(400).send({ message: "User not found" });
  }
  user.firstName = firstName || user.firstName;
  user.lastName = lastName || user.lastName;

  if (password && oldPassword) {
    const isMatch = await user.isPasswordCorrect(oldPassword);
    if (!isMatch) throw new Error("Password not matched");
    user.password = password;
  }
  user.shippingAddress = shippingAddress || user.shippingAddress;
  user.mobile = mobile || user.mobile;
  user.whatsapp = whatsapp || user.whatsapp;
  user.isMarried = isMarried;
  user.anniversary = anniversary || user.anniversary;

  if (email && email !== user.email) {
    const emailExist = await User.findOne({ email });
    if (emailExist) {
      return res.status(400).send({ message: "Email already exist" });
    }
    user.email = email;
  }
  if (dob) {
    let age;
    if (dob) {
      const birthDate = parseISO(dob);
      if (isValid(birthDate)) {
        age = differenceInYears(new Date(), birthDate);
      } else {
        return res
          .status(400)
          .send({ status: false, message: "Invalid date of birth" });
      }
    }
    user.dob = dob;
    user.age = age;
  }

  user.image = image ?? user.image;
  user.interests = interests || user.interests;
  user.connectedAccounts = connectedAccounts || user.connectedAccounts;

  await user.save();

  res.status(200).send({ message: "User updated successfully", user });
});

const convertUserToPhotographer = asyncHandler(async (req, res) => {
  const {
    userId,
    isCompany,
    companyName,
    companyEmail,
    companyAddress,
    companyPhone,
    portfolioLink,
    photographyStyles,
    yearsOfExperience,
    accountType,
  } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }
  if (user.photographer) {
    throw new Error("User is already a photographer");
  }

  const photographerData = {
    name: user.name,
    email: user.email,
    address: user.address,
    password: user.password,
    companyName: !companyName ? user.name : companyName,
    portfolioLink,
    photographyStyles,
    yearsOfExperience,
    accountType,
  };

  if (isCompany) {
    if (!companyName || !companyEmail || !companyPhone || !companyAddress) {
      throw new Error(
        "Company details are required! Otherwise Please register as individual photographer"
      );
    } else {
      photographerData.isCompany = isCompany;
      (photographerData.companyEmail = companyEmail),
        (photographerData.companyAddress = companyAddress);
      photographerData.companyPhone = companyPhone;
    }
  }
  const photographer = new Photographer(photographerData);
  photographer.user = user._id;
  await photographer.save();

  // user.photographer = photographer
  // await user.save() if admin don't approve then we will do that logic here as of now admin is doing that
  res.status(200).json({
    status: true,
    message: "You need to wait till admin approves you as a Photographer",
  });
});

const deleteUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  const user = await User.findOne({ _id: userId });
  if (!user) {
    return res.status(400).send({ message: "user not exist" });
  }

  await User.findOneAndDelete({ _id: userId });
  res.status(200).send({ message: "User deleted successfully" });
});

const verifyUserProfile = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).send({ message: "User not found" });

  if (user.otp !== otp)
    return res.status(400).send({ message: "OTP not valid" });
  user.isActive = true;
  user.otp = "";
  await user.save();
  const token = await user.generateAccessToken();
  res.status(200).send({ message: "User verified successfully", user, token });
});

const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).send({ message: "User not found" });

  const mobile = user.mobile;
  const otp = Math.floor(100000 + Math.random() * 900000);

  let emailSent = false;
  let smsSent = false;
  let errors = [];

  try {
    await sendVerificationEmail(otp, email);
    emailSent = true;
  } catch (error) {
    errors.push("Email failed: " + error.message);
  }

  try {
    await sendOtpSms(mobile, otp);
    smsSent = true;
  } catch (error) {
    errors.push("SMS failed: " + error.message);
  }

  if (emailSent || smsSent) {
    user.otp = otp.toString();
    await user.save();

    return res.status(200).send({
      message: `OTP resent via ${
        emailSent && smsSent ? "email and SMS" : emailSent ? "email" : "SMS"
      }`,
      errors: errors.length ? errors : undefined,
      photographer: user,
    });
  } else {
    return res.status(500).send({
      message: "Failed to resend OTP via both email and SMS.",
      errors,
    });
  }
});

const getUserByUserName = asyncHandler(async (req, res) => {
  const { username } = req.query;

  const user = await User.findOne({ username });

  if (!user) return res.status(400).send({ message: "User not found" });

  res.status(200).send({ user });
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const { photographerId, coverImage } = req.query;

  const user = await User.findOneAndUpdate(
    {
      _id: photographerId,
    },
    {
      $set: { coverImage },
    },
    {
      new: true,
    }
  );

  if (!user) {
    return res.status(400).send({ message: "User not found to update" });
  }

  res.status(200).send({ message: "User Cover Image Updated" });
});

const checkUserNameExist = asyncHandler(async (req, res) => {
  const { username, email } = req.body;

  const user = await User.findOne({ username });
  const exists = user ? true : false;

  // if(user) {
  //     return res.status(400).send({ exists: true })
  // }

  const emailExists = await User.findOne({ email: email });

  if (emailExists) {
    const isVerified = emailExists.isActive ? true : false;
    return res.send({ emailExists: true, isVerified, exists });
  }

  res.status(200).send({ exists: false, emailExists: false });
});

const changePassword = asyncHandler(async (req, res) => {
  const { userId, newPassword, oldPassword } = req.body;

  const user = await User.findOne({ _id: userId });

  if (!user) {
    return res.status(400).send({ message: "User not found" });
  }

  if (!newPassword || !oldPassword) {
    throw new Error("Password Field is required");
  }

  if (newPassword && oldPassword) {
    const isMatch = await user.isPasswordCorrect(oldPassword);
    if (!isMatch) throw new Error("Password not matched");
    user.password = newPassword;
  }

  await user.save();

  res.status(200).send({ user });
});

const getUserAnalytics = asyncHandler(async (req, res) => {
  const { user } = req.query;

  const digitalOrderCount = await Order.countDocuments({
    "userInfo.user": user,
    orderStatus: "completed",
    printStatus: { $in: ["no-print"] },
  });

  const printOrderCount = await Order.countDocuments({
    "userInfo.user": user,
    orderStatus: "completed",
    printStatus: {
      $in: ["processing", "printing", "packed", "shipped", "delivered"],
    },
  });

  const deliveredPrintCount = await Order.countDocuments({
    "userInfo.user": user,
    orderStatus: "completed",
    printStatus: { $in: ["delivered"] },
  });

  const pendingPrintCount = await Order.countDocuments({
    "userInfo.user": user,
    orderStatus: "completed",
    printStatus: { $in: ["processing", "printing", "packed", "shipped"] },
  });

  res.status(200).send({
    digitalOrderCount,
    printOrderCount,
    deliveredPrintCount,
    pendingPrintCount,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.query;

  const user = await User.findOneAndUpdate({ _id: userId }, { deleted: true });
  if (!user) {
    return res.status(400).send({ message: "User not found" });
  }
  res.send({ message: "User Deleted Successfully" });
});

module.exports = {
  userRegistration,
  userLogin,
  resetPassword,
  convertUserToPhotographer,
  getAllUsers,
  getUserById,
  userProfileUpdate,
  deleteUserProfile,
  verifyUserProfile,
  resendOTP,
  getUserByUserName,
  updateCoverImage,
  checkUserNameExist,
  changePassword,
  getUserAnalytics,
  deleteUser,
};
