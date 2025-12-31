const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/PlanController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

router.get("/", ctrl.listPlans);

// Admin: create a new plan
router.post("/", authMiddleware, adminMiddleware, ctrl.createPlan);

// Create a Stripe checkout session (authenticated user)
router.post("/:id/checkout", authMiddleware, ctrl.createCheckout);

// Create a Razorpay order (authenticated user)
router.post("/:id/razorpay", authMiddleware, ctrl.createRazorpayOrder);

// Confirm a checkout session and assign plan to user
router.post("/confirm", authMiddleware, ctrl.confirmCheckout);

// Report available payment providers
router.get("/providers", ctrl.paymentProviders);

module.exports = router;
