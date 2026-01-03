const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Plan, Business } = require("../models");
// Note: forgot/reset flows minimal: token printed to console
const crypto = require("crypto");
const { User: UserModel } = require("../models");
const sequelize = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

async function register(req, res) {
  const { email, password, name } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email+password required" });
  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ error: "email exists" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password, name });
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email+password required" });
  }

  const user = await User.findOne({ where: { email } });
  if (!user || !user.password) {
    return res.status(401).json({ error: "invalid" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "invalid" });
  }

  // 🔹 Fetch plan to get planCode
  const plan = user.planId ? await Plan.findByPk(user.planId) : null;

  // 🔹 Business availability
  const businessCount = await Business.count({
    where: { ownerId: user.id },
  });

  const isBusinessAvailable = businessCount > 0;

  // 🔹 JWT
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      planId: user.planId,
      planCode: plan?.code || "FREE", // ✅ SAFE
      role: user.role,
    },
    isBusinessAvailable,
  });
}

// Simplified google login: frontend sends profile {email, sub, name}
async function google(req, res) {
  try {
    const { email, googleId, name } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ error: "googleId + email required" });
    }

    // 🔹 Get the Free plan
    const freePlan = await Plan.findOne({ where: { code: "free" } });
    if (!freePlan) {
      return res.status(500).json({ error: "Free plan not configured" });
    }

    // 🔹 Find user by googleId or email
    let user = await User.findOne({ where: { googleId } });
    if (!user) user = await User.findOne({ where: { email } });

    if (user) {
      // Update googleId if missing
      user.googleId = googleId;
      if (!user.planId) user.planId = freePlan.id;
      await user.save();
    } else {
      // Create new user with Free plan
      user = await User.create({
        email,
        googleId,
        name,
        planId: freePlan.id,
        role: "owner",
      });
    }

    // 🔹 Fetch plan
    const plan = await Plan.findByPk(user.planId);

    // 🔹 Business availability
    const businessCount = await Business.count({
      where: { ownerId: user.id },
    });
    const isBusinessAvailable = businessCount > 0;

    // 🔹 JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        planId: user.planId,
        planCode: plan?.code || "free",
        role: user.role,
      },
      isBusinessAvailable,
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

async function updatePassword(req, res) {
  try {
    // 1. Extract userId from the token (provided by middleware)
    const userId = req.user.userId;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "newPassword required" });
    }

    // 2. Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // 3. Update the user record
    const [updated] = await User.update(
      { password: passwordHash },
      { where: { id: userId } }
    );

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Update password error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

const PasswordReset = sequelize.define("PasswordReset", {
  token: { type: require("sequelize").DataTypes.STRING, primaryKey: true },
  userId: { type: require("sequelize").DataTypes.UUID, allowNull: false },
  expiresAt: { type: require("sequelize").DataTypes.DATE, allowNull: false },
});

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({});
  const user = await User.findOne({ where: { email } });
  if (!user) return res.json({ message: "If user exists, reset sent" });
  const token = crypto.randomBytes(24).toString("hex");
  await PasswordReset.upsert({
    token,
    userId: user.id,
    expiresAt: new Date(Date.now() + 3600 * 1000),
  });
  console.log(`Password reset token for ${email}: ${token}`);
  res.json({ message: "If user exists, reset sent" });
}

async function resetPassword(req, res) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ error: "token+newPassword required" });
  const rec = await PasswordReset.findByPk(token);
  if (!rec || rec.expiresAt < new Date())
    return res.status(400).json({ error: "invalid token" });
  const user = await User.findByPk(rec.userId);
  if (!user) return res.status(400).json({ error: "invalid" });
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  await rec.destroy();
  const jwtToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);
  res.json({ token: jwtToken });
}

module.exports = {
  register,
  login,
  google,
  updatePassword,
  forgotPassword,
  resetPassword,
};
