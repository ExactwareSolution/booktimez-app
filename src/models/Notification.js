const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Notification = sequelize.define("Notification", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  appointmentId: { type: DataTypes.UUID, allowNull: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  type: {
    type: DataTypes.ENUM("confirmation", "reminder", "cancellation"),
    allowNull: false,
  },
  payload: { type: DataTypes.JSONB, allowNull: true },
  sentAt: { type: DataTypes.DATE, allowNull: true },
  status: {
    type: DataTypes.ENUM("pending", "sent", "failed"),
    defaultValue: "pending",
  },
  attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
});

module.exports = Notification;
