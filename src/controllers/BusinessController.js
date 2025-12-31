const { Business, Category } = require("../models");
const slugify = require("slugify");
const { v4: uuid } = require("uuid");

/* =========================================================
   CREATE BUSINESS
========================================================= */
async function createBusiness(req, res) {
  try {
    const userId = req.user.userId;

    let {
      name,
      slug,
      timezone = "UTC",
      language = "en",
      categoryIds = [],
      businessDetails = {},
    } = req.body;

    // Parse categoryIds
    if (typeof categoryIds === "string") {
      try {
        categoryIds = JSON.parse(categoryIds);
      } catch {
        categoryIds = categoryIds
          ? categoryIds.split(",").map((s) => s.trim())
          : [];
      }
    }

    // Parse JSONB
    if (typeof businessDetails === "string") {
      businessDetails = JSON.parse(businessDetails);
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    // Slug generation
    let businessSlug = slug ? slugify(slug) : slugify(name);
    let exists = await Business.findOne({ where: { slug: businessSlug } });
    let i = 1;
    while (exists) {
      businessSlug = `${slugify(name)}-${i++}`;
      exists = await Business.findOne({ where: { slug: businessSlug } });
    }

    const payload = {
      ownerId: userId,
      name: name.trim(),
      slug: businessSlug,
      timezone,
      language,
      businessDetails,
    };

    // Logo upload
    if (req.file) {
      const baseUrl =
        process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
      payload.logoUrl = `${baseUrl}/uploads/${req.file.filename}`;
    } else if (req.body.logoUrl) {
      payload.logoUrl = req.body.logoUrl;
    }

    const business = await Business.create(payload);

    if (categoryIds.length > 0) {
      const categories = await Category.findAll({
        where: { id: categoryIds },
      });
      await business.setCategories(categories);
    }

    res.status(201).json(business);
  } catch (err) {
    console.error("createBusiness error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

/* =========================================================
   LIST BUSINESSES
========================================================= */
async function listBusinesses(req, res) {
  const userId = req.user.userId;

  const businesses = await Business.findAll({
    where: { ownerId: userId },
    include: { model: Category, through: { attributes: [] } },
  });

  res.json(businesses);
}

/* =========================================================
   GET SINGLE BUSINESS
========================================================= */
async function getBusiness(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;

  const business = await Business.findOne({
    where: { id, ownerId: userId },
    include: { model: Category, through: { attributes: [] } },
  });

  if (!business) {
    return res.status(404).json({ error: "Business not found" });
  }

  res.json(business);
}

/* =========================================================
   UPDATE BUSINESS (BASIC FIELDS)
========================================================= */
async function updateBusiness(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;

  const business = await Business.findOne({
    where: { id, ownerId: userId },
  });

  if (!business) {
    return res.status(404).json({ error: "Business not found" });
  }

  let { name, timezone, language, slug, categoryIds } = req.body;

  if (name) business.name = name;
  if (timezone) business.timezone = timezone;
  if (language) business.language = language;
  if (slug) business.slug = slugify(slug);

  if (req.file) {
    const baseUrl =
      process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
    business.logoUrl = `${baseUrl}/uploads/${req.file.filename}`;
  }

  await business.save();

  if (categoryIds) {
    if (typeof categoryIds === "string") {
      categoryIds = JSON.parse(categoryIds);
    }

    const categories = await Category.findAll({
      where: { id: categoryIds },
    });
    await business.setCategories(categories);
  }

  const updated = await Business.findByPk(id, {
    include: { model: Category, through: { attributes: [] } },
  });

  res.json(updated);
}

/* =========================================================
   REPLACE FULL JSONB
========================================================= */
async function replaceBusinessDetails(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;

  const business = await Business.findOne({
    where: { id, ownerId: userId },
  });

  if (!business) {
    return res.status(404).json({ error: "Business not found" });
  }

  let details = req.body;
  if (typeof details === "string") details = JSON.parse(details);

  business.businessDetails = details;
  await business.save();

  res.json(business);
}

/* =========================================================
   PATCH JSONB (MERGE)
========================================================= */
async function patchBusinessDetails(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;

  const business = await Business.findOne({
    where: { id, ownerId: userId },
  });

  if (!business) {
    return res.status(404).json({ error: "Business not found" });
  }

  let patch = req.body;
  if (typeof patch === "string") patch = JSON.parse(patch);

  business.businessDetails = {
    ...business.businessDetails,
    ...patch,
  };

  await business.save();
  res.json(business);
}

/* =========================================================
   ADD ITEM TO ANY SECTION
========================================================= */
async function addItem(req, res) {
  const { id, section } = req.params;
  const userId = req.user.userId;

  const business = await Business.findOne({
    where: { id, ownerId: userId },
  });

  if (!business) {
    return res.status(404).json({ error: "Business not found" });
  }

  const details = business.businessDetails || {};
  details[section] = details[section] || [];

  const item = {
    id: uuid(),
    ...req.body,
  };

  details[section].push(item);

  business.businessDetails = details;
  await business.save();

  res.json({ section, item });
}

/* =========================================================
   UPDATE ITEM IN ANY SECTION
========================================================= */
async function updateItem(req, res) {
  const { id, section, itemId } = req.params;
  const userId = req.user.userId;

  const business = await Business.findOne({
    where: { id, ownerId: userId },
  });

  if (!business) {
    return res.status(404).json({ error: "Business not found" });
  }

  const details = business.businessDetails || {};
  const items = details[section];

  if (!Array.isArray(items)) {
    return res.status(404).json({ error: "Section not found" });
  }

  const index = items.findIndex((i) => i.id === itemId);
  if (index === -1) {
    return res.status(404).json({ error: "Item not found" });
  }

  items[index] = { ...items[index], ...req.body };

  business.businessDetails = details;
  await business.save();

  res.json({ section, item: items[index] });
}

/* =========================================================
   DELETE ITEM
========================================================= */
async function deleteItem(req, res) {
  const { id, section, itemId } = req.params;
  const userId = req.user.userId;

  const business = await Business.findOne({
    where: { id, ownerId: userId },
  });

  if (!business) {
    return res.status(404).json({ error: "Business not found" });
  }

  const details = business.businessDetails || {};
  if (!Array.isArray(details[section])) {
    return res.status(404).json({ error: "Section not found" });
  }

  details[section] = details[section].filter((i) => i.id !== itemId);

  business.businessDetails = details;
  await business.save();

  res.json({ message: "Item deleted", section });
}

/* =========================================================
   DELETE BUSINESS
========================================================= */
async function deleteBusiness(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;

  const business = await Business.findOne({
    where: { id, ownerId: userId },
  });

  if (!business) {
    return res.status(404).json({ error: "Business not found" });
  }

  await business.destroy();
  res.json({ message: "Business deleted" });
}

module.exports = {
  createBusiness,
  listBusinesses,
  getBusiness,
  updateBusiness,
  deleteBusiness,
  replaceBusinessDetails,
  patchBusinessDetails,
  addItem,
  updateItem,
  deleteItem,
};
