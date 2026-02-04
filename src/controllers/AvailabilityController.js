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
    slotDurationMinutes,
    resourceIds, // array of resource IDs
  } = req.body;

  try {
    const business = await Business.findByPk(businessId);
    if (!business) return res.status(404).json({ error: "business_not_found" });

    if (req.user && req.user.userId !== business.ownerId)
      return res.status(403).json({ error: "unauthorized" });

    const wd = Number(weekday);
    if (!Number.isInteger(wd) || wd < 0 || wd > 6)
      return res.status(400).json({ error: "weekday must be 0-6" });

    if (!startTime || !endTime)
      return res.status(400).json({ error: "startTime, endTime required" });
    if (!categoryId)
      return res.status(400).json({ error: "categoryId required" });

    const category = await Category.findByPk(categoryId);
    if (!category) return res.status(404).json({ error: "category_not_found" });

    const businessCategories = await business.getCategories();
    if (!businessCategories.find((c) => String(c.id) === String(categoryId)))
      return res
        .status(400)
        .json({ error: "category_not_associated_with_business" });

    // 1️⃣ Create the availability first
    const availability = await Availability.create({
      businessId,
      categoryId,
      weekday: wd,
      startTime,
      endTime,
      slotDurationMinutes: slotDurationMinutes || null,
    });

    // 2️⃣ Attach resources
    if (Array.isArray(resourceIds) && resourceIds.length > 0) {
      const resources = await Resource.findAll({
        where: { id: resourceIds, businessId },
      });
      await availability.addResources(resources); // add multiple resources
    }

    // Return availability with resources and category
    const result = await Availability.findByPk(availability.id, {
      include: [{ model: Resource, as: "resources" }, { model: Category }],
    });

    res.json(result);
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

/**
 * UPDATE AVAILABILITY
 */
async function updateAvailability(req, res) {
  const businessId = req.params.businessId;
  const id = req.params.id; // availability id
  const { categoryId, weekday, startTime, endTime, slotDurationMinutes } =
    req.body;

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

    // Validate weekday
    if (weekday !== undefined) {
      const wd = Number(weekday);
      if (!Number.isInteger(wd) || wd < 0 || wd > 6)
        return res.status(400).json({ error: "weekday must be 0-6" });
      availability.weekday = wd;
    }

    // Validate start and end time
    if (startTime !== undefined) availability.startTime = startTime;
    if (endTime !== undefined) availability.endTime = endTime;

    // Validate category
    if (categoryId !== undefined) {
      const category = await Category.findByPk(categoryId);
      if (!category)
        return res.status(404).json({ error: "category_not_found" });

      const businessCategories = await business.getCategories();
      if (!businessCategories.find((c) => String(c.id) === String(categoryId)))
        return res
          .status(400)
          .json({ error: "category_not_associated_with_business" });

      availability.categoryId = categoryId;
    }

    // Update slot duration
    if (slotDurationMinutes !== undefined) {
      availability.slotDurationMinutes = slotDurationMinutes;
    }

    await availability.save();

    // Return updated availability
    const updatedAvailability = await Availability.findByPk(availability.id, {
      include: [{ model: Category }],
    });

    res.json({ availability: updatedAvailability });
  } catch (err) {
    console.error("updateAvailability error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

module.exports = {
  createAvailability,
  listAvailabilities,
  deleteAvailability,
  updateAvailability,
};
