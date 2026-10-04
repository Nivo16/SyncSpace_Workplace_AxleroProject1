const mongoose = require("mongoose");

const workspaceFileSchema = new mongoose.Schema({
  workspaceId: {
    type: Number,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  language: {
    type: String,
    default: "javascript",
    trim: true
  },
  folder: {
    type: String,
    default: "",
    trim: true
  },
  code: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

workspaceFileSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("WorkspaceFile", workspaceFileSchema);