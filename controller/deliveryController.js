const asyncHandler = require('express-async-handler')
const Order = require('../models/orderModel.js')
const axios = require('axios')

// const checkPincodeAvailablity = asyncHandler(async (req, res) => {
//     try {
//       const { pincode } = req.query;
//       const token = process.env.DEHLIVERYONE_LIVE_TOKEN;
//       console.log(token)
//       if (!token) {
//         return res.status(500).send({ error: 'Authorization token is missing' });
//       }
  
//       const result = await axios.get('https://track.delhivery.com/c/api/pin-codes/json/', {
//         params: {
//           filter_codes: pincode
//         },
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Token ${token}`
//         }
//       });
  
//       res.status(200).send({ result: result.data });
//     } catch (error) {
//       const status = error.response ? error.response.status : 500;
//       const message = error.response ? error.response.data : error.message;
//       res.status(status).send({ error: message });
//     }
// });
const checkPincodeAvailablity = asyncHandler(async (req, res) => {
  try {
    const { pincode } = req.query;
    const token = process.env.DEHLIVERYONE_LIVE_TOKEN;

    if (!token) {
      return res.status(500).send({ error: 'Authorization token is missing' });
    }

    const result = await axios.get('https://staging-express.delhivery.com/c/api/pin-codes/json', {
      params: { filter_codes: pincode },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
    });


    const deliveryData = result.data?.delivery_codes?.[0]?.postal_code;

    if (
      deliveryData &&
      deliveryData.is_oda === "N" &&  
      deliveryData.center?.length > 0 
    ) {
      return res.status(200).send({ available: true, deliveryData });
    } else {
      return res.status(200).send({ available: false, deliveryData });
    }
  } catch (error) {
    const status = error.response ? error.response.status : 500;
    const message = error.response ? error.response.data : error.message;
    res.status(status).send({ error: message });
  }
});






const fetch = require('node-fetch');


const createShipment = async (req, res) => {
  const token = process.env.DEHLIVERYONE_LIVE_TOKEN;
  console.log(token)
  const shipments = [
    {
      name: 'Johnny Doe',
      add: 'Kaushal Puri Colony, Gomti Nagar, Lucknow',
      pin: '226010',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      country: 'India',
      phone: '647631335322',
      order: 'ORDER128',
      payment_mode: 'Prepaid',
      return_pin: '',
      return_city: '',
      return_phone: '',
      return_add: '',
      return_state: '',
      return_country: '',
      products_desc: '',
      hsn_code: '',
      cod_amount: '',
      order_date: null,
      total_amount: '',
      seller_add: '',
      seller_name: '',
      seller_inv: '',
      quantity: '',
      waybill: '',
      shipment_width: '20',
      shipment_height: '10',
      weight: '',  
      seller_gst_tin: '',
      shipping_mode: 'Surface',
      address_type: ''
    }
  ]
  const pickup_location = {
    name: 'ClickedArt Warehouse',
    add: 'COLONY NO-3,SECTOR NO-D ARAJI NO -178 PLOT NO-35 PLOT NO-35 KANPUR NAGAR MIRZAPUR KALYANPUR',
    city: 'Lucknow',
    pin_code: '226010',
    country: 'India',
    phone: '7054001058'
  }

  const jsonData = JSON.stringify(shipments);
  const jsonData2 = JSON.stringify(pickup_location)
  try {
    const response = await axios.post(
      'https://track.delhivery.com/api/cmu/create.json',
      {
        format: 'json',
        data: {
          jsonData,
          jsonData2
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${token}`
        }
      }
    );

    console.log(response.data);  
    
    res.status(200).send({ result: response.data })
  } catch (error) {
    console.error('Error while creating shipment:', error.response ? error.response.data : error.message);
  }
};
// UPL5373011205408637425
// ORDER1285
// const registerDelivery = asyncHandler(async (req, res) => {
//   const token = process.env.DEHLIVERYONE_LIVE_TOKEN;
//   const data = new URLSearchParams();
//   data.append('format', 'json');
//   data.append('data', JSON.stringify({
//     shipments: [
//       {
//         name: 'Johnny Doe',
//         add: 'Kaushal Puri Colony, Gomti Nagar, Lucknow',
//         pin: '226010',
//         city: 'Lucknow',
//         state: 'Uttar Pradesh',
//         country: 'India',
//         phone: '647631335322',
//         order: 'ORDER12485',
//         payment_mode: 'Prepaid',
//         return_pin: '',
//         return_city: '',
//         return_phone: '',
//         return_add: '',
//         return_state: '',
//         return_country: '',
//         products_desc: '',
//         hsn_code: '',
//         cod_amount: '',
//         order_date: null,
//         total_amount: '',
//         seller_add: '',
//         seller_name: '',
//         seller_inv: '',
//         quantity: '',
//         waybill: '',
//         shipment_width: '20',
//         shipment_height: '10',
//         weight: '',  
//         seller_gst_tin: '',
//         shipping_mode: 'Surface',
//         address_type: '',
//       }
//     ],
//     pickup_location: {
//       name: 'FORTENETSKILLS SURFACE',
//       add: 'COLONY NO-3,SECTOR NO-D ARAJI NO -178 PLOT NO-35 PLOT NO-35 KANPUR NAGAR MIRZAPUR KALYANPUR',
//       city: 'Lucknow',
//       pin_code: 226010,
//       country: 'India',
//       phone: '7054001058'
//     }
//   }));
  
  
//   const config = {
//     method: 'post',
//     url: 'https://staging-express.delhivery.com/api/cmu/create.json', 
//     headers: {
//       'Content-Type': 'application/json',
//        Authorization: `Token ${token}`, 
//     },
//     data: data,
//   };
  
