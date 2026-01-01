require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { sequelize, Plan } = require("./models");

const authRoutes = require("./routes/auth");
const businessRoutes = require("./routes/business");
const publicRoutes = require("./routes/public");
const plansRoutes = require("./routes/plans");
const categoryRoutes = require("./routes/category");

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(bodyParser.json());

app.use((req, res, next) => {
  const host = req.headers.host || "";
  const cleanHost = host.split(":")[0]; // remove port
  const parts = cleanHost.split(".");
  req.subdomain = parts.length > 2 ? parts[0] : null;
  next();
});

// Serve uploaded files (logos)
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/b/:slug", async (req, res) => {
  try {
    const { Business } = require("./models");
    const { slug } = req.params;

    const business = await Business.findOne({ where: { slug } });
    if (!business) return res.status(404).send("Not found");

    const protocol = process.env.APP_PROTOCOL || "http";
    const port =
      protocol === "http" ? `:${process.env.APP_FRONTEND_PORT || 5173}` : "";
    const domain = process.env.APP_ROOT_DOMAIN || "booktimez.com";

    const target = `${protocol}://${slug}.${domain}${port}/booking`;

    return res.redirect(target);
  } catch (err) {
    console.error(err);
    return res.status(500).send("internal_error");
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/categories", categoryRoutes);

app.get("/", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;

async function start() {
  await sequelize.authenticate();
  // sync models (MVP). For production use migrations.
  // During development, use `alter: true` to apply model changes to the DB schema.
  await sequelize.sync({ alter: true });
  console.log("Database schema synchronized (alter: true)");

  // seed plans if empty
  // const count = await Plan.count().catch(() => 0);
  // if (!count) {
  //   await Plan.bulkCreate([
  //     {
  //       code: "free",
  //       name: "Free",
  //       monthlyPriceCents: 0,
  //       maxBookingsPerMonth: 30,
  //       maxCategories: 1,
  //       languages: ["en"],
  //       brandingRemoved: false,
  //       notificationsIncluded: false,
  //     },
  //     {
  //       code: "standard",
  //       name: "Standard",
  //       monthlyPriceCents: 900,
  //       maxBookingsPerMonth: 100,
  //       maxCategories: 10,
  //       languages: ["en", "hi"],
  //       brandingRemoved: false,
  //       notificationsIncluded: true,
  //     },
  //     {
  //       code: "pro",
  //       name: "Pro",
  //       monthlyPriceCents: 1900,
  //       maxBookingsPerMonth: 1000,
  //       maxCategories: 50,
  //       languages: ["en", "hi", "ar"],
  //       brandingRemoved: true,
  //       notificationsIncluded: true,
  //     },
  //   ]);
  //   console.log("Seeded default plans");
  // }

  app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start server — detailed error follows:");
  if (err && err.stack) console.error(err.stack);
  else console.error(err);

  // Helpful diagnostics for common DB/connect issues
  console.error("\nDiagnostic hints:");
  console.error("- Ensure your database is running and reachable");
  console.error(
    "- Check env vars: DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD"
  );
  console.error(
    "- Example: export DATABASE_URL=postgres://user:pass@localhost:5432/booktimez"
  );

  // Print a short summary of DB env vars (do not print passwords)
  try {
    console.error(
      `DB_HOST=${process.env.DB_HOST || "(none)"} DB_PORT=${
        process.env.DB_PORT || "5432"
      } DB_NAME=${process.env.DB_NAME || "(none)"} DATABASE_URL=${
        process.env.DATABASE_URL ? "(set)" : "(unset)"
      }`
    );
  } catch (e) {}

  process.exit(1);
});
