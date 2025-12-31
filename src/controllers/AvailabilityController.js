const { Availability, Business, Category } = require("../models");

async function createAvailability(req, res) {
  const businessId = req.params.businessId;
  const { categoryId, weekday, startTime, endTime, slotDurationMinutes } =
    req.body;
  const business = await Business.findByPk(businessId);
  if (!business) return res.status(404).json({ error: "business not found" });
  if (req.user && req.user.userId !== business.ownerId)
    return res.status(403).json({ error: "unauthorized" });
  // validate inputs
  if (typeof weekday === "undefined" || weekday === null) {
    return res.status(400).json({ error: "weekday is required" });
  }
  const wd = Number(weekday);
  if (!Number.isInteger(wd) || wd < 0 || wd > 6)
    return res.status(400).json({ error: "weekday must be 0-6" });
  if (!startTime || !endTime)
    return res.status(400).json({ error: "startTime and endTime required" });

  if (!categoryId)
    return res.status(400).json({ error: "categoryId required" });

  // verify category exists and belongs to this business
  const category = await Category.findByPk(categoryId);
  if (!category) return res.status(404).json({ error: "category not found" });
  // ensure the business is associated with this category
  const businessCategories = await business.getCategories().catch(() => []);
  const belongs = businessCategories.find(
    (c) => String(c.id) === String(categoryId)
  );
  if (!belongs)
    return res
      .status(400)
      .json({ error: "category not associated with this business" });

  try {
    const a = await Availability.create({
      businessId,
      categoryId,
      weekday: wd,
      startTime,
      endTime,
      slotDurationMinutes: slotDurationMinutes || null,
    });
    res.json(a);
  } catch (err) {
    if (err && err.name && err.name.includes("Sequelize")) {
      return res.status(400).json({ error: err.message, details: err.errors });
    }
    console.error("createAvailability error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

async function listAvailabilities(req, res) {
  const businessId = req.params.businessId;
  const business = await Business.findByPk(businessId);
  if (!business) return res.status(404).json({ error: "business not found" });
  if (req.user && req.user.userId !== business.ownerId)
    return res.status(403).json({ error: "unauthorized" });

  try {
    const items = await Availability.findAll({
      where: { businessId },
      include: [{ model: Category }],
      order: [
        ["weekday", "ASC"],
        ["startTime", "ASC"],
      ],
    });
    res.json({ availabilities: items });
  } catch (err) {
    console.error("listAvailabilities error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

async function deleteAvailability(req, res) {
  const businessId = req.params.businessId;
  const id = req.params.id;
  const business = await Business.findByPk(businessId);
  if (!business) return res.status(404).json({ error: "business not found" });
  if (req.user && req.user.userId !== business.ownerId)
    return res.status(403).json({ error: "unauthorized" });

  try {
    const a = await Availability.findOne({ where: { id, businessId } });
    if (!a) return res.status(404).json({ error: "availability not found" });
    await a.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error("deleteAvailability error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

module.exports = { createAvailability, listAvailabilities, deleteAvailability };
