const jwt = require("jsonwebtoken");
const { User } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "unauthenticated" });

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "unauthenticated" });
  }

  const token = parts[1];

  try {
    // Verify JWT
    const payload = jwt.verify(token, JWT_SECRET);

    // Optionally, fetch full user from DB
    const user = await User.findByPk(payload.userId);
    if (!user) return res.status(401).json({ error: "unauthenticated" });

    // Attach user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "unauthenticated" });
  }
}

// Admin-only middleware
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware };
