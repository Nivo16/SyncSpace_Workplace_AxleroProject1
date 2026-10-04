const express = require("express");
const WorkspaceFile = require("../models/WorkspaceFile");
const Workspace = require("../models/Workspace");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

const getWorkspaceAccess = async (workspaceId, userId) => {
  const workspace = await Workspace.findOne({ workspaceId });

  if (!workspace) return { workspace: null, allowed: false };

  const isMember = workspace.members.some(
    (member) => member.user.toString() === userId
  );

  const isOwner = workspace.owner.toString() === userId;

  return {
    workspace,
    allowed: isOwner || isMember
  };
};

router.get("/:workspaceId", authenticateToken, async (req, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);

    if (!Number.isFinite(workspaceId)) {
      return res.status(400).json({ message: "Invalid workspace ID" });
    }

    const { workspace, allowed } = await getWorkspaceAccess(
      workspaceId,
      req.user.userId
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (!allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    const files = await WorkspaceFile.find({ workspaceId }).sort({
      updatedAt: 1
    });

    res.json({ files });
  } catch (err) {
    console.error("Get workspace files error:", err.message);
    res.status(500).json({ message: "Failed to load workspace files" });
  }
});

router.post("/:workspaceId", authenticateToken, async (req, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);

    if (!Number.isFinite(workspaceId)) {
      return res.status(400).json({ message: "Invalid workspace ID" });
    }

    const { workspace, allowed } = await getWorkspaceAccess(
      workspaceId,
      req.user.userId
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (!allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, language, folder, code } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "File name is required" });
    }

    const existingFile = await WorkspaceFile.findOne({
      workspaceId,
      name: name.trim()
    });

    if (existingFile) {
      return res.status(409).json({ message: "File already exists" });
    }

    const file = await WorkspaceFile.create({
      workspaceId,
      name: name.trim(),
      language: language || "javascript",
      folder: folder || "",
      code: code || "",
      createdBy: req.user.userId,
      updatedBy: req.user.userId
    });

    res.status(201).json({
      message: "File created successfully",
      file
    });
  } catch (err) {
    console.error("Create workspace file error:", err.message);
    res.status(500).json({ message: "Failed to create workspace file" });
  }
});

router.put("/:workspaceId/:fileId", authenticateToken, async (req, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);

    if (!Number.isFinite(workspaceId)) {
      return res.status(400).json({ message: "Invalid workspace ID" });
    }

    const { workspace, allowed } = await getWorkspaceAccess(
      workspaceId,
      req.user.userId
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (!allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    const file = await WorkspaceFile.findOne({
      _id: req.params.fileId,
      workspaceId
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const { name, language, folder, code } = req.body;

    if (name !== undefined) file.name = name.trim();
    if (language !== undefined) file.language = language;
    if (folder !== undefined) file.folder = folder;
    if (code !== undefined) file.code = code;

    file.updatedBy = req.user.userId;

    await file.save();

    res.json({
      message: "File updated successfully",
      file
    });
  } catch (err) {
    console.error("Update workspace file error:", err.message);
    res.status(500).json({ message: "Failed to update workspace file" });
  }
});

router.delete("/:workspaceId/:fileId", authenticateToken, async (req, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);

    if (!Number.isFinite(workspaceId)) {
      return res.status(400).json({ message: "Invalid workspace ID" });
    }

    const { workspace, allowed } = await getWorkspaceAccess(
      workspaceId,
      req.user.userId
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (!allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    const file = await WorkspaceFile.findOneAndDelete({
      _id: req.params.fileId,
      workspaceId
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    res.json({
      message: "File deleted successfully"
    });
  } catch (err) {
    console.error("Delete workspace file error:", err.message);
    res.status(500).json({ message: "Failed to delete workspace file" });
  }
});

module.exports = router;