const { Availability, Resource, Appointment, Category } = require("../models");
const { DateTime } = require("luxon");
const { Op } = require("sequelize");
const { toIana } = require("../utils/timezone");

async function generateSlots({
  businessId,
  categoryId,
  startDateISO,
  endDateISO,
  businessTz,
}) {
  const ianaZone = toIana(businessTz);

  const startDate = DateTime.fromISO(startDateISO, { zone: ianaZone });
  const endDate = DateTime.fromISO(endDateISO, { zone: ianaZone });

  if (!startDate.isValid || !endDate.isValid) {
    throw new Error("Invalid startDateISO or endDateISO");
  }

  const start = startDate.startOf("day");
  const end = endDate.endOf("day");

  const category = await Category.findByPk(categoryId);
  if (!category) return [];

  const availabilities = await Availability.findAll({
    where: { businessId, categoryId },
  });

  const resources = await Resource.findAll({ where: { businessId } });
  const totalResources = resources.length;
  if (!totalResources) return [];

  const appointments = await Appointment.findAll({
    where: {
      businessId,
      categoryId,
      status: "booked",
      startAt: {
        [Op.between]: [start.toUTC().toJSDate(), end.toUTC().toJSDate()],
      },
    },
  });

  const formatKey = (dt) => dt.toFormat("yyyy-MM-dd'T'HH:mm");
  const bookedMap = {};

  for (const appt of appointments) {
    const key = formatKey(DateTime.fromJSDate(appt.startAt).setZone(ianaZone));
    if (!bookedMap[key]) bookedMap[key] = new Set();
    bookedMap[key].add(appt.resourceId);
  }

  const slots = [];
  for (let d = start; d <= end; d = d.plus({ days: 1 })) {
    const weekday = d.weekday % 7;
    const dayAvailabilities = availabilities.filter(
      (a) => a.weekday === weekday,
    );

    for (const a of dayAvailabilities) {
      const [sh, sm] = a.startTime.split(":").map(Number);
      const [eh, em] = a.endTime.split(":").map(Number);
      const duration = a.slotDurationMinutes || category.durationMinutes || 30;

      let localStart = d.set({ hour: sh, minute: sm, second: 0 });
      const localEnd = d.set({ hour: eh, minute: em, second: 0 });

      while (localStart.plus({ minutes: duration }) <= localEnd) {
        const localEndSlot = localStart.plus({ minutes: duration });
        const key = formatKey(localStart);
        const bookedCount = bookedMap[key]?.size || 0;

        slots.push({
          start: localStart.toUTC().toISO(),
          end: localEndSlot.toUTC().toISO(),
          localLabel: localStart.toFormat("HH:mm"),
          totalResources,
          bookedCount,
          availableCount: Math.max(0, totalResources - bookedCount),
          available: bookedCount < totalResources,
          status: bookedCount < totalResources ? "available" : "fully_booked",
        });

        localStart = localStart.plus({ minutes: duration });
      }
    }
  }

  return slots;
}

module.exports = { generateSlots };
