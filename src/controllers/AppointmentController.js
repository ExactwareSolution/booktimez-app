const { Appointment, Business } = require("../models");

async function listAppointments(req, res) {
  const businessId = req.params.businessId;
  const business = await Business.findByPk(businessId);
  if (!business) return res.status(404).json({ error: "business not found" });
  if (req.user && req.user.userId !== business.ownerId)
    return res.status(403).json({ error: "unauthorized" });
  const appts = await Appointment.findAll({
    where: { businessId },
    order: [["startAt", "DESC"]],
  });
  res.json({ appointments: appts });
}

async function cancelAppointment(req, res) {
  const businessId = req.params.businessId;
  const id = req.params.id;
  const business = await Business.findByPk(businessId);
  if (!business) return res.status(404).json({ error: "business not found" });
  if (req.user && req.user.userId !== business.ownerId)
    return res.status(403).json({ error: "unauthorized" });
  const appt = await Appointment.findOne({ where: { id, businessId } });
  if (!appt) return res.status(404).json({ error: "appointment not found" });
  appt.status = "cancelled";
  await appt.save();
  res.json({ appointment: appt });
}

module.exports = { listAppointments, cancelAppointment };
