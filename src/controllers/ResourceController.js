const { Resource, Availability } = require("../models");

// Get all resources for a business
exports.getResources = async (req, res) => {
  const { businessId } = req.params;
  try {
    const resources = await Resource.findAll({
      where: { businessId },
      include: [
        {
          model: Availability,
          as: "availabilities",
          // optional: you can include Category if you want
          // include: [{ model: Category }]
        },
      ],
      order: [["name", "ASC"]], // optional: sort by name
    });
    res.json(resources);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
};

// Get a single resource by ID
exports.getResourceById = async (req, res) => {
  const { id } = req.params;
  try {
    const resource = await Resource.findByPk(id);
    if (!resource) return res.status(404).json({ error: "Resource not found" });
    res.json(resource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch resource" });
  }
};

// Create a new resource
exports.createResource = async (req, res) => {
  const { businessId, name, type } = req.body;
  if (!businessId || !name)
    return res.status(400).json({ error: "businessId and name are required" });

  try {
    const resource = await Resource.create({ businessId, name, type });
    res.status(201).json(resource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create resource" });
  }
};

// Update a resource
exports.updateResource = async (req, res) => {
  const { id } = req.params;
  const { name, type } = req.body;

  try {
    const resource = await Resource.findByPk(id);
    if (!resource) return res.status(404).json({ error: "Resource not found" });

    resource.name = name || resource.name;
    resource.type = type !== undefined ? type : resource.type;
    await resource.save();

    res.json(resource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update resource" });
  }
};

// Delete a resource
exports.deleteResource = async (req, res) => {
  const { id } = req.params;
  try {
    const resource = await Resource.findByPk(id);
    if (!resource) return res.status(404).json({ error: "Resource not found" });

    await resource.destroy();
    res.json({ message: "Resource deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete resource" });
  }
};
