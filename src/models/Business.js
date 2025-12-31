const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Business = sequelize.define("Business", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  ownerId: { type: DataTypes.UUID, allowNull: false },

  name: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  logoUrl: { type: DataTypes.STRING, allowNull: true },

  timezone: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "UTC",
  },

  language: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "en",
  },

  subscriptionStatus: {
    type: DataTypes.ENUM("active", "trial", "past_due", "canceled"),
    defaultValue: "active",
  },
  businessDetails: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: "Stores type-specific data like doctors list, menu, prices",
  },
});

module.exports = Business;
