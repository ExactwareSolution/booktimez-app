const { Plan, User } = require("../models");
const { Op } = require("sequelize");
const crypto = require("crypto");
const Stripe = require("stripe");
const Razorpay = require("razorpay");

// helper: resolve plan by UUID or by name (case-insensitive)
async function resolvePlan(identifier) {
  if (!identifier) return null;
  // UUID v4 simple check
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(identifier)) {
    return Plan.findByPk(identifier);
  }
  // fallback: match by name case-insensitive (Postgres ILIKE)
  return Plan.findOne({ where: { name: { [Op.iLike]: identifier } } });
}

async function listPlans(req, res) {
  const plans = await Plan.findAll({
    order: [["price", "ASC"]],
  });
  res.json({ plans });
}

async function createPlan(req, res) {
  try {
    const payload = req.body || {};
    const plan = await Plan.create({
      code: payload.code,
      name: payload.name,
      monthlyPriceCents: payload.monthlyPriceCents || 0,
      maxBookingsPerMonth: payload.maxBookingsPerMonth || null,
      maxBusinesses: payload.maxBusinesses || null,
      maxCategories: payload.maxCategories || null,
      languages: payload.languages || ["en"],
      brandingRemoved: !!payload.brandingRemoved,
      notificationsIncluded: !!payload.notificationsIncluded,
    });

    res.json({ plan });
  } catch (err) {
    console.error("createPlan error:", err);
    res.status(500).json({ error: "failed_to_create_plan" });
  }
}

// ================================
// CREATE STRIPE CHECKOUT
// ================================
async function createCheckout(req, res) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(400).json({ error: "stripe_not_configured" });
    }

    const stripe = Stripe(stripeKey);

    const planCode = req.params.id; // "pro"
    const plan = await Plan.findOne({ where: { code: planCode } });
    if (!plan) return res.status(404).json({ error: "plan_not_found" });

    if (!plan.monthlyPriceCents || plan.monthlyPriceCents <= 0) {
      return res.status(400).json({ error: "plan_not_payable" });
    }

    const frontBase = process.env.APP_BASE_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: plan.monthlyPriceCents,
            product_data: {
              name: plan.name,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${frontBase}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontBase}/dashboard`,
      metadata: {
        userId: req.user.userId,
        planCode: plan.code, // ✅ SAFE
      },
    });

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("createCheckout error:", err);
    res.status(500).json({ error: "checkout_error" });
  }
}

// ================================
// CREATE RAZORPAY ORDER
// ================================
async function createRazorpayOrder(req, res) {
  try {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(400).json({ error: "razorpay_not_configured" });
    }

    const razor = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    const planCode = req.params.id; // "pro"
    const plan = await Plan.findOne({ where: { code: planCode } });
    if (!plan) return res.status(404).json({ error: "plan_not_found" });

    const options = {
      amount: plan.monthlyPriceCents, // paise
      currency: "INR",
      receipt: `pl_${plan.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
      payment_capture: 1,
      notes: {
        planCode: plan.code, // ✅ SAFE
        userId: req.user.userId,
      },
    };

    const order = await razor.orders.create(options);
    res.json({ order, keyId: RAZORPAY_KEY_ID });
  } catch (err) {
    console.error("createRazorpayOrder error:", err);
    res.status(500).json({ error: "razorpay_error" });
  }
}

// ================================
// CONFIRM CHECKOUT (STRIPE + RAZORPAY)
// ================================
async function confirmCheckout(req, res) {
  try {
    const body = req.body;

    // ---------- STRIPE ----------
    if (body.sessionId) {
      const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(body.sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "payment_not_completed" });
      }

      const planCode = session.metadata.planCode;
      const userId = req.user.userId;

      const plan = await Plan.findOne({ where: { code: planCode } });
      if (!plan) return res.status(404).json({ error: "plan_not_found" });

      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ error: "user_not_found" });

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      user.planId = plan.id; // ✅ UUID
      user.planExpiresAt = expiresAt;
      await user.save();

      return res.json({ ok: true, plan: plan.code, expiresAt });
    }

    // ---------- RAZORPAY ----------
    if (
      body.razorpay_payment_id &&
      body.razorpay_order_id &&
      body.razorpay_signature
    ) {
      const generated = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
        .digest("hex");

      if (generated !== body.razorpay_signature) {
        return res.status(400).json({ error: "invalid_signature" });
      }

      const razor = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const order = await razor.orders.fetch(body.razorpay_order_id);
      const planCode = order.notes.planCode;
      const userId = order.notes.userId;

      const plan = await Plan.findOne({ where: { code: planCode } });
      if (!plan) return res.status(404).json({ error: "plan_not_found" });

      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ error: "user_not_found" });

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      user.planId = plan.id; // ✅ UUID
      user.planExpiresAt = expiresAt;
      await user.save();

      return res.json({ ok: true, plan: plan.code, expiresAt });
    }

    return res.status(400).json({ error: "unsupported_payment_flow" });
  } catch (err) {
    console.error("confirmCheckout error:", err);
    res.status(500).json({ error: "confirm_error" });
  }
}

module.exports = {
  listPlans,
  createPlan,
  createCheckout,
  createRazorpayOrder,
  confirmCheckout,
};

// Report which payment providers are configured
async function paymentProviders(req, res) {
  const hasStripe = !!process.env.STRIPE_SECRET_KEY;
  const hasRazor = !!(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );
  res.json({ stripe: hasStripe, razorpay: hasRazor });
}

module.exports.paymentProviders = paymentProviders;
