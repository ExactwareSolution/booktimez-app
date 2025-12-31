const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Availability = sequelize.define("Availability", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  businessId: { type: DataTypes.UUID, allowNull: false },
  categoryId: { type: DataTypes.UUID, allowNull: true },
  weekday: { type: DataTypes.INTEGER, allowNull: false },
  startTime: { type: DataTypes.STRING, allowNull: false },
  endTime: { type: DataTypes.STRING, allowNull: false },
  slotDurationMinutes: { type: DataTypes.INTEGER, allowNull: true },
});

module.exports = Availability;
