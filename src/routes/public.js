const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/PublicController");
const { canCreateBooking } = require("../middleware/planBookingLimiter");

/**
 * -------------------------
 * Routes by business slug
 * -------------------------
 */

// List categories for a business
router.get("/:slug/categories", ctrl.listCategories);

// Get availability for a specific category
router.get("/:slug/categories/:categoryId/availability", ctrl.getAvailability);

// Book an appointment
router.post("/:slug/appointments", canCreateBooking, ctrl.bookAppointment);

/**
 * -------------------------
 * Routes by business UUID (id)
 * -------------------------
 * Useful for shareable links
 */
router.get("/id/:id/categories", ctrl.listCategoriesById);
router.get(
  "/id/:id/categories/:categoryId/availability",
  ctrl.getAvailabilityById
);
router.post("/id/:id/appointments", canCreateBooking, ctrl.bookAppointmentById);

/**
 * -------------------------
 * Appointment management via cancelToken
 * -------------------------
 * Should come last to prevent conflicts with slug routes
 */
router.get("/appointment/:cancelToken", ctrl.getAppointmentByCancelToken);
router.post("/appointment/:cancelToken/cancel", ctrl.cancelAppointment);

module.exports = router;
