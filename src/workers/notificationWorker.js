const { Worker } = require("bullmq");
const { redisConnection } = require("../config/redis.js");
const { sendBookingEmail } = require("../services/mailer.js");

const worker = new Worker(
  "notification-queue",
  async (job) => {
    const { to, business, category, appointment } = job.data;

    if (!to || !business || !category || !appointment) {
      console.warn(`Job ${job.id} skipped: missing required data`);
      return; // safe skip
    }

    await sendBookingEmail({ to, business, category, appointment });
  },
  { connection: redisConnection },
);
