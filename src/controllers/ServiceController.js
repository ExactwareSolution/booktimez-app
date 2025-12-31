const { Category, Business, Plan } = require("../models");
const { canCreateCategory } = require("../services/planEnforcer");

// Create a new category and associate it with a business (owner action)
async function createCategoryForBusiness(req, res) {
  const businessId = req.params.businessId;
  const { name, description } = req.body;
  const currentCategories = await Category.count({
    where: {
      /* global count is not per business */
    },
  }).catch(() => 0);
  // enforce plan limits by loading the business with its Plan
  const business = await Business.findByPk(businessId, { include: [Plan] });
  // count categories associated with this business
  const associated = await business.getCategories().catch(() => []);
  const allowed = await canCreateCategory(business, associated.length);
  if (!allowed)
    return res
      .status(403)
      .json({
        error: "plan_limit_reached",
        message: "Your current plan does not allow creating more categories",
      });
  if (!name || !String(name).trim())
    return res.status(400).json({ error: "category name is required" });
  try {
    // create or find existing category and associate
    let category = await Category.findOne({
      where: { name: String(name).trim() },
    });
    if (!category) {
      category = await Category.create({
        name: String(name).trim(),
        description,
      });
    }
    await business.addCategory(category);
    res.json(category);
  } catch (err) {
    if (err && err.name && err.name.includes("Sequelize")) {
      return res.status(400).json({ error: err.message, details: err.errors });
    }
    console.error("createCategoryForBusiness error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

async function listCategoriesForBusiness(req, res) {
  const businessId = req.params.businessId;
  const business = await Business.findByPk(businessId);
  if (!business) return res.status(404).json({ error: "business not found" });
  const categories = await business.getCategories();
  res.json({ categories });
}

module.exports = { createCategoryForBusiness, listCategoriesForBusiness };
