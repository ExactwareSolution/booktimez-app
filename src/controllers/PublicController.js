const { Business, Category, Appointment } = require("../models");
const { Op } = require("sequelize");
const { sequelize } = require("../models");
const { sendBookingEmail } = require("../services/mailer");
const crypto = require("crypto");
const moment = require("moment-timezone");
const { generateSlots } = require("../services/slotGenerator");
const generateReferenceNumber = require("../utils/generateReferenceNumber");

// Helper to generate cancel token per appointment
function generateCancelToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Book an appointment by business slug
 */
async function bookAppointment(req, res) {
  const { slug } = req.params;
  const { categoryId, startAt, customerName, customerEmail, customerPhone } =
    req.body;

  if (!categoryId || !startAt || !customerName) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const t = await sequelize.transaction();

  try {
    const business = await Business.findOne({
      where: { slug },
      transaction: t,
    });
    if (!business) throw { status: 404, error: "business_not_found" };

    const category = await Category.findByPk(categoryId, { transaction: t });
    if (!category) throw { status: 404, error: "category_not_found" };

    // Parse start time in business timezone
    const start = moment.tz(startAt, business.timezone);
    if (!start.isValid()) throw { status: 400, error: "invalid_startAt" };

    const end = start.clone().add(category.durationMinutes || 30, "minutes");

    // Lock overlapping appointments (compare in UTC)
    const overlapping = await Appointment.findOne({
      where: {
        businessId: business.id,
        categoryId,
        startAt: { [Op.lt]: end.clone().utc().toDate() },
        endAt: { [Op.gt]: start.clone().utc().toDate() },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (overlapping) throw { status: 409, error: "slot_taken" };

    const referenceNumber = await generateReferenceNumber(business);

    // Create appointment with UTC timestamps
    const appt = await Appointment.create(
      {
        businessId: business.id,
        userId: business.ownerId,
        categoryId,
        startAt: start.clone().utc().toDate(),
        endAt: end.clone().utc().toDate(),
        customerName: customerName.trim(),
        customerEmail,
        customerPhone,
        timezoneAtBooking: business.timezone,
        cancelToken: generateCancelToken(),
        referenceNumber,
      },
      { transaction: t }
    );

    await t.commit();

    // Send booking email asynchronously
    sendBookingEmail({
      to: customerEmail,
      business,
      category,
      appointment: appt,
    }).catch(console.error);

    return res.status(201).json(appt);
  } catch (err) {
    await t.rollback();
    if (err.status) return res.status(err.status).json({ error: err.error });
    if (err.name === "SequelizeUniqueConstraintError")
      return res.status(409).json({ error: "referenceNumber_conflict" });

    console.error("bookAppointment error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

/**
 * Book an appointment by business ID
 */
async function bookAppointmentById(req, res) {
  const { id } = req.params;
  const { categoryId, startAt, customerName, customerEmail, customerPhone } =
    req.body;

  if (!categoryId || !startAt || !customerName) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const t = await sequelize.transaction();

  try {
    const business = await Business.findByPk(id, { transaction: t });
    if (!business) throw { status: 404, error: "business_not_found" };

    const category = await Category.findByPk(categoryId, { transaction: t });
    if (!category) throw { status: 404, error: "category_not_found" };

    const start = moment.tz(startAt, business.timezone);
    if (!start.isValid()) throw { status: 400, error: "invalid_startAt" };

    const end = start.clone().add(category.durationMinutes || 30, "minutes");

    const overlapping = await Appointment.findOne({
      where: {
        businessId: business.id,
        categoryId,
        startAt: { [Op.lt]: end.clone().utc().toDate() },
        endAt: { [Op.gt]: start.clone().utc().toDate() },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (overlapping) throw { status: 409, error: "slot_taken" };

    const referenceNumber = await generateReferenceNumber(business);

    const appt = await Appointment.create(
      {
        businessId: business.id,
        userId: business.ownerId,
        categoryId,
        startAt: start.clone().utc().toDate(),
        endAt: end.clone().utc().toDate(),
        customerName: customerName.trim(),
        customerEmail,
        customerPhone,
        timezoneAtBooking: business.timezone,
        cancelToken: generateCancelToken(),
        referenceNumber,
      },
      { transaction: t }
    );

    await t.commit();

    sendBookingEmail({
      to: customerEmail,
      business,
      category,
      appointment: appt,
    }).catch(console.error);

    return res.status(201).json(appt);
  } catch (err) {
    await t.rollback();
    if (err.status) return res.status(err.status).json({ error: err.error });
    if (err.name === "SequelizeUniqueConstraintError")
      return res.status(409).json({ error: "referenceNumber_conflict" });

    console.error("bookAppointmentById error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

/**
 * List categories for a business by slug
 */
async function listCategories(req, res) {
  const { slug } = req.params;
  const business = await Business.findOne({ where: { slug } });
  if (!business) return res.status(404).json({ error: "business_not_found" });

  const categories = await business.getCategories();
  res.json({ business, categories });
}

/**
 * List categories for a business by ID
 */
async function listCategoriesById(req, res) {
  const { id } = req.params;
  const business = await Business.findByPk(id);
  if (!business) return res.status(404).json({ error: "business_not_found" });

  const categories = await business.getCategories();
  res.json({ business, categories });
}

/**
 * Get availability for a category by business slug
 */
async function getAvailability(req, res) {
  const { slug, categoryId } = req.params;
  const { start, end } = req.query;
  const business = await Business.findOne({ where: { slug } });
  if (!business) return res.status(404).json({ error: "business_not_found" });

  const slots = await generateSlots({
    businessId: business.id,
    categoryId,
    startDateISO: start,
    endDateISO: end,
    businessTz: business.timezone,
  });

  res.json({ slots });
}

/**
 * Get availability for a category by business ID
 */
async function getAvailabilityById(req, res) {
  const { id, categoryId } = req.params;
  const { start, end } = req.query;
  const business = await Business.findByPk(id);
  if (!business) return res.status(404).json({ error: "business_not_found" });

  const slots = await generateSlots({
    businessId: business.id,
    categoryId,
    startDateISO: start,
    endDateISO: end,
    businessTz: business.timezone,
  });

  res.json({ slots });
}

/**
 * Get appointment by cancel token (timezone-aware)
 */
async function getAppointmentByCancelToken(req, res) {
  const { cancelToken } = req.params;

  try {
    const appointment = await Appointment.findOne({
      where: { cancelToken },
      include: [
        { model: Business, attributes: ["id", "name", "slug", "timezone"] },
        { model: Category, attributes: ["id", "name", "durationMinutes"] },
      ],
    });

    if (!appointment)
      return res.status(404).json({ error: "appointment_not_found" });

    const tz = appointment.Business.timezone || "UTC";

    return res.status(200).json({
      id: appointment.id,
      business: {
        id: appointment.Business.id,
        name: appointment.Business.name,
        slug: appointment.Business.slug,
      },
      category: {
        id: appointment.Category.id,
        name: appointment.Category.name,
        durationMinutes: appointment.Category.durationMinutes,
      },
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      startAt: moment(appointment.startAt).tz(tz).format(),
      endAt: moment(appointment.endAt).tz(tz).format(),
      status: appointment.status,
      referenceNumber: appointment.referenceNumber,
    });
  } catch (err) {
    console.error("getAppointmentByCancelToken error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

/**
 * Cancel appointment by cancel token (timezone-aware)
 */
async function cancelAppointment(req, res) {
  const { cancelToken } = req.params;
  const t = await Appointment.sequelize.transaction();

  try {
    const appointment = await Appointment.findOne({
      where: { cancelToken },
      transaction: t,
      lock: t.LOCK.UPDATE,
      include: [
        { model: Business, attributes: ["timezone", "name", "slug"] },
        { model: Category, attributes: ["name", "durationMinutes"] },
      ],
    });

    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ error: "appointment_not_found" });
    }

    if (appointment.status === "cancelled") {
      await t.rollback();
      return res.status(400).json({ error: "already_cancelled" });
    }

    appointment.status = "cancelled";
    await appointment.save({ transaction: t });
    await t.commit();

    sendCancellationEmail({ to: appointment.customerEmail, appointment }).catch(
      console.error
    );

    const tz = appointment.Business.timezone || "UTC";

    return res.status(200).json({
      message: "appointment_cancelled",
      appointment: {
        id: appointment.id,
        business: {
          id: appointment.Business.id,
          name: appointment.Business.name,
          slug: appointment.Business.slug,
        },
        category: {
          id: appointment.Category.id,
          name: appointment.Category.name,
          durationMinutes: appointment.Category.durationMinutes,
        },
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        customerPhone: appointment.customerPhone,
        startAt: moment(appointment.startAt).tz(tz).format(),
        endAt: moment(appointment.endAt).tz(tz).format(),
        status: appointment.status,
        referenceNumber: appointment.referenceNumber,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error("cancelAppointment error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}
module.exports = {
  listCategories,
  listCategoriesById,
  getAvailability,
  getAvailabilityById,
  bookAppointment,
  bookAppointmentById,
  getAppointmentByCancelToken,
  cancelAppointment,
};
