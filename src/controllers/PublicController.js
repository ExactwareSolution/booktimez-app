const { Business, Category, Appointment, Resource } = require("../models");
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
 * Internal handler for booking
 */
async function bookAppointmentHandler({
  business,
  category,
  startAt,
  customerName,
  customerEmail,
  customerPhone,
  transaction,
}) {
  // 🔒 Lock resources
  const resources = await Resource.findAll({
    where: { businessId: business.id },
    order: [["id", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!resources.length) {
    throw { status: 409, error: "no_resources_available" };
  }

  const start = moment.tz(startAt, business.timezone);
  if (!start.isValid()) {
    throw { status: 400, error: "invalid_startAt" };
  }

  const end = start.clone().add(category.durationMinutes || 30, "minutes");

  // 🔒 Lock overlapping appointments
  const overlappingAppointments = await Appointment.findAll({
    where: {
      businessId: business.id,
      categoryId: category.id,
      status: "booked",
      startAt: { [Op.lt]: end.clone().utc().toDate() },
      endAt: { [Op.gt]: start.clone().utc().toDate() },
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const bookedResourceIds = new Set(
    overlappingAppointments.map((a) => a.resourceId)
  );

  const availableResource = resources.find((r) => !bookedResourceIds.has(r.id));

  if (!availableResource) {
    throw { status: 409, error: "slot_taken" };
  }

  const referenceNumber = await generateReferenceNumber(business);

  const appt = await Appointment.create(
    {
      businessId: business.id,
      userId: business.ownerId,
      categoryId: category.id,
      resourceId: availableResource.id,
      startAt: start.clone().utc().toDate(),
      endAt: end.clone().utc().toDate(),
      customerName: customerName.trim(),
      customerEmail,
      customerPhone,
      timezoneAtBooking: business.timezone,
      cancelToken: generateCancelToken(),
      referenceNumber,
      status: "booked",
    },
    { transaction }
  );

  if (customerEmail) {
    sendBookingEmail({
      to: customerEmail,
      business,
      category,
      appointment: appt,
    }).catch(console.error);
  }

  return appt;
}

/**
 * BOOK APPOINTMENT BY SLUG
 */
async function bookAppointment(req, res) {
  const { slug } = req.params;
  const { categoryId, startAt, customerName, customerEmail, customerPhone } =
    req.body;

  if (!categoryId || !startAt || !customerName)
    return res.status(400).json({ error: "missing_fields" });

  const transaction = await Appointment.sequelize.transaction();
  try {
    const business = await Business.findOne({ where: { slug }, transaction });
    if (!business) throw { status: 404, error: "business_not_found" };

    const category = await Category.findByPk(categoryId, { transaction });
    if (!category) throw { status: 404, error: "category_not_found" };

    const appt = await bookAppointmentHandler({
      business,
      category,
      startAt,
      customerName,
      customerEmail,
      customerPhone,
      transaction,
    });

    await transaction.commit();
    res.status(201).json(appt);
  } catch (err) {
    await transaction.rollback();
    if (err.status) return res.status(err.status).json({ error: err.error });
    console.error("bookAppointment error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

/**
 * BOOK APPOINTMENT BY BUSINESS ID
 */
async function bookAppointmentById(req, res) {
  const { id } = req.params;
  const { categoryId, startAt, customerName, customerEmail, customerPhone } =
    req.body;

  if (!categoryId || !startAt || !customerName)
    return res.status(400).json({ error: "missing_fields" });

  const transaction = await Appointment.sequelize.transaction();
  try {
    const business = await Business.findByPk(id, { transaction });
    if (!business) throw { status: 404, error: "business_not_found" };

    const category = await Category.findByPk(categoryId, { transaction });
    if (!category) throw { status: 404, error: "category_not_found" };

    const appt = await bookAppointmentHandler({
      business,
      category,
      startAt,
      customerName,
      customerEmail,
      customerPhone,
      transaction,
    });

    await transaction.commit();
    res.status(201).json(appt);
  } catch (err) {
    await transaction.rollback();
    if (err.status) return res.status(err.status).json({ error: err.error });
    console.error("bookAppointmentById error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

// /**
//  * Book an appointment by business slug
//  */
// async function bookAppointment(req, res) {
//   const { slug } = req.params;
//   const { categoryId, startAt, customerName, customerEmail, customerPhone } =
//     req.body;

//   if (!categoryId || !startAt || !customerName) {
//     return res.status(400).json({ error: "missing_fields" });
//   }

//   const t = await Appointment.sequelize.transaction();

//   try {
//     const business = await Business.findOne({
//       where: { slug },
//       transaction: t,
//     });
//     if (!business) throw { status: 404, error: "business_not_found" };

//     const category = await Category.findByPk(categoryId, { transaction: t });
//     if (!category) throw { status: 404, error: "category_not_found" };

//     const start = moment.tz(startAt, business.timezone);
//     if (!start.isValid()) throw { status: 400, error: "invalid_startAt" };

//     const end = start.clone().add(category.durationMinutes || 30, "minutes");

//     // 🔹 Get all resources for this business
//     const resources = await Resource.findAll({
//       where: { businessId: business.id },
//       transaction: t,
//     });

//     if (!resources.length)
//       throw { status: 409, error: "no_resources_available" };

//     // 🔹 Check overlapping appointments per resource
//     const overlappingAppointments = await Appointment.findAll({
//       where: {
//         businessId: business.id,
//         categoryId,
//         startAt: { [Op.lt]: end.clone().utc().toDate() },
//         endAt: { [Op.gt]: start.clone().utc().toDate() },
//         status: "booked",
//       },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     const bookedResourceIds = overlappingAppointments.map((a) => a.resourceId);
//     const availableResources = resources.filter(
//       (r) => !bookedResourceIds.includes(r.id)
//     );

//     if (!availableResources.length) throw { status: 409, error: "slot_taken" };

//     const resourceToBook = availableResources[0]; // assign first free resource
//     const referenceNumber = await generateReferenceNumber(business);

//     const appt = await Appointment.create(
//       {
//         businessId: business.id,
//         userId: business.ownerId,
//         categoryId,
//         resourceId: resourceToBook.id,
//         startAt: start.clone().utc().toDate(),
//         endAt: end.clone().utc().toDate(),
//         customerName: customerName.trim(),
//         customerEmail,
//         customerPhone,
//         timezoneAtBooking: business.timezone,
//         cancelToken: generateCancelToken(),
//         referenceNumber,
//       },
//       { transaction: t }
//     );

//     await t.commit();

//     sendBookingEmail({
//       to: customerEmail,
//       business,
//       category,
//       appointment: appt,
//     }).catch(console.error);

//     return res.status(201).json(appt);
//   } catch (err) {
//     await t.rollback();
//     if (err.status) return res.status(err.status).json({ error: err.error });
//     if (err.name === "SequelizeUniqueConstraintError")
//       return res.status(409).json({ error: "referenceNumber_conflict" });

//     console.error("bookAppointment error:", err);
//     return res.status(500).json({ error: "internal_error" });
//   }
// }

// /**
//  * Book an appointment by business ID
//  */
// async function bookAppointmentById(req, res) {
//   const { id } = req.params;
//   const { categoryId, startAt, customerName, customerEmail, customerPhone } =
//     req.body;

//   if (!categoryId || !startAt || !customerName)
//     return res.status(400).json({ error: "missing_fields" });

//   const t = await Appointment.sequelize.transaction();

//   try {
//     const business = await Business.findByPk(id, { transaction: t });
//     if (!business) throw { status: 404, error: "business_not_found" };

//     const category = await Category.findByPk(categoryId, { transaction: t });
//     if (!category) throw { status: 404, error: "category_not_found" };

//     const start = moment.tz(startAt, business.timezone);
//     if (!start.isValid()) throw { status: 400, error: "invalid_startAt" };

//     const end = start.clone().add(category.durationMinutes || 30, "minutes");

//     // 🔹 Get all resources
//     const resources = await Resource.findAll({
//       where: { businessId: business.id },
//       transaction: t,
//     });
//     if (!resources.length)
//       throw { status: 409, error: "no_resources_available" };

//     // 🔹 Overlapping appointments per resource
//     const overlappingAppointments = await Appointment.findAll({
//       where: {
//         businessId: business.id,
//         categoryId,
//         startAt: { [Op.lt]: end.clone().utc().toDate() },
//         endAt: { [Op.gt]: start.clone().utc().toDate() },
//         status: "booked",
//       },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     const bookedResourceIds = overlappingAppointments.map((a) => a.resourceId);
//     const availableResources = resources.filter(
//       (r) => !bookedResourceIds.includes(r.id)
//     );

//     if (!availableResources.length) throw { status: 409, error: "slot_taken" };

//     const resourceToBook = availableResources[0];
//     const referenceNumber = await generateReferenceNumber(business);

//     const appt = await Appointment.create(
//       {
//         businessId: business.id,
//         userId: business.ownerId,
//         categoryId,
//         resourceId: resourceToBook.id,
//         startAt: start.clone().utc().toDate(),
//         endAt: end.clone().utc().toDate(),
//         customerName: customerName.trim(),
//         customerEmail,
//         customerPhone,
//         timezoneAtBooking: business.timezone,
//         cancelToken: generateCancelToken(),
//         referenceNumber,
//       },
//       { transaction: t }
//     );

//     await t.commit();

//     sendBookingEmail({
//       to: customerEmail,
//       business,
//       category,
//       appointment: appt,
//     }).catch(console.error);

//     return res.status(201).json(appt);
//   } catch (err) {
//     await t.rollback();
//     if (err.status) return res.status(err.status).json({ error: err.error });
//     if (err.name === "SequelizeUniqueConstraintError")
//       return res.status(409).json({ error: "referenceNumber_conflict" });

//     console.error("bookAppointmentById error:", err);
//     return res.status(500).json({ error: "internal_error" });
//   }
// }

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
