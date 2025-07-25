const express = require('express');
const router = express.Router();

const {
  addCustomUploadImage,
  updateCustomUploadImage,
  deleteCustomUploadImage,
  getCustomUploadImageById,
  getCustomUploadsByUser,
  getAllCustomUploads
} = require('../../controller/imagebase/customUploadImageController');


router.post('/add-custom-upload-image', addCustomUploadImage);

router.post('/update-custom-upload', updateCustomUploadImage);

router.delete('/delete-custom-upload', deleteCustomUploadImage);

router.get('/get-custom-upload-image-by-id', getCustomUploadImageById);

router.get('/get-custom-upload-by-user', getCustomUploadsByUser);

router.get('/get-all-custom-uplaods', getAllCustomUploads);

module.exports = router;
