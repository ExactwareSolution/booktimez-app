const express = require("express");
const router = express.Router();
const {
  createCategory,
  listCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/CategoryController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const multer = require("multer");

// Multer setup
const upload = multer({ dest: "uploads/" });

// Public: list all categories
router.get("/", listCategories);

// Public: get category by ID
router.get("/:id", getCategoryById);

// Admin-only CRUD
router.post(
  "/",
  upload.single("icon"),
  authMiddleware,
  adminMiddleware,
  createCategory
);
router.put("/:id", authMiddleware, adminMiddleware, updateCategory);
router.delete("/:id", authMiddleware, adminMiddleware, deleteCategory);

module.exports = router;
