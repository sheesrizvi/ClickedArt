const axios = require('axios');

async function run() {
  try {
    const res = await axios.post('http://localhost:5001/api/artworks/upload');
    console.log('Status:', res.status);
  } catch (err) {
    console.log('Status:', err.response?.status);
    console.log('Body:', err.response?.data);
  }
}

run();
