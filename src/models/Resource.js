const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Resource = sequelize.define(
  "Resource",
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true, // optional: barber, doctor, room, etc.
    },
  },
  {
    indexes: [
      {
        name: "idx_resource_business",
        fields: ["businessId"],
      },
    ],
  }
);

module.exports = Resource;
