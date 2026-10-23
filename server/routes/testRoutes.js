const express = require("express");
const Test = require("../models/Test");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const record = await Test.create({
      message: req.body.message,
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const records = await Test.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
