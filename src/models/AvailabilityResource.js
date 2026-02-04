// models/AvailabilityResource.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Availability = require("./Availability");
const Resource = require("./Resource");

const AvailabilityResource = sequelize.define(
  "AvailabilityResource",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    availabilityId: { type: DataTypes.UUID, allowNull: false },
    resourceId: { type: DataTypes.UUID, allowNull: false },
  },
  { indexes: [{ fields: ["availabilityId"] }, { fields: ["resourceId"] }] },
);



module.exports = AvailabilityResource;
