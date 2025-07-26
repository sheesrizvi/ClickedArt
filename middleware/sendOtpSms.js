const axios = require("axios");
const asyncHandler = require("express-async-handler");

const sendOtpSms = asyncHandler(async (phoneNumber, otp) => {
  const apiKey = "sxs9WIFei4rl0P1i";
  const senderId = "CLKDRT";
  const templateId = "1707175335222430932";

  const message = encodeURIComponent(
    `Your One-Time Password (OTP) for ClickedArt registration is ${otp}. Do not share it with anyone. Thank you, Team ClickedArt www.clickedart.com`
  );

  // full URL
  const url = `https://manage.txly.in/vb/apikey.php?apikey=${apiKey}&senderid=${senderId}&templateid=${templateId}&number=${phoneNumber}&message=${message}`;

  try {
    const response = await axios.get(url);
    if (response.status === 200 && response.data) {
      return true;
    } else {
      throw new Error("Failed to send OTP SMS");
    }
  } catch (error) {
    console.error("Error sending OTP SMS:", error.message);
    throw new Error("Unable to send OTP SMS, please try again later.");
  }
});

module.exports = { sendOtpSms };
