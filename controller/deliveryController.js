const asyncHandler = require('express-async-handler')
const axios = require('axios')

const checkPincodeAvailablity = asyncHandler(async (req, res) => {
    try {
      const { pincode } = req.query;
      const token = process.env.DEHLIVERYONE_LIVE_TOKEN;
      console.log(token)
      if (!token) {
        return res.status(500).send({ error: 'Authorization token is missing' });
      }
  
      const result = await axios.get('https://track.delhivery.com/c/api/pin-codes/json/', {
        params: {
          filter_codes: pincode
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        }
      });
  
      res.status(200).send({ result: result.data });
    } catch (error) {
      const status = error.response ? error.response.status : 500;
      const message = error.response ? error.response.data : error.message;
      res.status(status).send({ error: message });
    }
});


module.exports = {
    checkPincodeAvailablity
}