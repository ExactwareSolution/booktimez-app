const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Payment = sequelize.define("Payment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: { type: DataTypes.UUID, allowNull: false },
  planId: { type: DataTypes.UUID, allowNull: true },
  businessId: { type: DataTypes.UUID, allowNull: true },
  appointmentId: { type: DataTypes.UUID, allowNull: true },
  provider: {
    type: DataTypes.ENUM("stripe", "razorpay", "other"),
    allowNull: false,
  },
  providerPaymentId: { type: DataTypes.STRING, allowNull: true },
  providerOrderId: { type: DataTypes.STRING, allowNull: true },
  amountCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "usd" },
  status: {
    type: DataTypes.ENUM("pending", "paid", "failed", "cancelled"),
    defaultValue: "pending",
  },
  metadata: { type: DataTypes.JSONB, allowNull: true },
});

module.exports = Payment;
