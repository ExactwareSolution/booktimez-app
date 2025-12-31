const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/PublicController");
const { canCreateBooking } = require("../middleware/planBookingLimiter");

// Lookup by slug
router.get("/:slug/categories", ctrl.listCategories);
router.get("/:slug/categories/:categoryId/availability", ctrl.getAvailability);
router.post("/:slug/appointments", canCreateBooking, ctrl.bookAppointment);

// Lookup by UUID (id) to support shareable links like /business/:slug/:id
router.get("/id/:id/categories", ctrl.listCategoriesById);
router.get(
  "/id/:id/categories/:categoryId/availability",
  ctrl.getAvailabilityById
);
router.post("/id/:id/appointments", canCreateBooking, ctrl.bookAppointmentById);

module.exports = router;
