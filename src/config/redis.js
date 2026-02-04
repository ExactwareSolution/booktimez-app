// src/config/redis.js
const IORedis = require("ioredis");
require("dotenv").config();

const redisConnection = new IORedis(process.env.REDIS_URL, {
  // Required for BullMQ
  maxRetriesPerRequest: null,

  // Upstash specific connection tuning
  connectTimeout: 30000, // Increase to 30 seconds
  keepAlive: 30000,
  family: 4, // Force IPv4 to avoid DNS resolution delays

  tls: {
    // This is the most common fix for ETIMEDOUT on local machines.
    // It prevents the handshake from failing due to local certificate issues.
    rejectUnauthorized: false,
    // Explicitly set the SNI hostname
    servername: "native-seahorse-46731.upstash.io",
  },

  // Better retry strategy for cloud/serverless connections
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
});

redisConnection.on("connect", () =>
  console.log("✅ Redis connected successfully"),
);
redisConnection.on("error", (err) =>
  console.error("❌ Redis Error:", err.message),
);

exports.redisConnection = redisConnection;