//   axios(config).then((response) => {
//     console.log('Response:', response.data);
//     return res.status(200).send({ result: response.data })
//   })
//   .catch((error) => {
//     console.error('Error:', error.response ? error.response.data : error.message);
//     res.status(400).send({ error })
//   });
// })


const registerDelivery = asyncHandler(async (req, res) => {
  const token = process.env.DEHLIVERYONE_LIVE_TOKEN;

  const formData = new URLSearchParams();
  formData.append('format', 'json'); 
  formData.append(
    'data',
    JSON.stringify({
      shipments: [
        {
          name: 'Harshit Srivastava',
          add: 'P-80, Kaushal Puri Colony, Gomti Nagar, Lucknow',
          pin: '226010',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          country: 'India',
          phone: '09455251394',
          order: '1234564217',
          payment_mode: 'Prepaid',
          return_pin: '',
          return_city: '',
          return_phone: '',
          return_add: '',
          return_state: '',
          return_country: '',
          products_desc: '',
          hsn_code: '',
          cod_amount: '',
          order_date: null,
          total_amount: '',
          seller_add: '',
          seller_name: '',
          seller_inv: '',
          quantity: '',
          waybill: '',
          shipment_width: '20',
          shipment_height: '20',
          weight: '',
          seller_gst_tin: '',
          shipping_mode: 'Surface',
          address_type: '',
        },
        {
          name: 'Harshit Srivastava',
          add: 'P-80, Kaushal Puri Colony, Gomti Nagar, Lucknow',
          pin: '226010',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          country: 'India',
          phone: '09455251394',
          order: '1234564437',
          payment_mode: 'Prepaid',
          return_pin: '',
          return_city: '',
          return_phone: '',
          return_add: '',
          return_state: '',
          return_country: '',
          products_desc: '',
          hsn_code: '',
          cod_amount: '',
          order_date: null,
          total_amount: '',
          seller_add: '',
          seller_name: '',
          seller_inv: '',
          quantity: '',
          waybill: '',
          shipment_width: '20',
          shipment_height: '20',
          weight: '',
          seller_gst_tin: '',
          shipping_mode: 'Surface',
          address_type: '',
        },
      ],
      pickup_location: {
        name: 'FORTENETSKILLS SURFACE',
        add: 'COLONY NO-3,SECTOR NO-D ARAJI NO -178 PLOT NO-35 PLOT NO-35 KANPUR NAGAR MIRZAPUR KALYANPUR',
        city: 'Lucknow',
        pin_code: 226010,
        country: 'India',
        phone: '7054001058',
      },
    })
  );

  const config = {
    method: 'post',
    url: 'https://staging-express.delhivery.com/api/cmu/create.json',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded', 
      Authorization: `Token ${token}`,
    },
    data: formData,
  };

  axios(config)
    .then((response) => {
      console.log('Response:', response.data);
      return res.status(200).send({ result: response.data });
    })
    .catch((error) => {
      console.error('Error:', error.response ? error.response.data : error.message);
      res.status(400).send({ error });
    });
});


