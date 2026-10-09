const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { writeAudit } = require("../utils/audit");

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Public signup never trusts a client-supplied privileged role.
    // Admins can promote users later through the protected admin endpoint.
    const userRole = 'user';

    const user = await User.create({ name, email, password: hashedPassword, role: userRole });

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await writeAudit({ user: { userId: user._id, email: user.email, role: user.role } }, "auth.signup", "user", user._id, { email: user.email });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone || "", bio: user.bio || "", avatarUrl: user.avatarUrl || "" },
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ message: "Server error during signup" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await writeAudit({ user: { userId: user._id, email: user.email, role: user.role } }, "auth.login", "user", user._id, { email: user.email });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone || "", bio: user.bio || "", avatarUrl: user.avatarUrl || "" },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error during login" });
  }
});

router.post("/google", async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const credential = String(req.body.credential || "");
    if (!clientId) return res.status(503).json({ message: "Google sign-in is not configured" });
    if (!credential) return res.status(400).json({ message: "Google credential is required" });

    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || profile.email_verified !== true) {
      return res.status(401).json({ message: "Google account could not be verified" });
    }

    const email = profile.email.toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] });
    if (user?.googleId && user.googleId !== profile.sub) {
      return res.status(409).json({ message: "This email is linked to a different Google account" });
    }
    if (!user) {
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      user = await User.create({
        name: String(profile.name || email.split("@")[0]).trim(),
        email,
        password: randomPassword,
        googleId: profile.sub,
        avatarUrl: profile.picture || "",
        role: "user",
      });
    } else {
      user.googleId = profile.sub;
      if (!user.avatarUrl && profile.picture) user.avatarUrl = profile.picture;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    await writeAudit({ user: { userId: user._id, email: user.email, role: user.role } }, "auth.google_login", "user", user._id, { email: user.email });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone || "", bio: user.bio || "", avatarUrl: user.avatarUrl || "" },
    });
  } catch (err) {
    console.error("Google login error:", err.message);
    res.status(401).json({ message: "Google sign-in could not be verified" });
  }
});

// Get the currently authenticated user — used by the frontend on app load
// to validate a stored token and recover the user's role, instead of
// trusting whatever was last cached client-side.
const { requireAuth } = require("../middleware/auth");
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone || "", bio: user.bio || "", avatarUrl: user.avatarUrl || "" } });
  } catch (err) {
    console.error("Me error:", err.message);
    res.status(500).json({ message: "Server error fetching profile" });
  }
});


router.patch("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (req.body.name !== undefined) user.name = String(req.body.name).trim();
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!email) return res.status(400).json({ message: "Email is required" });
      const duplicate = await User.findOne({ email, _id: { $ne: user._id } });
      if (duplicate) return res.status(409).json({ message: "Email already registered" });
      user.email = email;
    }
    if (req.body.phone !== undefined) user.phone = String(req.body.phone || "").trim();
    if (req.body.bio !== undefined) user.bio = String(req.body.bio || "").trim();
    if (req.body.avatarUrl !== undefined) user.avatarUrl = String(req.body.avatarUrl || "").trim();
    if (req.body.password) user.password = await bcrypt.hash(String(req.body.password), 10);
    await user.save();
    await writeAudit(req, "profile.updated", "user", user._id, { fields: Object.keys(req.body).filter((k) => k !== "password") });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone || "", bio: user.bio || "", avatarUrl: user.avatarUrl || "" } });
  } catch (err) {
    console.error("Profile update error:", err.message);
    res.status(500).json({ message: "Server error updating profile" });
  }
});

module.exports = router;