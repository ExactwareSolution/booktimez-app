const { sequelize, User, Business, Appointment, Plan } = require("../models");
const { Op, fn, col, literal } = require("sequelize");

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * GET /api/admin/analytics/dashboard
 */
async function getDashboardAnalytics(req, res) {
  try {
    /** -------------------------------
     *  OVERVIEW COUNTS
     * --------------------------------*/
    const [totalUsers, totalBusinesses, totalBookings, activePlans] =
      await Promise.all([
        User.count(),
        Business.count(),
        Appointment.count(),
        Plan.count({ where: { status: "Active" } }),
      ]);

    /** -------------------------------
     *  MONTHLY BOOKINGS (CURRENT YEAR)
     * --------------------------------*/
    const year = new Date().getFullYear();

    const monthlyRaw = await Appointment.findAll({
      attributes: [
        [fn("EXTRACT", literal('MONTH FROM "startAt"')), "month"],
        [fn("COUNT", col("id")), "count"],
      ],
      where: {
        startAt: {
          [Op.between]: [new Date(`${year}-01-01`), new Date(`${year}-12-31`)],
        },
      },
      group: [literal("month")],
      order: [literal("month ASC")],
      raw: true,
    });

    const monthlyMap = {};
    monthlyRaw.forEach((row) => {
      monthlyMap[row.month] = Number(row.count);
    });

    const monthlyBookings = MONTHS.map((m, i) => ({
      month: m,
      count: monthlyMap[i + 1] || 0,
    }));

    /** -------------------------------
     *  USERS BY PLAN
     * --------------------------------*/
    const usersByPlanRaw = await Plan.findAll({
      attributes: ["name", [fn("COUNT", col("users.id")), "users"]],
      include: [
        {
          model: User,
          as: "users",
          attributes: [],
          required: false,
        },
      ],
      group: ["Plan.id"],
      order: [[literal("users"), "DESC"]],
      raw: true,
    });

    const usersByPlan = usersByPlanRaw.map((p) => ({
      plan: p.name,
      users: Number(p.users),
    }));

    /** -------------------------------
     *  RESPONSE
     * --------------------------------*/
    return res.json({
      overview: {
        totalUsers,
        totalBusinesses,
        totalBookings,
        activePlans,
      },
      monthlyBookings,
      usersByPlan,
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return res.status(500).json({
      message: "Failed to load analytics",
    });
  }
}

module.exports = {
  getDashboardAnalytics,
};
