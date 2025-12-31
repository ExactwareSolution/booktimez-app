const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BusinessCategory = sequelize.define("BusinessCategory", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  businessId: { type: DataTypes.UUID, allowNull: false },
  categoryId: { type: DataTypes.UUID, allowNull: false },
});

module.exports = BusinessCategory;
