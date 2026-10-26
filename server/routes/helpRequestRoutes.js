const express = require("express");
const HelpRequest = require("../models/HelpRequest");
const {
  authMiddleware,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

const allowedFlairs = ["Urgent", "Help Needed", "Awareness", "Community"];

// Create a help request
router.post(
  "/",
  authMiddleware,
  authorizeRoles("Citizen"),
  async (req, res) => {
    try {
      const { title, description, type, city, quantity, flair } = req.body;

      if (!title || !type || !city) {
        return res.status(400).json({
          message: "Title, type, and city are required.",
        });
      }

      if (flair !== undefined && !allowedFlairs.includes(flair)) {
        return res.status(400).json({ message: "Invalid flair." });
      }

      const helpRequest = await HelpRequest.create({
        createdBy: req.user.userId,
        title,
        description,
        type,
        city,
        quantity,
        flair: flair || "Help Needed",
      });

      return res.status(201).json({
        message: "Help request created successfully.",
        helpRequest,
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).json({ message: error.message });
      }

      console.error("Create help request error:", error);

      return res.status(500).json({
        message: "Failed to create help request.",
      });
    }
  },
);

// Get all requests belonging to the logged-in Citizen
router.get("/", authMiddleware, authorizeRoles("Citizen"), async (req, res) => {
  try {
    const requests = await HelpRequest.find({
      createdBy: req.user.userId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({ requests });
  } catch (error) {
    console.error("Fetch help requests error:", error);

    return res.status(500).json({
      message: "Failed to fetch help requests.",
    });
  }
});

// Get one request belonging to the logged-in Citizen
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("Citizen"),
  async (req, res) => {
    try {
      const request = await HelpRequest.findOne({
        _id: req.params.id,
        createdBy: req.user.userId,
      });

      if (!request) {
        return res.status(404).json({
          message: "Help request not found.",
        });
      }

      return res.status(200).json({ request });
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid help request ID.",
        });
      }

      console.error("Fetch single help request error:", error);

      return res.status(500).json({
        message: "Failed to fetch help request.",
      });
    }
  },
);

// Edit a pending request
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("Citizen"),
  async (req, res) => {
    try {
      const { title, description, type, city, quantity, flair } = req.body;

      const updates = {};

      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (type !== undefined) updates.type = type;
      if (city !== undefined) updates.city = city;
      if (quantity !== undefined) updates.quantity = quantity;

      if (flair !== undefined) {
        if (!allowedFlairs.includes(flair)) {
          return res.status(400).json({ message: "Invalid flair." });
        }

        updates.flair = flair;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          message: "Provide at least one field to update.",
        });
      }

      const request = await HelpRequest.findOne({
        _id: req.params.id,
        createdBy: req.user.userId,
      });

      if (!request) {
        return res.status(404).json({
          message: "Help request not found.",
        });
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          message: "Only pending requests can be edited.",
        });
      }

      Object.assign(request, updates);
      await request.save();

      return res.status(200).json({
        message: "Help request updated successfully.",
        request,
      });
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid help request ID.",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: error.message,
        });
      }

      console.error("Update help request error:", error);

      return res.status(500).json({
        message: "Failed to update help request.",
      });
    }
  },
);

// Cancel a pending request
router.patch(
  "/:id/cancel",
  authMiddleware,
  authorizeRoles("Citizen"),
  async (req, res) => {
    try {
      const request = await HelpRequest.findOne({
        _id: req.params.id,
        createdBy: req.user.userId,
      });

      if (!request) {
        return res.status(404).json({
          message: "Help request not found.",
        });
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          message: "Only pending requests can be cancelled.",
        });
      }

      request.status = "cancelled";
      await request.save();

      return res.status(200).json({
        message: "Help request cancelled successfully.",
        request,
      });
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid help request ID.",
        });
      }

      console.error("Cancel help request error:", error);

      return res.status(500).json({
        message: "Failed to cancel help request.",
      });
    }
  },
);

module.exports = router;
