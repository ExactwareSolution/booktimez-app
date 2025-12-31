const { Business, User, Plan } = require("../models");

// Check if user can create a new business
async function canCreateBusiness(req, res, next) {
  try {
    const userId = req.user.userId;

    // Get user with plan
    const user = await User.findByPk(userId, { include: Plan });
    if (!user) return res.status(401).json({ error: "unauthenticated" });

    const plan = user.Plan;
    if (!plan) return res.status(400).json({ error: "user has no plan" });

    // Count existing businesses
    const businessCount = await Business.count({ where: { ownerId: userId } });

    // Example: default max businesses is 1 if plan doesn't define it
    const maxBusinesses = typeof plan.maxBusinesses === "number" ? plan.maxBusinesses : 1;
    if (businessCount >= maxBusinesses) {
      return res.status(403).json({
        error: "Business limit reached for your plan",
        maxBusinesses,
      });
    }

    // Enforce categories-per-business limit (if provided by plan)
    // categoryIds may come from JSON body or multipart/form-data (stringified)
    let categoryIds = req.body && req.body.categoryIds;
    if (typeof categoryIds === "string") {
      try {
        categoryIds = JSON.parse(categoryIds);
      } catch (e) {
        // allow comma-separated values
        categoryIds = categoryIds ? categoryIds.split(",").map((s) => s.trim()).filter(Boolean) : [];
      }
    }

    if (Array.isArray(categoryIds)) {
      const maxCategories = typeof plan.maxCategories === "number" ? plan.maxCategories : Infinity;
      if (categoryIds.length > maxCategories) {
        return res.status(403).json({
          error: "Category selection exceeds limits for your plan",
          maxCategories,
        });
      }
    }

    next();
  } catch (err) {
    console.error("planEnforcer.canCreateBusiness error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

module.exports = { canCreateBusiness };
