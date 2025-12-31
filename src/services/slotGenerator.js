const { DateTime } = require("luxon");
const { Availability, Appointment, Category } = require("../models");
const { Op } = require("sequelize");

async function generateSlots({
  businessId,
  categoryId,
  startDateISO,
  endDateISO,
  businessTz,
}) {
  const startDate = DateTime.fromISO(startDateISO, {
    zone: businessTz,
  }).startOf("day");
  const endDate = DateTime.fromISO(endDateISO, { zone: businessTz }).endOf(
    "day"
  );

  const category = await Category.findByPk(categoryId);
  if (!category) return [];
  // categories don't have duration by default; availability may set slotDurationMinutes
  // We'll compute duration per-availability (fallback to category.durationMinutes or 30)

  const availabilities = await Availability.findAll({
    where: { businessId, categoryId },
  });

  const slots = [];
  for (let d = startDate; d <= endDate; d = d.plus({ days: 1 })) {
    const weekday = d.weekday % 7; // luxon: Monday=1..Sunday=7; map to 0-6
    const dayAvail = availabilities.filter((a) => a.weekday === weekday);
    for (const a of dayAvail) {
      // parse time like '09:00'
      const [sh, sm] = a.startTime.split(":").map(Number);
      const [eh, em] = a.endTime.split(":").map(Number);
      let localStart = d.set({
        hour: sh,
        minute: sm,
        second: 0,
        millisecond: 0,
      });
      const localEnd = d.set({
        hour: eh,
        minute: em,
        second: 0,
        millisecond: 0,
      });
      const durationForThis =
        a.slotDurationMinutes || category.durationMinutes || 30;
      const step = a.slotDurationMinutes || durationForThis;
      while (localStart.plus({ minutes: durationForThis }) <= localEnd) {
        const candidateStartUTC = localStart.setZone("utc");
        const candidateEndUTC = candidateStartUTC.plus({
          minutes: durationForThis,
        });
        // check overlapping appointments
        const overlapping = await Appointment.count({
          where: {
            businessId,
            categoryId,
            startAt: { [Op.lt]: candidateEndUTC.toJSDate() },
            endAt: { [Op.gt]: candidateStartUTC.toJSDate() },
          },
        }).catch(() => 0);
        if (!overlapping) {
          slots.push({
            start: candidateStartUTC.toISO(),
            end: candidateEndUTC.toISO(),
            localLabel: localStart.toFormat("ff"),
          });
        }
        localStart = localStart.plus({ minutes: step });
      }
    }
  }
  return slots;
}

module.exports = { generateSlots };
