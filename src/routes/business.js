const express = require("express");
const router = express.Router();
const multer = require("multer");

const { authMiddleware } = require("../middleware/auth");
const { canCreateBusiness } = require("../middleware/planEnforcer");

const {
  createBusiness,
  listBusinesses,
  getBusiness,
  updateBusiness,
  deleteBusiness,
  replaceBusinessDetails,
  patchBusinessDetails,
  addItem,
  updateItem,
  deleteItem,
} = require("../controllers/BusinessController");

// Multer setup
const upload = multer({ dest: "uploads/" });

// --------------------------------------------------
// AUTH (all routes protected)
// --------------------------------------------------
router.use(authMiddleware);

// --------------------------------------------------
// BUSINESS CRUD
// --------------------------------------------------

// List all businesses
router.get("/", listBusinesses);

// Create business (logo upload allowed)
router.post("/", upload.single("logo"), canCreateBusiness, createBusiness);

// Get single business
router.get("/:id", getBusiness);

// Update business (basic fields + logo)
router.put("/:id", upload.single("logo"), updateBusiness);

// Delete business
router.delete("/:id", deleteBusiness);

// --------------------------------------------------
// BUSINESS DETAILS (GENERIC JSONB)
// --------------------------------------------------

// Replace full JSONB
router.put("/:id/details", upload.none(), replaceBusinessDetails);

// Patch JSONB (merge)
router.patch("/:id/details", upload.none(), patchBusinessDetails);

// Add item to ANY section
router.post("/:id/details/:section", upload.none(), addItem);

// Update item in ANY section
router.put("/:id/details/:section/:itemId", upload.none(), updateItem);

// Delete item from ANY section
router.delete("/:id/details/:section/:itemId", deleteItem);

// --------------------------------------------------
// BUSINESS CATEGORIES
// --------------------------------------------------
const {
  createCategoryForBusiness,
  listCategoriesForBusiness,
} = require("../controllers/CategoryBusinessController");

router.post(
  "/:businessId/categories",
  upload.none(),
  createCategoryForBusiness,
);

router.get("/:businessId/categories", listCategoriesForBusiness);

// --------------------------------------------------
// AVAILABILITIES & APPOINTMENTS
// --------------------------------------------------
const {
  createAvailability,
  listAvailabilities,
  deleteAvailability,
  updateAvailability,
} = require("../controllers/AvailabilityController");

const {
  listAppointments,
  cancelAppointment,
} = require("../controllers/AppointmentController");

router.post("/:businessId/availabilities", createAvailability);
router.get("/:businessId/availabilities", listAvailabilities);
router.put("/:businessId/availabilities/:id", updateAvailability);
router.delete("/:businessId/availabilities/:id", deleteAvailability);

router.get("/:businessId/appointments", listAppointments);
router.patch("/:businessId/appointments/:id/cancel", cancelAppointment);

module.exports = router;
