const { Business, Category, Availability, Appointment } = require("../models");
const { Op } = require("sequelize");
const { generateSlots } = require("../services/slotGenerator");

async function listCategories(req, res) {
  const slug = req.params.slug;
  const business = await Business.findOne({ where: { slug } });
  if (!business) return res.status(404).json({ error: "not found" });
  // find categories associated with this business via join table
  const categories = await business.getCategories();
  res.json({ business, categories });
}

async function listCategoriesById(req, res) {
  const id = req.params.id;
  const business = await Business.findByPk(id);
  if (!business) return res.status(404).json({ error: "not found" });
  const categories = await business.getCategories();
  res.json({ business, categories });
}

async function getAvailability(req, res) {
  const { slug, categoryId } = req.params;
  const { start, end } = req.query;
  const business = await Business.findOne({ where: { slug } });
  if (!business) return res.status(404).json({ error: "not found" });
  const slots = await generateSlots({
    businessId: business.id,
    categoryId,
    startDateISO: start,
    endDateISO: end,
    businessTz: business.timezone,
  });
  res.json({ slots });
}

async function getAvailabilityById(req, res) {
  const { id, categoryId } = req.params;
  const { start, end } = req.query;
  const business = await Business.findByPk(id);
  if (!business) return res.status(404).json({ error: "not found" });
  const slots = await generateSlots({
    businessId: business.id,
    categoryId,
    startDateISO: start,
    endDateISO: end,
    businessTz: business.timezone,
  });
  res.json({ slots });
}

async function bookAppointment(req, res) {
  const { slug } = req.params;
  const { categoryId, startAt, customerName, customerEmail, customerPhone } =
    req.body;
  const business = await Business.findOne({ where: { slug } });
  if (!business) return res.status(404).json({ error: "not found" });
  // basic overlap check
  if (!categoryId)
    return res.status(400).json({ error: "categoryId required" });
  if (!startAt) return res.status(400).json({ error: "startAt required" });
  if (!customerName || !String(customerName).trim())
    return res.status(400).json({ error: "customerName required" });

  const start = new Date(startAt);
  if (isNaN(start.getTime()))
    return res.status(400).json({ error: "invalid startAt" });

  const category = await Category.findByPk(categoryId);
  if (!category) return res.status(404).json({ error: "category not found" });
  const end = new Date(
    start.getTime() + (category.durationMinutes || 30) * 60000
  );
  // check overlapping
  const overlapping = await Appointment.count({
    where: {
      businessId: business.id,
      categoryId,
      startAt: { [Op.lt]: end },
      endAt: { [Op.gt]: start },
    },
  }).catch(() => 0);
  if (overlapping) return res.status(409).json({ error: "slot taken" });
  try {
    const appt = await Appointment.create({
      businessId: business.id,
      categoryId,
      startAt: start,
      endAt: end,
      customerName: String(customerName).trim(),
      customerEmail,
      customerPhone,
      timezoneAtBooking: business.timezone,
    });
    console.log("Appointment created", appt.id);
    res.status(201).json(appt);
  } catch (err) {
    if (err && err.name && err.name.includes("Sequelize")) {
      return res.status(400).json({ error: err.message, details: err.errors });
    }
    console.error("bookAppointment error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

async function bookAppointmentById(req, res) {
  const { id } = req.params;
  const { categoryId, startAt, customerName, customerEmail, customerPhone } =
    req.body;
  const business = await Business.findByPk(id);
  if (!business) return res.status(404).json({ error: "not found" });
  if (!categoryId)
    return res.status(400).json({ error: "categoryId required" });
  if (!startAt) return res.status(400).json({ error: "startAt required" });
  if (!customerName || !String(customerName).trim())
    return res.status(400).json({ error: "customerName required" });

  const start = new Date(startAt);
  if (isNaN(start.getTime()))
    return res.status(400).json({ error: "invalid startAt" });

  const category = await Category.findByPk(categoryId);
  if (!category) return res.status(404).json({ error: "category not found" });
  const end = new Date(
    start.getTime() + (category.durationMinutes || 30) * 60000
  );
  const overlapping = await Appointment.count({
    where: {
      businessId: business.id,
      categoryId,
      startAt: { [Op.lt]: end },
      endAt: { [Op.gt]: start },
    },
  }).catch(() => 0);
  if (overlapping) return res.status(409).json({ error: "slot taken" });
  try {
    const appt = await Appointment.create({
      businessId: business.id,
      userId: business.ownerId,
      categoryId,
      startAt: start,
      endAt: end,
      customerName: String(customerName).trim(),
      customerEmail,
      customerPhone,
      timezoneAtBooking: business.timezone,
    });
    console.log("Appointment created", appt.id);
    res.status(201).json(appt);
  } catch (err) {
    if (err && err.name && err.name.includes("Sequelize")) {
      return res.status(400).json({ error: err.message, details: err.errors });
    }
    console.error("bookAppointmentById error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

module.exports = {
  listCategories,
  listCategoriesById,
  getAvailability,
  getAvailabilityById,
  bookAppointment,
  bookAppointmentById,
};
