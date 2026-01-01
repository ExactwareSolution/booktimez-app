const express = require("express");
const router = express.Router();
const { getDashboardAnalytics } = require("../controllers/AnalyticsController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

router.get(
  "/overview",
  authMiddleware,
  adminMiddleware,
  getDashboardAnalytics
);

module.exports = router;
