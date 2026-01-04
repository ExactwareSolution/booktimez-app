const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Plan = sequelize.define("Plan", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: { type: DataTypes.STRING, allowNull: false },
  maxBookingsPerMonth: { type: DataTypes.INTEGER, allowNull: true },
  maxCategories: { type: DataTypes.INTEGER, allowNull: true },
  maxResources: { type: DataTypes.INTEGER, allowNull: true },
  languages: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: ["en"] },
  brandingRemoved: { type: DataTypes.BOOLEAN, defaultValue: false },
  notificationsIncluded: { type: DataTypes.BOOLEAN, defaultValue: true },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM("Active", "Inactive"),
    defaultValue: "Active",
  },
});

module.exports = Plan;
