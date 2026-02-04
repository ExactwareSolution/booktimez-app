const { Queue } = require("bullmq");
const { redisConnection } = require("../config/redis.js");

exports.notificationQueue = new Queue("notification-queue", {
  connection: redisConnection,
});
