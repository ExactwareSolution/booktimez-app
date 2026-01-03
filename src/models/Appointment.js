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

    resourceId: {
      type: DataTypes.UUID,
      allowNull: false, // each appointment is assigned to a resource
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
  {
    indexes: [
      // Unique reference number per business
      {
        unique: true,
        fields: ["businessId", "referenceNumber"],
      },

      // Optimized for overlapping appointment checks
      {
        name: "idx_appointment_business_resource_time",
        fields: ["businessId", "resourceId", "startAt", "endAt"],
      },

      // Optimized for filtering by category & status (available/booked)
      {
        name: "idx_appointment_business_category_status",
        fields: ["businessId", "categoryId", "status"],
      },

      // Optimized for slot generation queries
      {
        name: "idx_appointment_business_start_end",
        fields: ["businessId", "startAt", "endAt"],
      },
    ],
  }
);

module.exports = Appointment;
