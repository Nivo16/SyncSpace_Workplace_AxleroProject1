const express = require("express");
const Workspace = require("../models/Workspace");
const WorkspaceFile = require("../models/WorkspaceFile");
const YjsDocument = require("../models/YjsDocument");
const { requireAuth } = require("../middleware/auth");
const { writeAudit } = require("../utils/audit");

const router = express.Router();

function serialize(ws) {
  return {
    id: String(ws._id),
    name: ws.name,
    description: ws.description,
    kind: ws.kind,
    type: ws.type,
    code: ws.inviteCode,
    inviteCode: ws.inviteCode,
    roomId: ws.roomId,
    owner: ws.owner?._id ? String(ws.owner._id) : String(ws.owner),
    ownerName: ws.owner?.name || null,
    collaborators: ws.collaborators?.length || 0,
    collaboratorList: (ws.collaborators || []).map((c) => ({
      id: String(c.user?._id || c.user),
      name: c.user?.name || "Member",
      email: c.user?.email || "",
      role: c.role,
    })),
    status: ws.status,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
  };
}

function canAccess(ws, userId) {
  return String(ws.owner?._id || ws.owner) === String(userId) ||
    (ws.collaborators || []).some((c) => String(c.user?._id || c.user) === String(userId));
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, description, kind, type } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Workspace name is required" });
    const inviteCode = await Workspace.generateUniqueInviteCode();
    const ws = await Workspace.create({
      name: name.trim(),
      description: description || "",
      kind: kind === "interview" ? "interview" : "general",
      type: type || "Code + Whiteboard",
      owner: req.user.userId,
      inviteCode,
      collaborators: [{ user: req.user.userId, role: "owner" }],
    });
    await ws.populate("owner", "name email");
    await ws.populate("collaborators.user", "name email");
    await writeAudit(req, "workspace.created", "workspace", ws._id, { name: ws.name, inviteCode });
    const io = req.app.get("io");
    io?.to(`workspace:${ws._id}`).emit("workspace:updated", serialize(ws));
    res.status(201).json({ workspace: serialize(ws) });
  } catch (err) {
    console.error("Create workspace error:", err.message);
    res.status(500).json({ message: "Server error creating workspace" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [{ owner: req.user.userId }, { "collaborators.user": req.user.userId }],
    })
      .populate("owner", "name email")
      .populate("collaborators.user", "name email")
      .sort({ updatedAt: -1 });
    res.json({ workspaces: workspaces.map(serialize) });
  } catch (err) {
    res.status(500).json({ message: "Server error loading workspaces" });
  }
});

router.get("/code/:code", requireAuth, async (req, res) => {
  try {
    const ws = await Workspace.findOne({ inviteCode: String(req.params.code).toUpperCase() })
      .populate("owner", "name email")
      .populate("collaborators.user", "name email");
    if (!ws) return res.status(404).json({ message: "Workspace not found" });
    res.json({ workspace: serialize(ws) });
  } catch (err) {
    res.status(500).json({ message: "Server error finding workspace" });
  }
});

router.post("/:code/join", requireAuth, async (req, res) => {
  try {
    const ws = await Workspace.findOne({ inviteCode: String(req.params.code).toUpperCase() });
    if (!ws) return res.status(404).json({ message: "Workspace not found" });
    if (!canAccess(ws, req.user.userId)) {
      ws.collaborators.push({ user: req.user.userId, role: "member" });
      await ws.save();
      await writeAudit(req, "workspace.joined", "workspace", ws._id, { name: ws.name, inviteCode: ws.inviteCode });
    }
    await ws.populate("owner", "name email");
    await ws.populate("collaborators.user", "name email");
    res.json({ workspace: serialize(ws) });
  } catch (err) {
    res.status(500).json({ message: "Server error joining workspace" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id)
      .populate("owner", "name email")
      .populate("collaborators.user", "name email");
    if (!ws) return res.status(404).json({ message: "Workspace not found" });
    if (!canAccess(ws, req.user.userId) && req.user.role !== "admin") {
      return res.status(403).json({ message: "You do not have access to this workspace" });
    }
    res.json({ workspace: serialize(ws) });
  } catch (err) {
    res.status(500).json({ message: "Server error loading workspace" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ message: "Workspace not found" });
    if (String(ws.owner) !== String(req.user.userId) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the workspace owner can edit it" });
    }
    const allowed = ["name", "description", "type", "status"];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) ws[key] = req.body[key];
    });
    await ws.save();
    await writeAudit(req, "workspace.updated", "workspace", ws._id, { changed: allowed.filter((k) => req.body[k] !== undefined) });
    await ws.populate("owner", "name email");
    await ws.populate("collaborators.user", "name email");
    const io = req.app.get("io");
    io?.to(`workspace:${ws._id}`).emit("workspace:updated", serialize(ws));
    res.json({ workspace: serialize(ws) });
  } catch (err) {
    res.status(500).json({ message: "Server error updating workspace" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ message: "Workspace not found" });
    if (String(ws.owner) !== String(req.user.userId) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the workspace owner can delete it" });
    }

    await writeAudit(req, "workspace.deleted", "workspace", ws._id, { name: ws.name });
    await Promise.all([
      WorkspaceFile.deleteMany({ workspace: ws._id }),
      YjsDocument.deleteMany({ roomName: `whiteboard-${ws.roomId}` }),
    ]);
    await ws.deleteOne();
    req.app.get("io")?.to(`workspace:${ws._id}`).emit("workspace:deleted", { id: String(ws._id) });
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete workspace error:", err.message);
    res.status(500).json({ message: "Server error deleting workspace" });
  }
});

module.exports = router;
