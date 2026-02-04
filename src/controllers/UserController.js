const { User, Plan } = require("../models");

async function profile(req, res) {
  if (!req.user) return res.status(401).json({ error: "unauth" });
  const user = await User.findByPk(req.user.userId);
  if (!user) return res.status(404).json({ error: "not found" });
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
}

async function updateProfile(req, res) {
  if (!req.user) return res.status(401).json({ error: "unauth" });
  const user = await User.findByPk(req.user.userId);
  if (!user) return res.status(404).json({ error: "not found" });
  const { name } = req.body;
  if (name) user.name = name;
  await user.save();
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
}

/**
 * GET /api/admin/users/counts
 * Admin dashboard counters
 */
async function getUserCounts(req, res) {
  try {
    const [totalUsers, admins, owners] = await Promise.all([
      User.count(),
      User.count({ where: { role: "admin" } }),
      User.count({ where: { role: "owner" } }),
    ]);

    return res.json({
      totalUsers,

      admins,
      owners,
    });
  } catch (err) {
    console.error("User count error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/admin/users
 * Admin: list users
 */
async function getAllUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "name",
        "email",
        "role",
        "planId",
        "isActive",
        "planExpiresAt",
        "createdAt",
      ],
      include: [
        {
          model: Plan,
          as: "plan",
          attributes: [
            "id",
            "name",
            "price",
            "maxBookingsPerMonth",
            "maxCategories",
            "brandingRemoved",
            "notificationsIncluded",
            "languages",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({ users });
  } catch (err) {
    console.error("Get users error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = { profile, updateProfile, getUserCounts, getAllUsers };