const registerDeliveryFromOrder = asyncHandler(async (order) => {
  const token = process.env.DEHLIVERYONE_LIVE_TOKEN;
  console.log(order.userInfo.user)
  const formData = new URLSearchParams();
  formData.append('format', 'json'); 
  formData.append(
    'data',
    JSON.stringify({
      shipments: [
        {
          name: `${order.userInfo.user.firstName} ${order.userInfo.user.lastName}`,
          add: `${order.shippingAddress.address}`,
          pin: `${order.shippingAddress.pincode}`,
          city: `${order.shippingAddress.city}`,
          state: `${order.shippingAddress.state}`,
          country: `${order.shippingAddress.country}`,
          phone: `${order.userInfo.user.mobile}`,
          order: `${order._id}`,
          payment_mode: 'Prepaid',
          return_pin: '',
          return_city: '',
          return_phone: '',
          return_add: '',
          return_state: '',
          return_country: '',
          products_desc: '',
          hsn_code: '',
          cod_amount: '',
          order_date: null,
          total_amount: '',
          seller_add: '',
          seller_name: '',
          seller_inv: '',
          quantity: '',
          waybill: '',
          shipment_width: '20',
          shipment_height: '20',
          weight: '',
          seller_gst_tin: '',
          shipping_mode: 'Surface',
          address_type: '',
        },
      ],
      pickup_location: {
        name: 'FORTENETSKILLS SURFACE',
        add: 'COLONY NO-3,SECTOR NO-D ARAJI NO -178 PLOT NO-35 PLOT NO-35 KANPUR NAGAR MIRZAPUR KALYANPUR',
        city: 'Lucknow',
        pin_code: 226010,
        country: 'India',
        phone: '7054001058',
      },
    })
  );

  const config = {
    method: 'post',
    url: 'https://staging-express.delhivery.com/api/cmu/create.json',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Token ${token}`,
    },
    data: formData,
  };

  axios(config)
    .then(async (response) => {
      console.log('Response:', response.data);
      const waybill = response.data.packages.length > 0 ? response.data.packages[0].waybill : null;
      console.log("Waybill:", waybill);
      await Order.findOneAndUpdate({ _id: order._id }, { waybill })
      return waybill
    })
    .catch((error) => {
      console.error('Error:', error.response ? error.response.data : error.message);
      return null
    });
});

const getPackageDetails = asyncHandler(async (req, res) => {
  try {
   
    const waybill = req.query.waybill || ""
    const refIds = req.query.orderId || ""
   
    const token = process.env.DEHLIVERYONE_LIVE_TOKEN; 

    const url = `https://staging-express.delhivery.com/api/v1/packages/json/?waybill=${waybill}&ref_ids=${refIds}`;

    const config = {
      method: 'get',
      url: url,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
    };

    const response = await axios(config);
    return res.status(200).json(response.data);

  } catch (error) {
    console.error('Error fetching package details:', error.response ? error.response.data : error.message);
    res.status(400).json({ error: error.response ? error.response.data : error.message });
  }
});


