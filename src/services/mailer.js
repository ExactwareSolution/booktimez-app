const nodemailer = require("nodemailer");
const { generateICS } = require("./calendar");

/**
 * Create a Nodemailer transporter
 */
function createTransporter() {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    throw new Error("SMTP configuration missing in environment variables");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false otherwise
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send booking email with ICS and cancel link
 * @param {Object} params
 * @param {string} params.to - customer email
 * @param {Object} params.business
 * @param {Object} params.category
 * @param {Object} params.appointment
 */
async function sendBookingEmail({ to, business, category, appointment }) {
  if (!to || !business || !category || !appointment) {
    console.warn("sendBookingEmail skipped: missing required data");
    return;
  }

  try {
    const transporter = createTransporter();

    const start = new Date(appointment.startAt).toLocaleString();
    const end = new Date(appointment.endAt).toLocaleString();

    const ics = generateICS({ appointment, business, category });

    // Generate cancel URL
    const cancelUrl = `${process.env.FRONTEND_BASE_URL}/cancel/${appointment.cancelToken}`;

    await transporter.sendMail({
      from: `"${business.name}" <${
        process.env.SMTP_FROM || process.env.SMTP_USER
      }>`,
      to,
      subject: `Booking Confirmed – ${business.name}`,
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>Booking Confirmed ✅</h2>
          <p>Hi <strong>${appointment.customerName}</strong>,</p>

          <p>Your appointment has been successfully booked.</p>

          <table cellpadding="6">
            <tr><td><strong>Business</strong></td><td>${business.name}</td></tr>
            <tr><td><strong>Service</strong></td><td>${category.name}</td></tr>
            <tr><td><strong>Start</strong></td><td>${start}</td></tr>
            <tr><td><strong>End</strong></td><td>${end}</td></tr>
            <tr><td><strong>Reference</strong></td><td>${appointment.referenceNumber}</td></tr>

          </table>

          <p>If you need to cancel your appointment, click the link below:</p>
          <p><a href="${cancelUrl}">Cancel Appointment</a></p>

          <p>Thank you for booking with us.</p>
        </div>
      `,
      attachments: [
        {
          filename: "booking.ics",
          content: ics,
          contentType: "text/calendar",
        },
      ],
    });

    console.log(`Booking email sent to ${to} with cancel link`);
  } catch (err) {
    console.error("sendBookingEmail error:", err);
  }
}

module.exports = { sendBookingEmail };
