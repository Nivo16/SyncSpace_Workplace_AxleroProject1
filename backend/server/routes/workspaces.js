
const express = require("express");
const Workspace = require("../models/Workspace");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

const createWorkspaceId = async () => {
  let workspaceId = Date.now();

  while (await Workspace.exists({ workspaceId })) {
    workspaceId++;
  }

  return workspaceId;
};

const formatWorkspace = (workspace) => ({
  id: workspace.workspaceId,
  workspaceId: workspace.workspaceId,
  name: workspace.name,
  description: workspace.description,
  type: workspace.type,
  kind: workspace.kind,
  status: workspace.status,

  owner: workspace.owner,

  members: workspace.members,

  collaboratorList: workspace.members.map((member) => ({
    id: member.user?._id || member.user,
    name: member.user?.name || "Unknown User",
    role: member.role === "owner" ? "Owner" : "Member",
    status: "online"
  })),

  collaborators: workspace.members.length,

  createdAt: workspace.createdAt,
  updatedAt: workspace.updatedAt
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      kind
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Workspace name is required"
      });
    }

    const workspaceId = await createWorkspaceId();

    const workspace = await Workspace.create({
      workspaceId,
      name: name.trim(),
      description: description || "",
      type: type || "Code + Whiteboard",
      kind: kind || "general",
      owner: req.user.userId,
      members: [
        {
          user: req.user.userId,
          role: "owner"
        }
      ]
    });

    const populatedWorkspace =
      await Workspace.findOne({ workspaceId })
        .populate("owner", "name email")
        .populate("members.user", "name email");

    res.status(201).json({
      message: "Workspace created successfully",
      workspace: formatWorkspace(populatedWorkspace)
    });

  } catch (err) {
    console.error(
      "Create workspace error:",
      err.message
    );

    res.status(500).json({
      message: "Failed to create workspace"
    });
  }
});

router.get("/", authenticateToken, async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.user.userId },
        { "members.user": req.user.userId }
      ]
    })
      .populate("owner", "name email")
      .populate("members.user", "name email")
      .sort({ updatedAt: -1 });

    res.json({
      workspaces: workspaces.map(formatWorkspace)
    });

  } catch (err) {
    console.error(
      "Get workspaces error:",
      err.message
    );

    res.status(500).json({
      message: "Failed to load workspaces"
    });
  }
});

router.get("/:workspaceId", authenticateToken, async (req, res) => {
  try {
    const workspaceId =
      Number(req.params.workspaceId);

    if (!Number.isFinite(workspaceId)) {
      return res.status(400).json({
        message: "Invalid workspace ID"
      });
    }

    const workspace =
      await Workspace.findOne({ workspaceId })
        .populate("owner", "name email")
        .populate("members.user", "name email");

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found"
      });
    }

    const isMember = workspace.members.some(
      (member) =>
        member.user?._id?.toString() ===
        req.user.userId
    );

    const isOwner =
      workspace.owner?._id?.toString() ===
      req.user.userId;

    if (!isMember && !isOwner) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    res.json({
      workspace: formatWorkspace(workspace)
    });

  } catch (err) {
    console.error(
      "Get workspace error:",
      err.message
    );

    res.status(500).json({
      message: "Failed to load workspace"
    });
  }
});

router.post(
  "/:workspaceId/join",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId =
        Number(req.params.workspaceId);

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      let workspace =
        await Workspace.findOne({ workspaceId });

      if (!workspace) {
        return res.status(404).json({
          message: "Workspace not found"
        });
      }

      const alreadyMember =
        workspace.members.some(
          (member) =>
            member.user.toString() ===
            req.user.userId
        );

      if (!alreadyMember) {
        workspace.members.push({
          user: req.user.userId,
          role: "editor"
        });

        await workspace.save();
      }

      workspace =
        await Workspace.findOne({ workspaceId })
          .populate("owner", "name email")
          .populate("members.user", "name email");

      res.json({
        message: alreadyMember
          ? "Already a workspace member"
          : "Joined workspace successfully",

        workspace: formatWorkspace(workspace)
      });

    } catch (err) {
      console.error(
        "Join workspace error:",
        err.message
      );

      res.status(500).json({
        message: "Failed to join workspace"
      });
    }
  }
);

router.put(
  "/:workspaceId",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId =
        Number(req.params.workspaceId);

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      const workspace =
        await Workspace.findOne({ workspaceId });

      if (!workspace) {
        return res.status(404).json({
          message: "Workspace not found"
        });
      }

      if (
        workspace.owner.toString() !==
        req.user.userId
      ) {
        return res.status(403).json({
          message:
            "Only the owner can update this workspace"
        });
      }

      const {
        name,
        description,
        type,
        kind,
        status
      } = req.body;

      if (name !== undefined) {
        workspace.name = name.trim();
      }

      if (description !== undefined) {
        workspace.description = description;
      }

      if (type !== undefined) {
        workspace.type = type;
      }

      if (kind !== undefined) {
        workspace.kind = kind;
      }

      if (status !== undefined) {
        workspace.status = status;
      }

      await workspace.save();

      const populatedWorkspace =
        await Workspace.findOne({ workspaceId })
          .populate("owner", "name email")
          .populate("members.user", "name email");

      res.json({
        message: "Workspace updated successfully",
        workspace:
          formatWorkspace(populatedWorkspace)
      });

    } catch (err) {
      console.error(
        "Update workspace error:",
        err.message
      );

      res.status(500).json({
        message: "Failed to update workspace"
      });
    }
  }
);

module.exports = router;

