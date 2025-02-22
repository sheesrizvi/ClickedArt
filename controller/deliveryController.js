const asyncHandler = require('express-async-handler')
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
const registerDelivery = asyncHandler(async (req, res) => {
  const token = process.env.DEHLIVERYONE_LIVE_TOKEN;
  const data = new URLSearchParams();
  data.append('format', 'json');
  data.append('data', JSON.stringify({
    shipments: [
      {
        name: 'Johnny Doe',
        add: 'Kaushal Puri Colony, Gomti Nagar, Lucknow',
        pin: '226010',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        country: 'India',
        phone: '647631335322',
        order: 'ORDER12485',
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
        address_type: '',
      }
    ],
    pickup_location: {
      name: 'FORTENETSKILLS SURFACE',
      add: 'COLONY NO-3,SECTOR NO-D ARAJI NO -178 PLOT NO-35 PLOT NO-35 KANPUR NAGAR MIRZAPUR KALYANPUR',
      city: 'Lucknow',
      pin_code: 226010,
      country: 'India',
      phone: '7054001058'
    }
  }));
  
  
  const config = {
    method: 'post',
    url: 'https://staging-express.delhivery.com/api/cmu/create.json', 
    headers: {
      'Content-Type': 'application/json',
       Authorization: `Token ${token}`, 
    },
    data: data,
  };
  
  axios(config).then((response) => {
    console.log('Response:', response.data);
    return res.status(200).send({ result: response.data })
  })
  .catch((error) => {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(400).send({ error })
  });
})


module.exports = {
  checkPincodeAvailablity,
  registerDelivery,
  createShipment
}
