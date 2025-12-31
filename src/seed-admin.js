const bcrypt = require("bcryptjs");
const { sequelize, User } = require("./models");

async function seedAdmin() {
  try {
    await sequelize.sync();

    // Check if any admin exists
    const adminExists = await User.findOne({ where: { role: "admin" } });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("Admin@123", 10);

      await User.create({
        email: "admin@btz.com",
        password: hashedPassword,
        name: "Super Admin",
        role: "admin",
      });

      console.log("✅ Admin user created successfully");
    } else {
      console.log("ℹ️ Admin already exists. Skipping...");
    }
  } catch (error) {
    console.error("❌ Failed to seed admin:", error);
  } finally {
    process.exit(0);
  }
}

seedAdmin();
