const mongoose = require("mongoose");

const workspaceMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  role: {
    type: String,
    enum: ["owner", "editor", "viewer"],
    default: "editor"
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const workspaceSchema = new mongoose.Schema({
  workspaceId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: "",
    trim: true
  },
  type: {
    type: String,
    default: "Code + Whiteboard",
    trim: true
  },
  kind: {
    type: String,
    default: "general",
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  members: {
    type: [workspaceMemberSchema],
    default: []
  },
  status: {
    type: String,
    enum: ["Active", "Archived"],
    default: "Active"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Workspace", workspaceSchema);