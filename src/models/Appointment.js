const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Appointment = sequelize.define(
  "Appointment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    businessId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    startAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    endAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    customerEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    customerPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("booked", "cancelled", "completed"),
      defaultValue: "booked",
    },

    timezoneAtBooking: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    cancelToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    referenceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  // Appointment model

  {
    indexes: [
      {
        unique: true,
        fields: ["businessId", "categoryId", "startAt"],
        name: "unique_business_category_start",
      },
      {
        unique: true,
        fields: ["businessId", "referenceNumber"], // unique per business
      },
    ],
  }
);

module.exports = Appointment;
