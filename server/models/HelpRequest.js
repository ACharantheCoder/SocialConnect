const mongoose = require("mongoose");

const helpRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["blood", "food", "clothing", "medicine"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    flair: {
      type: String,
      enum: ["Urgent", "Help Needed", "Awareness", "Community"],
      default: "Help Needed",
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "rejected", "cancelled"],
      default: "pending",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    // Reserved for the Phase 3 fraud engine
    fraudScore: {
      type: Number,
      default: 0,
    },

    fraudFlags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("HelpRequest", helpRequestSchema);
