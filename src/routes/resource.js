const express = require("express");
const router = express.Router();
const ResourceController = require("../controllers/ResourceController");
const { authMiddleware } = require("../middleware/auth");
const { canCreateResource } = require("../middleware/CreateResourceEnfocer");

// Get all resources for a business
router.get(
  "/business/:businessId",
  authMiddleware,
  ResourceController.getResources
);

// Get single resource by ID
router.get("/:id", authMiddleware, ResourceController.getResourceById);

// Create new resource
router.post(
  "/",
  authMiddleware,
  canCreateResource,
  ResourceController.createResource
);

// Update resource
router.put("/:id", authMiddleware, ResourceController.updateResource);

// Delete resource
router.delete("/:id", authMiddleware, ResourceController.deleteResource);

module.exports = router;
