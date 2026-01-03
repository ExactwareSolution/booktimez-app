const sequelize = require("../config/db");

// Models
const User = require("./User");
const Plan = require("./Plan");
const Business = require("./Business");
const Category = require("./Category");
const Availability = require("./Availability");
const Appointment = require("./Appointment");
const Notification = require("./Notification");
const BusinessCategory = require("./BusinessCategory");
const Payment = require("./Payment");
const Resource = require("./Resource"); // ✅ NEW

// --------------------
// Model Relationships
// --------------------

// USER ↔ BUSINESS
User.hasMany(Business, { foreignKey: "ownerId" });
Business.belongsTo(User, { foreignKey: "ownerId" });

// USER ↔ PLAN
User.belongsTo(Plan, { foreignKey: "planId" });
Plan.hasMany(User, { foreignKey: "planId" });

// BUSINESS ↔ CATEGORY (Many-to-Many)
Business.belongsToMany(Category, {
  through: BusinessCategory,
  foreignKey: "businessId",
});
Category.belongsToMany(Business, {
  through: BusinessCategory,
  foreignKey: "categoryId",
});

// BUSINESS ↔ AVAILABILITY
Business.hasMany(Availability, { foreignKey: "businessId" });
Availability.belongsTo(Business, { foreignKey: "businessId" });

// CATEGORY ↔ AVAILABILITY
Category.hasMany(Availability, { foreignKey: "categoryId" });
Availability.belongsTo(Category, { foreignKey: "categoryId" });

// BUSINESS ↔ APPOINTMENT
Business.hasMany(Appointment, { foreignKey: "businessId" });
Appointment.belongsTo(Business, { foreignKey: "businessId" });

// CATEGORY ↔ APPOINTMENT
Category.hasMany(Appointment, { foreignKey: "categoryId" });
Appointment.belongsTo(Category, { foreignKey: "categoryId" });

// USER ↔ APPOINTMENT
Appointment.belongsTo(User, { foreignKey: "userId" });

// RESOURCE ↔ APPOINTMENT
Resource.hasMany(Appointment, { foreignKey: "resourceId" });
Appointment.belongsTo(Resource, { foreignKey: "resourceId" });

// BUSINESS ↔ RESOURCE
Business.hasMany(Resource, { foreignKey: "businessId" });
Resource.belongsTo(Business, { foreignKey: "businessId" });

// APPOINTMENT ↔ NOTIFICATION
Appointment.hasMany(Notification, { foreignKey: "appointmentId" });
Notification.belongsTo(Appointment, { foreignKey: "appointmentId" });

// BUSINESS ↔ NOTIFICATION
Business.hasMany(Notification, { foreignKey: "businessId" });
Notification.belongsTo(Business, { foreignKey: "businessId" });

// USER ↔ PAYMENT
User.hasMany(Payment, { foreignKey: "userId" });
Payment.belongsTo(User, { foreignKey: "userId" });

// PLAN ↔ PAYMENT
Plan.hasMany(Payment, { foreignKey: "planId" });
Payment.belongsTo(Plan, { foreignKey: "planId" });

// BUSINESS ↔ PAYMENT (optional)
Business.hasMany(Payment, { foreignKey: "businessId" });
Payment.belongsTo(Business, { foreignKey: "businessId" });

// USER ↔ PLAN
User.belongsTo(Plan, {
  foreignKey: "planId",
  as: "plan",
});

Plan.hasMany(User, {
  foreignKey: "planId",
  as: "users",
});

// --------------------
// EXPORT
// --------------------
module.exports = {
  sequelize,
  User,
  Plan,
  Business,
  Category,
  BusinessCategory,
  Availability,
  Appointment,
  Notification,
  Payment,
  Resource, // ✅ NEW
};
