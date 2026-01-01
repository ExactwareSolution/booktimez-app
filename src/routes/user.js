const express = require("express");
const router = express.Router();
const {
  profile,
  updateProfile,
  getUserCounts,
  getAllUsers,
} = require("../controllers/UserController");

const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// User profile
router.get("/profile", authMiddleware, profile);
router.get("/users", authMiddleware, adminMiddleware, getAllUsers);
router.get("/users/counts", authMiddleware, adminMiddleware, getUserCounts);
router.put("/profile", authMiddleware, updateProfile);

module.exports = router;
