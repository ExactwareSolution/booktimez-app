const { Category } = require("../models");

// Create a new category (Admin only)
async function createCategory(req, res) {
  try {
    const { name, description, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const existing = await Category.findOne({ where: { name } });
    if (existing)
      return res.status(400).json({ error: "Category already exists" });

    const category = await Category.create({
      name: name.trim(),
      description,
      icon: icon || null,
    });
    res.status(201).json(category);
  } catch (err) {
    console.error("createCategory error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

// List all categories (for users to choose)
async function listCategories(req, res) {
  try {
    const categories = await Category.findAll({ order: [["name", "ASC"]] });
    res.json(categories);
  } catch (err) {
    console.error("listCategories error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

// Update category (Admin only)
async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description, icon } = req.body;

    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ error: "Category not found" });

    if (name && name.trim()) category.name = name.trim();
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;

    await category.save();
    res.json(category);
  } catch (err) {
    console.error("updateCategory error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

// Delete category (Admin only)
async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ error: "Category not found" });

    await category.destroy();
    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("deleteCategory error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

// Get single category by ID
async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);

    if (!category) return res.status(404).json({ error: "Category not found" });

    res.json(category);
  } catch (err) {
    console.error("getCategoryById error:", err);
    res.status(500).json({ error: "internal_error" });
  }
}

module.exports = {
  createCategory,
  listCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
