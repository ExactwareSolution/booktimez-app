const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/authController");
const { authMiddleware } = require("../middleware/auth");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/google", ctrl.google);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);
router.put("/update-password", authMiddleware, ctrl.updatePassword);

module.exports = router;