const registerDeliveryManually = asyncHandler(async (req, res) => {
  const token = process.env.DEHLIVERYONE_LIVE_TOKEN;
  
  const { orderId } = req.body
  const order = await Order.findOne({ _id: orderId }).populate('userInfo.user')
  if(!order) {
    return res.status(400).send({ message: 'Order not found' })
  }

  if(order.printStatus === 'no-print') {
    return rs.status(400).send({  message: 'This is a digital Order. No Need to generate waybill' })
  }

  if(order.waybill) {
    return res.status(400).send({ message: 'Waybill already exist. Please use this to track your current order' })
  }

 
  const formData = new URLSearchParams();
  formData.append('format', 'json'); 
  formData.append(
    'data',
    JSON.stringify({
      shipments: [
        {
          name: `${order.userInfo.user.firstName} ${order.userInfo.user.lastName}`,
          add: `${order.shippingAddress.address}`,
          pin: `${order.shippingAddress.pincode}`,
          city: `${order.shippingAddress.city}`,
          state: `${order.shippingAddress.state}`,
          country: `${order.shippingAddress.country}`,
          phone: `${order.userInfo.user.mobile}`,
          order: `${order._id}`,
          payment_mode: 'Prepaid',
          return_pin: '',
          return_city: '',
          return_phone: '',
          return_add: '',
          return_state: '',
          return_country: '',
          products_desc: '',
          hsn_code: '',
          cod_amount: '',
          order_date: null,
          total_amount: '',
          seller_add: '',
          seller_name: '',
          seller_inv: '',
          quantity: '',
          waybill: '',
          shipment_width: '20',
          shipment_height: '20',
          weight: '',
          seller_gst_tin: '',
          shipping_mode: 'Surface',
          address_type: '',
        },
      ],
      pickup_location: {
        name: 'FORTENETSKILLS SURFACE',
        add: 'COLONY NO-3,SECTOR NO-D ARAJI NO -178 PLOT NO-35 PLOT NO-35 KANPUR NAGAR MIRZAPUR KALYANPUR',
        city: 'Lucknow',
        pin_code: 226010,
        country: 'India',
        phone: '7054001058',
      },
    })
  );

  const config = {
    method: 'post',
    url: 'https://staging-express.delhivery.com/api/cmu/create.json',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Token ${token}`,
    },
    data: formData,
  };

  axios(config)
    .then(async (response) => {
      console.log('Response:', response.data);
      const waybill = response.data.packages.length > 0 ? response.data.packages[0].waybill : null;
      console.log("Waybill:", waybill);
      await Order.findOneAndUpdate({ _id: order._id }, { waybill })
      return res.status(200).send({ message: 'Waybill updated successfuly in order' })
    })
    .catch((error) => {
      console.error('Error:', error.response ? error.response.data : error.message);
      return res.status(400).send({ message: 'Waybill generate error. Please try again after some time or raise request' })
    });
});

const raisePickupRequest = async (req, res) => {
  try {
    const { pickup_location = 'FORTENETSKILLS SURFACE', expected_package_count, pickup_date, pickup_time } = req.body;

    const DELHIVERY_API_URL = "https://staging-express.delhivery.com/fm/request/new/";
    const token = process.env.DEHLIVERYONE_LIVE_TOKEN;

    const payload = {
      pickup_location,
      expected_package_count,
      pickup_date,
      pickup_time,
    };

    const response = await axios.post(DELHIVERY_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Token ${token}`,
      },
    });

    res.status(200).json({
      success: true,
      message: "Pickup request created successfully",
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create pickup request",
      error: error.response ? error.response.data : error.message,
    });
  }
};

const generateShippingLabel = async (req, res) => {
  try {
    const { waybill } = req.body;

    if (!waybill) {
      return res.status(400).json({
        success: false,
        message: "Waybill number is required",
      });
    }

    const DELHIVERY_API_URL = `https://staging-express.delhivery.com/api/p/packing_slip?wbns=${waybill}&pdf=true`;
    const API_TOKEN = process.env.DEHLIVERYONE_LIVE_TOKEN;

    const response = await axios.get(DELHIVERY_API_URL, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${API_TOKEN}`,
      },
      // responseType: "arraybuffer", 
    });

    // res.setHeader("Content-Type", "application/pdf");
    // res.setHeader("Content-Disposition", `attachment; filename=shipping_label_${waybill}.pdf`);

    res.send(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate shipping label",
      error: error.response ? error.response.data : error.message,
    });
  }
};





module.exports = {
  checkPincodeAvailablity,
  registerDelivery,
  createShipment,
  getPackageDetails,
  registerDeliveryFromOrder,
  registerDeliveryManually,
  raisePickupRequest,
  generateShippingLabel
}
