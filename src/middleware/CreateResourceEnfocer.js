const { Resource, Business, User, Plan } = require("../models");

async function canCreateResource(req, res, next) {
  try {
    const userId = req.user.userId;

    // Fetch user with plan
    const user = await User.findByPk(userId, { include: Plan });
    if (!user) return res.status(401).json({ error: "unauthenticated" });

    const plan = user.Plan;
    if (!plan) return res.status(400).json({ error: "user has no plan" });

    // 🔹 Get all businesses owned by this user
    const businesses = await Business.findAll({ where: { ownerId: userId } });
    const businessIds = businesses.map((b) => b.id);

    // 🔹 Count resources in these businesses
    const resourceCount = await Resource.count({
      where: { businessId: businessIds },
    });

    const maxResources =
      typeof plan.maxResources === "number" ? plan.maxResources : 1;

    if (resourceCount >= maxResources) {
      return res.status(403).json({
        error: "Resource limit reached for your plan",
        maxResources,
      });
    }

    next();
  } catch (err) {
    console.error("planEnforcer.canCreateResource error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

module.exports = { canCreateResource };
