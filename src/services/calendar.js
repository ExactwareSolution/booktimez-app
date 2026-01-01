function generateICS({ appointment, business, category }) {
  const start = new Date(appointment.startAt)
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0];

  const end = new Date(appointment.endAt)
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0];

  return `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BookingTimez//EN
BEGIN:VEVENT
UID:${appointment.id}
DTSTAMP:${start}Z
DTSTART:${start}Z
DTEND:${end}Z
SUMMARY:${category.name} @ ${business.name} (Ref: ${appointment.referenceNumber})
DESCRIPTION:Booking Reference: ${appointment.referenceNumber}\n
LOCATION:${business.name}
END:VEVENT
END:VCALENDAR
`.trim();
}

module.exports = { generateICS };
