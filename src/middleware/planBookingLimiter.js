const { Appointment, Business, User, Plan } = require("../models");
const { Op } = require("sequelize");

async function canCreateBooking(req, res, next) {
  try {
    const { businessId, slug, id } = req.params;

    let business;

    // 1️⃣ Admin routes
    if (businessId) {
      business = await Business.findByPk(businessId, {
        include: { model: User, include: Plan },
      });
    }

    // 2️⃣ Public routes by slug
    else if (slug) {
      business = await Business.findOne({
        where: { slug },
        include: { model: User, include: Plan },
      });
    }

    // 3️⃣ Public routes by UUID
    else if (id) {
      business = await Business.findByPk(id, {
        include: { model: User, include: Plan },
      });
    }

    if (!business) {
      return res.status(404).json({ error: "business_not_found" });
    }

    const user = business.User;
    if (!user || !user.Plan) {
      return res.status(400).json({ error: "business_owner_has_no_plan" });
    }

    const plan = user.Plan;

    // ❌ Block inactive plans
    if (plan.status !== "Active") {
      return res.status(403).json({ error: "plan_inactive" });
    }

    // ✅ Unlimited bookings
    if (plan.maxBookingsPerMonth == null) {
      return next();
    }

    // 📅 Monthly window
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // 📊 Count bookings
    const bookingCount = await Appointment.count({
      where: {
        businessId: business.id,
        createdAt: {
          [Op.gte]: startOfMonth,
          [Op.lt]: endOfMonth,
        },
      },
    });

    // 🚫 Enforce limit
    if (bookingCount >= plan.maxBookingsPerMonth) {
      return res.status(403).json({
        error: "booking_limit_reached Contact your Business Owner",
        maxBookingsPerMonth: plan.maxBookingsPerMonth,
        currentBookings: bookingCount,
        upgradeRequired: true,
      });
    }

    // ✅ Attach business for controller reuse (optional but useful)
    req.business = business;

    next();
  } catch (err) {
    console.error("planBookingLimiter error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

module.exports = { canCreateBooking };
