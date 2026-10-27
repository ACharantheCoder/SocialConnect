const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const HelpRequest = require("../models/HelpRequest");
const {
  authMiddleware,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Only authenticated Admins can access these routes
router.use(authMiddleware, authorizeRoles("Admin"));
// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    const requestsByStatus = await HelpRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalUsers = await User.countDocuments();
    const totalRequests = await HelpRequest.countDocuments();

    res.status(200).json({
      totalUsers,
      totalRequests,
      usersByRole,
      requestsByStatus,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({
      message: "Failed to fetch admin statistics.",
    });
  }
});
// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const { role, search } = req.query;

    const filter = {};

    if (role) {
      const validRoles = ["Citizen", "Donor", "NGO", "Admin"];

      if (!validRoles.includes(role)) {
        return res.status(400).json({
          message: "Invalid role filter.",
        });
      }

      filter.role = role;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedSearch, "i");

      filter.$or = [{ name: regex }, { email: regex }];
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({
      message: "Failed to fetch users.",
    });
  }
});
/* GET /api/admin/requests */
router.get("/requests", async (req, res) => {
  try {
    const { status, type, city, flair } = req.query;

    const filter = {};

    if (status) {
      const validStatuses = [
        "pending",
        "accepted",
        "completed",
        "rejected",
        "cancelled",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid status filter.",
        });
      }

      filter.status = status;
    }

    if (type) {
      const validTypes = ["blood", "food", "clothing", "medicine"];

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          message: "Invalid request type.",
        });
      }

      filter.type = type;
    }

    if (city) {
      filter.city = {
        $regex: `^${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      };
    }

    if (flair) {
      const validFlairs = ["Urgent", "Help Needed", "Awareness", "Community"];

      if (!validFlairs.includes(flair)) {
        return res.status(400).json({
          message: "Invalid flair filter.",
        });
      }

      filter.flair = flair;
    }

    const requests = await HelpRequest.find(filter)
      .populate("createdBy", "name email")
      .populate("acceptedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Admin requests error:", error);

    res.status(500).json({
      message: "Failed to fetch help requests.",
    });
  }
});
/* GET /api/admin/requests/:id */
router.get("/requests/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    const request = await HelpRequest.findById(id)
      .populate("createdBy", "name email")
      .populate("acceptedBy", "name email");

    if (!request) {
      return res.status(404).json({
        message: "Help request not found.",
      });
    }

    res.status(200).json({ request });
  } catch (error) {
    console.error("Admin single request error:", error);

    res.status(500).json({
      message: "Failed to fetch help request.",
    });
  }
});
/* PATCH /api/admin/requests/:id/status */
router.patch("/requests/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    const validStatuses = [
      "pending",
      "accepted",
      "completed",
      "rejected",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status.",
      });
    }

    const request = await HelpRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        message: "Help request not found.",
      });
    }

    if (["accepted", "completed"].includes(status) && !request.acceptedBy) {
      return res.status(400).json({
        message: "This status requires an assigned user.",
      });
    }

    request.status = status;

    if (status === "pending") {
      request.acceptedBy = null;
      request.acceptedAt = null;
      request.completedAt = null;
    } else if (status === "completed") {
      request.completedAt = new Date();
    } else {
      request.completedAt = null;
    }

    await request.save();

    res.status(200).json({
      message: "Request status updated successfully.",
      request,
    });
  } catch (error) {
    console.error("Admin status override error:", error);

    res.status(500).json({
      message: "Failed to update request status.",
    });
  }
});
module.exports = router;
