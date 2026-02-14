// const { Worker } = require("bullmq");
// const { redisConnection } = require("../config/redis.js");
// const { sendBookingEmail } = require("../services/mailer.js");

// const worker = new Worker(
//   "notification-queue",
//   async (job) => {
//     const { to, business, category, appointment } = job.data;

//     if (!to || !business || !category || !appointment) {
//       console.warn(`Job ${job.id} skipped: missing required data`);
//       return; // safe skip
//     }

//     await sendBookingEmail({ to, business, category, appointment });
//   },
//   { connection: redisConnection },
// );


const { Worker } = require("bullmq");
const { redisConnection } = require("../config/redis");
const { sendBookingEmail } = require("../services/mailer");

const worker = new Worker(
  "notification-queue",
  async (job) => {
    const { to, business, category, appointment } = job.data;

    if (!to || !business || !category || !appointment) {
      console.warn(`Job ${job.id} skipped: missing required data`);
      return;
    }

    console.log("📩 Processing email job:", job.id);

    await sendBookingEmail({
      to,
      business,
      category,
      appointment,
    });
  },
  {
    connection: redisConnection,
  }
);

// ✅ lifecycle logs (VERY IMPORTANT)
worker.on("ready", () => {
  console.log("✅ Notification worker ready");
});

worker.on("completed", (job) => {
  console.log(`✅ Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job failed: ${job?.id}`, err);
});

module.exports = worker;