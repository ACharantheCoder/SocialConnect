const express = require("express");
const mongoose = require("mongoose");
const HelpRequest = require("../models/HelpRequest");
const {
  authMiddleware,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

const allowedTypes = ["blood", "food", "clothing", "medicine"];
const allowedFlairs = ["Urgent", "Help Needed", "Awareness", "Community"];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Every route in this file is Donor-only
router.use(authMiddleware, authorizeRoles("Donor"));

// Browse pending requests (optional filters: type, city, flair)
router.get("/requests", async (req, res) => {
  try {
    const { type, city, flair } = req.query;
    const filter = { status: "pending" };

    if (type) {
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid type filter." });
      }
      filter.type = type;
    }

    if (flair) {
      if (!allowedFlairs.includes(flair)) {
        return res.status(400).json({ message: "Invalid flair filter." });
      }
      filter.flair = flair;
    }

    if (city) {
      filter.city = new RegExp(`^${escapeRegex(city.trim())}$`, "i");
    }

    const requests = await HelpRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name");

    return res.status(200).json({ requests });
  } catch (error) {
    console.error("Donor browse requests error:", error);
    return res.status(500).json({ message: "Failed to fetch requests." });
  }
});

// Accept a pending request (atomic: only one Donor can win)
router.patch("/requests/:id/accept", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid help request ID." });
    }

    const request = await HelpRequest.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        $set: {
          status: "accepted",
          acceptedBy: req.user.userId,
          acceptedAt: new Date(),
        },
      },
      { new: true },
    ).populate("createdBy", "name");

    if (!request) {
      const exists = await HelpRequest.exists({ _id: id });

      if (!exists) {
        return res.status(404).json({ message: "Help request not found." });
      }

      return res.status(409).json({
        message: "This request was already taken or is no longer available.",
      });
    }

    return res.status(200).json({
      message: "Request accepted successfully.",
      request,
    });
  } catch (error) {
    console.error("Donor accept request error:", error);
    return res.status(500).json({ message: "Failed to accept request." });
  }
});

// My accepted / completed requests (optional filter: ?status=accepted|completed)
router.get("/my-requests", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { acceptedBy: req.user.userId };

    if (status) {
      if (!["accepted", "completed"].includes(status)) {
        return res.status(400).json({
          message: "Status must be accepted or completed.",
        });
      }
      filter.status = status;
    } else {
      filter.status = { $in: ["accepted", "completed"] };
    }

    const requests = await HelpRequest.find(filter)
      .sort({ updatedAt: -1 })
      .populate("createdBy", "name");

    return res.status(200).json({ requests });
  } catch (error) {
    console.error("Donor my requests error:", error);
    return res.status(500).json({ message: "Failed to fetch your requests." });
  }
});

// Mark one of my accepted requests as completed
router.patch("/requests/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid help request ID." });
    }

    const request = await HelpRequest.findOneAndUpdate(
      { _id: id, acceptedBy: req.user.userId, status: "accepted" },
      { $set: { status: "completed", completedAt: new Date() } },
      { new: true },
    ).populate("createdBy", "name");

    if (!request) {
      const mine = await HelpRequest.exists({
        _id: id,
        acceptedBy: req.user.userId,
      });

      if (!mine) {
        return res.status(404).json({
          message: "Accepted request not found for your account.",
        });
      }

      return res.status(409).json({
        message: "Only accepted requests can be marked completed.",
      });
    }

    return res.status(200).json({
      message: "Request marked as completed.",
      request,
    });
  } catch (error) {
    console.error("Donor complete request error:", error);
    return res.status(500).json({ message: "Failed to complete request." });
  }
});

module.exports = router;
