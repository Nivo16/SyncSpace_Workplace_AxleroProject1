const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // stored hashed, never plain text
  googleId: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['admin', 'interviewer', 'user'], default: 'user' },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);