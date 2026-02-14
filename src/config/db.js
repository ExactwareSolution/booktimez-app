const { Sequelize } = require("sequelize");
require("dotenv").config();

const databaseUrl = process.env.DATABASE_URL || null;

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      logging: false,
      dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    })
  : new Sequelize(
      process.env.DB_NAME || "bookingtimez_db",
      process.env.DB_USER || "postgres",
      process.env.DB_PASSWORD || "test123",
      {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
        dialect: "postgres",
        logging: false,
      }
    );

module.exports = sequelize;
