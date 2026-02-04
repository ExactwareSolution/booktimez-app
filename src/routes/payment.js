const express = require("express");
const router = express.Router();
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const {
  allPayment,
  getPaymentById,
  updatePayment,
  softDeletePayment,
} = require("../controllers/PaymentController");

router.get("/", authMiddleware, adminMiddleware, allPayment);
router.get("/:id", authMiddleware, adminMiddleware, getPaymentById);
router.put("/:id", authMiddleware, adminMiddleware, updatePayment);
router.delete("/:id", authMiddleware, adminMiddleware, softDeletePayment);

module.exports = router;
