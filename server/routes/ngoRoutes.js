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

// All routes in this file are restricted to NGOs.
router.use(authMiddleware, authorizeRoles("NGO"));

// 1. Get dashboard statistics.
router.get("/stats", async (req, res) => {
  try {
    const [pendingByType, accepted, completed] = await Promise.all([
      HelpRequest.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),

      HelpRequest.countDocuments({
        acceptedBy: req.user.userId,
        status: "accepted",
      }),

      HelpRequest.countDocuments({
        acceptedBy: req.user.userId,
        status: "completed",
      }),
    ]);

    const pending = {
      blood: 0,
      food: 0,
      clothing: 0,
      medicine: 0,
      total: 0,
    };

    pendingByType.forEach((item) => {
      pending[item._id] = item.count;
      pending.total += item.count;
    });

    return res.status(200).json({
      pending,
      mine: { accepted, completed },
    });
  } catch (error) {
    console.error("NGO stats error:", error);
    return res.status(500).json({
      message: "Failed to fetch stats.",
    });
  }
});

// 2. Browse pending requests with optional filters.
router.get("/requests", async (req, res) => {
  try {
    const { type, city, flair } = req.query;
    const filter = { status: "pending" };

    if (type) {
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          message: "Invalid type filter.",
        });
      }

      filter.type = type;
    }

    if (flair) {
      if (!allowedFlairs.includes(flair)) {
        return res.status(400).json({
          message: "Invalid flair filter.",
        });
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
    console.error("NGO browse requests error:", error);
    return res.status(500).json({
      message: "Failed to fetch requests.",
    });
  }
});

// 3. Accept a pending request.
router.patch("/requests/:id/accept", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid help request ID.",
      });
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
      { new: true, runValidators: true },
    ).populate("createdBy", "name");

    if (!request) {
      const exists = await HelpRequest.exists({ _id: id });

      if (!exists) {
        return res.status(404).json({
          message: "Help request not found.",
        });
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
    console.error("NGO accept request error:", error);
    return res.status(500).json({
      message: "Failed to accept request.",
    });
  }
});

// 4. View this NGO's accepted and completed requests.
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
    console.error("NGO my requests error:", error);
    return res.status(500).json({
      message: "Failed to fetch your requests.",
    });
  }
});

// 5. Mark an accepted request as completed.
router.patch("/requests/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid help request ID.",
      });
    }

    const request = await HelpRequest.findOneAndUpdate(
      {
        _id: id,
        acceptedBy: req.user.userId,
        status: "accepted",
      },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
        },
      },
      { new: true, runValidators: true },
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
    console.error("NGO complete request error:", error);
    return res.status(500).json({
      message: "Failed to complete request.",
    });
  }
});

// 6. Release an accepted request back to the pending pool.
router.patch("/requests/:id/release", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid help request ID.",
      });
    }

    const request = await HelpRequest.findOneAndUpdate(
      {
        _id: id,
        acceptedBy: req.user.userId,
        status: "accepted",
      },
      {
        $set: {
          status: "pending",
          acceptedBy: null,
          acceptedAt: null,
        },
      },
      { new: true, runValidators: true },
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
        message: "Only accepted requests can be released.",
      });
    }

    return res.status(200).json({
      message: "Request released back to the pending pool.",
      request,
    });
  } catch (error) {
    console.error("NGO release request error:", error);
    return res.status(500).json({
      message: "Failed to release request.",
    });
  }
});

module.exports = router;
