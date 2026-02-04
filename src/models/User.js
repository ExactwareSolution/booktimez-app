const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
// const { resetPassword } = require("../controllers/authController");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: true },
  name: { type: DataTypes.STRING, allowNull: true },
  planId: { type: DataTypes.UUID, allowNull: true },
  planExpiresAt: { type: DataTypes.DATE, allowNull: true },
  googleId: { type: DataTypes.STRING, allowNull: true },
  role: { type: DataTypes.ENUM("owner", "admin"), defaultValue: "owner" },
  resetPasswordToken: { type: DataTypes.STRING, allowNull: true },
  resetPasswordExpires: { type: DataTypes.DATE, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

module.exports = User;
