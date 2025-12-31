const { User } = require("../models");

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

module.exports = { profile, updateProfile };
