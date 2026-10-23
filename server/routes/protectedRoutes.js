const express = require("express");
const {
  authMiddleware,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, (req, res) => {
  res.status(200).json({
    message: "Authentication successful",
    user: req.user,
  });
});

router.get(
  "/citizen-only",
  authMiddleware,
  authorizeRoles("Citizen"),
  (req, res) => {
    res.status(200).json({
      message: "Citizen access granted",
      user: req.user,
    });
  },
);

module.exports = router;
