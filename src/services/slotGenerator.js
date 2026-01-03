// const { Availability, Resource, Appointment, Category } = require("../models");
// const { DateTime } = require("luxon");
// const { Op } = require("sequelize");

// /**
//  * Generate slots for a business, category, and date range
//  * Returns slots grouped per resource
//  */
// async function generateSlots({
//   businessId,
//   categoryId,
//   startDateISO,
//   endDateISO,
//   businessTz,
// }) {
//   const startDate = DateTime.fromISO(startDateISO, {
//     zone: businessTz,
//   }).startOf("day");
//   const endDate = DateTime.fromISO(endDateISO, { zone: businessTz }).endOf(
//     "day"
//   );

//   const category = await Category.findByPk(categoryId);
//   if (!category) return [];

//   const availabilities = await Availability.findAll({
//     where: { businessId, categoryId },
//   });
//   const resources = await Resource.findAll({ where: { businessId } });
//   if (!resources.length) return [];

//   const appointments = await Appointment.findAll({
//     where: {
//       businessId,
//       categoryId,
//       status: "booked",
//       startAt: {
//         [Op.between]: [
//           startDate.toUTC().toJSDate(),
//           endDate.toUTC().toJSDate(),
//         ],
//       },
//     },
//   });

//   const slots = [];

//   for (let d = startDate; d <= endDate; d = d.plus({ days: 1 })) {
//     const weekday = d.weekday % 7;
//     const dayAvailabilities = availabilities.filter(
//       (a) => a.weekday === weekday
//     );

//     for (const a of dayAvailabilities) {
//       const [sh, sm] = a.startTime.split(":").map(Number);
//       const [eh, em] = a.endTime.split(":").map(Number);
//       const duration = a.slotDurationMinutes || category.durationMinutes || 30;

//       let localStart = d.set({
//         hour: sh,
//         minute: sm,
//         second: 0,
//         millisecond: 0,
//       });
//       const localEnd = d.set({
//         hour: eh,
//         minute: em,
//         second: 0,
//         millisecond: 0,
//       });

//       while (localStart.plus({ minutes: duration }) <= localEnd) {
//         const localEndSlot = localStart.plus({ minutes: duration });
//         const utcStart = localStart.toUTC();
//         const utcEnd = localEndSlot.toUTC();

//         for (const r of resources) {
//           const isBooked = appointments.some(
//             (a) =>
//               a.resourceId === r.id &&
//               utcStart < DateTime.fromJSDate(a.endAt) &&
//               utcEnd > DateTime.fromJSDate(a.startAt)
//           );
//           slots.push({
//             resourceId: r.id,
//             resourceName: r.name,
//             start: utcStart.toISO(),
//             end: utcEnd.toISO(),
//             localLabel: localStart.toFormat("ff"),
//             available: !isBooked,
//             status: isBooked ? "booked" : "available",
//           });
//         }
//         localStart = localStart.plus({ minutes: duration });
//       }
//     }
//   }

//   return slots;
// }

// module.exports = { generateSlots };

const { Availability, Resource, Appointment, Category } = require("../models");
const { DateTime } = require("luxon");
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
        [Op.between]: [
          startDate.toUTC().toJSDate(),
          endDate.toUTC().toJSDate(),
        ],
      },
    },
  });

  /** 🔑 Helper: format a DateTime as key (minute precision) */
  const formatKey = (dt) => dt.toFormat("yyyy-MM-dd'T'HH:mm");

  /** 🔑 Index appointments by start time */
  const bookedMap = {};
  for (const appt of appointments) {
    const key = formatKey(
      DateTime.fromJSDate(appt.startAt).setZone(businessTz)
    );
    if (!bookedMap[key]) bookedMap[key] = new Set();
    bookedMap[key].add(appt.resourceId);
  }

  /** ✅ FINAL RESULT: one slot per TIME */
  const slots = [];

  for (let d = startDate; d <= endDate; d = d.plus({ days: 1 })) {
    const weekday = d.weekday % 7;

    const dayAvailabilities = availabilities.filter(
      (a) => a.weekday === weekday
    );

    for (const a of dayAvailabilities) {
      const [sh, sm] = a.startTime.split(":").map(Number);
      const [eh, em] = a.endTime.split(":").map(Number);

      const duration = a.slotDurationMinutes || category.durationMinutes || 30;

      let localStart = d.set({ hour: sh, minute: sm, second: 0 });
      const localEnd = d.set({ hour: eh, minute: em, second: 0 });

      while (localStart.plus({ minutes: duration }) <= localEnd) {
        const localEndSlot = localStart.plus({ minutes: duration });

        const key = formatKey(localStart); // 🔑 Use normalized key
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
