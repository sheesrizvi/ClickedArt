const express = require("express");
const router = express.Router();
const {
  createCustomUploadOrder,
  updatePrintStatus,
  updateReadyToShipStatus,
  getAllCustomOrders,
  getFailedOrders,
  getMyOrders,
  getCustomOrderById,
  updateCustomOrderStatus,
} = require("../controller/customOrderController.js");

router.post("/create-custom-orders", createCustomUploadOrder);

router.get("/get-all-custom-orders", getAllCustomOrders);

router.get("/get-failed-orders", getFailedOrders);

router.get("/get-my-orders", getMyOrders);

router.get("/get-custom-order-by-id", getCustomOrderById);

router.put("/upload-custom-order-status", updateCustomOrderStatus);

router.post("/update-print-status", updatePrintStatus);

router.post('/update-ready-to-ship-status', updateReadyToShipStatus)


module.exports = router;
