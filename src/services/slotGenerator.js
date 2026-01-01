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

  const endDate = DateTime.fromISO(endDateISO, {
    zone: businessTz,
  }).endOf("day");

  const category = await Category.findByPk(categoryId);
  if (!category) return [];

  const availabilities = await Availability.findAll({
    where: { businessId, categoryId },
  });

  // 🔹 Fetch all appointments once (IMPORTANT for performance)
  const appointments = await Appointment.findAll({
    where: {
      businessId,
      categoryId,
      status: "booked",
      startAt: {
        [Op.between]: [
          startDate.toUTC().toJSDate(),
          endDate.toUTC().toJSDate(),
        ],
      },
    },
  });

  const slots = [];

  for (let d = startDate; d <= endDate; d = d.plus({ days: 1 })) {
    const weekday = d.weekday % 7; // 0-6

    const dayAvailabilities = availabilities.filter(
      (a) => a.weekday === weekday
    );

    for (const a of dayAvailabilities) {
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

      const duration = a.slotDurationMinutes || category.durationMinutes || 30;

      while (localStart.plus({ minutes: duration }) <= localEnd) {
        const localEndSlot = localStart.plus({ minutes: duration });

        const utcStart = localStart.toUTC();
        const utcEnd = localEndSlot.toUTC();

        const isBooked = appointments.some(
          (appt) =>
            utcStart < DateTime.fromJSDate(appt.endAt) &&
            utcEnd > DateTime.fromJSDate(appt.startAt)
        );

        slots.push({
          start: utcStart.toISO(),
          end: utcEnd.toISO(),
          localLabel: localStart.toFormat("ff"),
          available: !isBooked, // ⭐ KEY
          status: isBooked ? "booked" : "available",
        });

        localStart = localStart.plus({ minutes: duration });
      }
    }
  }

  return slots;
}

module.exports = { generateSlots };
