const { sequelize, Plan } = require("./models");

async function seed() {
  await sequelize.sync();
  const count = await Plan.count().catch(() => 0);
  if (!count) {
    await Plan.bulkCreate([
      {
        name: "Free",
        monthlyPriceCents: 0,
        maxBookingsPerMonth: 30,
        maxCategories: 1,
        languages: ["en"],
        brandingRemoved: false,
        notificationsIncluded: false,
      },
      {
        name: "Standard",
        monthlyPriceCents: 900,
        maxBookingsPerMonth: 100,
        maxCategories: 10,
        languages: ["en", "hi"],
        brandingRemoved: false,
        notificationsIncluded: true,
      },
      {
        name: "Pro",
        monthlyPriceCents: 1900,
        maxBookingsPerMonth: 1000,
        maxCategories: 50,
        languages: ["en", "hi", "ar"],
        brandingRemoved: true,
        notificationsIncluded: true,
      },
    ]);
    console.log("Seeded default plans");
  }
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
