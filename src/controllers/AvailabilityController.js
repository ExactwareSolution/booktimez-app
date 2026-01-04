const { DateTime } = require("luxon");
const { Availability, Business, Category, Resource } = require("../models");

/**
 * CREATE AVAILABILITY
 */
async function createAvailability(req, res) {
  const businessId = req.params.businessId;
  const {
    categoryId,
    weekday,
    startTime,
    endTime,
    userTimezone,
    slotDurationMinutes,
  } = req.body;

  try {
    const business = await Business.findByPk(businessId);
    if (!business) return res.status(404).json({ error: "business_not_found" });

    if (req.user && req.user.userId !== business.ownerId)
      return res.status(403).json({ error: "unauthorized" });

    const wd = Number(weekday);
    if (!Number.isInteger(wd) || wd < 0 || wd > 6)
      return res.status(400).json({ error: "weekday must be 0-6" });

    if (!startTime || !endTime || !userTimezone)
      return res
        .status(400)
        .json({ error: "startTime, endTime, and userTimezone required" });
    if (!categoryId)
      return res.status(400).json({ error: "categoryId required" });

    const category = await Category.findByPk(categoryId);
    if (!category) return res.status(404).json({ error: "category_not_found" });

    const businessCategories = await business.getCategories();
    if (!businessCategories.find((c) => String(c.id) === String(categoryId)))
      return res
        .status(400)
        .json({ error: "category_not_associated_with_business" });

    // -----------------------
    // Convert from user's local time → business timezone → store as UTC
    // -----------------------
    const startInBusinessTZ = DateTime.fromISO(startTime, {
      zone: userTimezone,
    }).setZone(business.timezone);
    const endInBusinessTZ = DateTime.fromISO(endTime, {
      zone: userTimezone,
    }).setZone(business.timezone);

    if (!startInBusinessTZ.isValid || !endInBusinessTZ.isValid)
      return res.status(400).json({ error: "Invalid startTime or endTime" });

    // Convert to UTC for DB
    const availability = await Availability.create({
      businessId,
      categoryId,
      weekday: wd,
      startTime: startInBusinessTZ.toUTC().toISO(),
      endTime: endInBusinessTZ.toUTC().toISO(),
      slotDurationMinutes: slotDurationMinutes || null,
    });

    res.json({
      availability,
      business: { id: business.id, timezone: business.timezone },
    });
  } catch (err) {
    console.error("createAvailability error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

/**
 * LIST AVAILABILITIES + RESOURCES
 */
async function listAvailabilities(req, res) {
  const businessId = req.params.businessId;

  try {
    const business = await Business.findByPk(businessId);
    if (!business) return res.status(404).json({ error: "business_not_found" });

    if (req.user && req.user.userId !== business.ownerId)
      return res.status(403).json({ error: "unauthorized" });

    const availabilities = await Availability.findAll({
      where: { businessId },
      include: [{ model: Category }],
      order: [
        ["weekday", "ASC"],
        ["startTime", "ASC"],
      ],
    });

    const resources = await Resource.findAll({ where: { businessId } });

    res.json({ availabilities, resources });
  } catch (err) {
    console.error("listAvailabilities error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

/**
 * DELETE AVAILABILITY
 */
async function deleteAvailability(req, res) {
  const businessId = req.params.businessId;
  const id = req.params.id;

  try {
    const business = await Business.findByPk(businessId);
    if (!business) return res.status(404).json({ error: "business_not_found" });

    if (req.user && req.user.userId !== business.ownerId)
      return res.status(403).json({ error: "unauthorized" });

    const availability = await Availability.findOne({
      where: { id, businessId },
    });
    if (!availability)
      return res.status(404).json({ error: "availability_not_found" });

    await availability.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error("deleteAvailability error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

module.exports = { createAvailability, listAvailabilities, deleteAvailability };
