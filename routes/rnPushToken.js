const express = require('express')
const User = require("../models/userModel.js")
const Photographer = require('../models/photographerModel.js')

const router = express.Router()

router.post("/register-token", async (req, res) => {
  const { userId, userType, token } = req.body

  const Model = userType === 'User' ? User : Photographer

  const user = await Model.findById(userId);
  if(!user) return res.status(400).send({ message: 'User not found'})
 
  user.pushToken = token;

  const updatedUser = await user.save();
  res.status(201).send({message: "Token Updated", updatedUser});
  
});

module.exports = router
