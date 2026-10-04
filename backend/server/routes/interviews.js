const express = require("express");
const Interview = require("../models/Interview");
const Workspace = require("../models/Workspace");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

const createQuestionId = () =>
  `question-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const defaultQuestions = [
  {
    questionId: "default-1",
    title: "Two Sum",
    description:
      "Given an array of integers and a target value, return the indices of the two numbers that add up to the target.",
    difficulty: "Easy",
    category: "Algorithms",
    starterCode:
      "function twoSum(nums, target) {\n  // Write your solution here\n}",
    isCustom: false
  },
  {
    questionId: "default-2",
    title: "Reverse a Linked List",
    description:
      "Reverse a singly linked list and return the new head of the list.",
    difficulty: "Medium",
    category: "Data Structures",
    starterCode:
      "function reverseList(head) {\n  // Write your solution here\n}",
    isCustom: false
  },
  {
    questionId: "default-3",
    title: "Design a URL Shortener",
    description:
      "Design a scalable URL shortening service. Discuss the API, database structure, ID generation and scalability considerations.",
    difficulty: "Hard",
    category: "System Design",
    starterCode: "",
    isCustom: false
  }
];

const getWorkspaceAccess = async (
  workspaceId,
  userId
) => {
  const workspace = await Workspace.findOne({
    workspaceId
  });

  if (!workspace) {
    return {
      workspace: null,
      isOwner: false,
      isMember: false,
      viewerRole: null
    };
  }

  const userIdString = String(userId);

  const isOwner =
    workspace.owner &&
    String(workspace.owner) === userIdString;

  const isMember =
    Array.isArray(workspace.members) &&
    workspace.members.some(
      (member) =>
        member &&
        member.user &&
        String(member.user) === userIdString
    );

  let viewerRole = null;

  if (isOwner) {
    viewerRole = "interviewer";
  } else if (isMember) {
    viewerRole = "candidate";
  }

  return {
    workspace,
    isOwner,
    isMember,
    viewerRole
  };
};

const requireInterviewAccess = async (
  workspaceId,
  userId,
  res
) => {
  const access = await getWorkspaceAccess(
    workspaceId,
    userId
  );

  if (!access.workspace) {
    res.status(404).json({
      message: "Workspace not found"
    });

    return null;
  }

  if (access.workspace.kind !== "interview") {
    res.status(400).json({
      message:
        "This workspace is not an interview workspace"
    });

    return null;
  }

  if (!access.isOwner && !access.isMember) {
    res.status(403).json({
      message: "Access denied"
    });

    return null;
  }

  return access;
};

const requireInterviewer = async (
  workspaceId,
  userId,
  res
) => {
  const access = await requireInterviewAccess(
    workspaceId,
    userId,
    res
  );

  if (!access) {
    return null;
  }

  if (!access.isOwner) {
    res.status(403).json({
      message:
        "Only the interviewer can control this interview"
    });

    return null;
  }

  return access;
};

const formatInterview = (
  interview,
  viewerRole = "candidate"
) => {
  const formatted = {
    id: String(interview._id),
    workspaceId: interview.workspaceId,
    status: interview.status,

    viewerRole,

    interviewer: interview.interviewer,
    candidate: interview.candidate,

    durationMinutes:
      interview.durationMinutes,

    elapsedSeconds:
      interview.elapsedSeconds,

    difficulty:
      interview.difficulty,

    currentQuestionIndex:
      interview.currentQuestionIndex,

    questions:
      Array.isArray(interview.questions)
        ? interview.questions
        : [],

    liveQuestion:
      interview.liveQuestion || null,

    notes:
      viewerRole === "interviewer"
        ? interview.notes || ""
        : "",

    startedAt:
      interview.startedAt || null,

    endedAt:
      interview.endedAt || null,

    createdAt:
      interview.createdAt || null,

    updatedAt:
      interview.updatedAt || null
  };

  return formatted;
};

const sendInterviewResponse = (
  res,
  interview,
  viewerRole,
  extra = {}
) => {
  const formatted = formatInterview(
    interview,
    viewerRole
  );

  return res.json({
    ...formatted,

    interview: formatted,

    ...extra
  });
};

router.get(
  "/:workspaceId",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId = Number(
        req.params.workspaceId
      );

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      const access =
        await requireInterviewAccess(
          workspaceId,
          req.user.userId,
          res
        );

      if (!access) {
        return;
      }

      let interview =
        await Interview.findOne({
          workspaceId
        });

      if (!interview) {
        interview = await Interview.create({
          workspaceId,

          interviewer: {
            user: req.user.userId,
            name:
              req.user.name ||
              "Interviewer",
            role: "interviewer",
            status: "online"
          },

          candidate: {
            user: null,
            name: "Candidate",
            role: "candidate",
            status: "offline"
          },

          questions: defaultQuestions
        });
      }

      return sendInterviewResponse(
        res,
        interview,
        access.viewerRole
      );
    } catch (err) {
      console.error(
        "Get interview error:",
        err.message
      );

      return res.status(500).json({
        message:
          "Failed to load interview"
      });
    }
  }
);

router.post(
  "/:workspaceId",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId = Number(
        req.params.workspaceId
      );

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      const access =
        await requireInterviewer(
          workspaceId,
          req.user.userId,
          res
        );

      if (!access) {
        return;
      }

      let interview =
        await Interview.findOne({
          workspaceId
        });

      if (interview) {
        return sendInterviewResponse(
          res,
          interview,
          "interviewer",
          {
            message:
              "Interview already exists"
          }
        );
      }

      const {
        candidate,
        durationMinutes,
        difficulty
      } = req.body;

      interview = await Interview.create({
        workspaceId,

        interviewer: {
          user: req.user.userId,
          name:
            req.user.name ||
            "Interviewer",
          role: "interviewer",
          status: "online"
        },

        candidate: {
          user:
            candidate?.user || null,
          name:
            candidate?.name ||
            "Candidate",
          role: "candidate",
          status: "offline"
        },

        durationMinutes:
          Number(durationMinutes) > 0
            ? Number(durationMinutes)
            : 60,

        difficulty:
          ["Easy", "Medium", "Hard"].includes(
            difficulty
          )
            ? difficulty
            : "Medium",

        questions: defaultQuestions
      });

      const formatted = formatInterview(
        interview,
        "interviewer"
      );

      return res.status(201).json({
        ...formatted,
        interview: formatted,
        message:
          "Interview created successfully"
      });
    } catch (err) {
      console.error(
        "Create interview error:",
        err.message
      );

      return res.status(500).json({
        message:
          "Failed to create interview"
      });
    }
  }
);

router.put(
  "/:workspaceId",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId = Number(
        req.params.workspaceId
      );

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      const access =
        await requireInterviewer(
          workspaceId,
          req.user.userId,
          res
        );

      if (!access) {
        return;
      }

      const interview =
        await Interview.findOne({
          workspaceId
        });

      if (!interview) {
        return res.status(404).json({
          message:
            "Interview not found"
        });
      }

      const {
        status,
        durationMinutes,
        elapsedSeconds,
        difficulty,
        currentQuestionIndex,
        liveQuestion,
        notes,
        interviewer,
        candidate,
        startedAt,
        endedAt,
        questions
      } = req.body;

      if (status !== undefined) {
        interview.status = status;
      }

      if (
        durationMinutes !== undefined
      ) {
        const parsedDuration =
          Number(durationMinutes);

        if (
          Number.isFinite(
            parsedDuration
          )
        ) {
          interview.durationMinutes =
            Math.max(
              1,
              parsedDuration
            );
        }
      }

      if (
        elapsedSeconds !== undefined
      ) {
        const parsedElapsed =
          Number(elapsedSeconds);

        if (
          Number.isFinite(
            parsedElapsed
          )
        ) {
          interview.elapsedSeconds =
            Math.max(
              0,
              parsedElapsed
            );
        }
      }

      if (difficulty !== undefined) {
        if (
          ["Easy", "Medium", "Hard"].includes(
            difficulty
          )
        ) {
          interview.difficulty =
            difficulty;
        }
      }

      if (
        currentQuestionIndex !==
        undefined
      ) {
        const parsedIndex =
          Number(
            currentQuestionIndex
          );

        if (
          Number.isFinite(
            parsedIndex
          )
        ) {
          interview.currentQuestionIndex =
            Math.max(
              0,
              Math.floor(parsedIndex)
            );
        }
      }

      if (
        liveQuestion !==
        undefined
      ) {
        interview.liveQuestion =
          liveQuestion;
      }

      if (notes !== undefined) {
        interview.notes =
          String(notes);
      }

      if (
        interviewer !== undefined
      ) {
        interview.interviewer = {
          ...interview.interviewer?.toObject?.(),
          ...interviewer
        };
      }

      if (
        candidate !== undefined
      ) {
        interview.candidate = {
          ...interview.candidate?.toObject?.(),
          ...candidate
        };
      }

      if (
        startedAt !== undefined
      ) {
        interview.startedAt =
          startedAt;
      }

      if (
        endedAt !== undefined
      ) {
        interview.endedAt =
          endedAt;
      }

      if (
        Array.isArray(questions)
      ) {
        interview.questions =
          questions;
      }

      await interview.save();

      return sendInterviewResponse(
        res,
        interview,
        "interviewer",
        {
          message:
            "Interview updated successfully"
        }
      );
    } catch (err) {
      console.error(
        "Update interview error:",
        err.message
      );

      return res.status(500).json({
        message:
          "Failed to update interview"
      });
    }
  }
);

router.post(
  "/:workspaceId/start",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId = Number(
        req.params.workspaceId
      );

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      const access =
        await requireInterviewer(
          workspaceId,
          req.user.userId,
          res
        );

      if (!access) {
        return;
      }

      const interview =
        await Interview.findOne({
          workspaceId
        });

      if (!interview) {
        return res.status(404).json({
          message:
            "Interview not found"
        });
      }

      interview.status = "active";

      interview.startedAt =
        interview.startedAt ||
        new Date();

      interview.endedAt = null;

      await interview.save();

      return sendInterviewResponse(
        res,
        interview,
        "interviewer",
        {
          message:
            "Interview started"
        }
      );
    } catch (err) {
      console.error(
        "Start interview error:",
        err.message
      );

      return res.status(500).json({
        message:
          "Failed to start interview"
      });
    }
  }
);

router.post(
  "/:workspaceId/pause",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId = Number(
        req.params.workspaceId
      );

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      const access =
        await requireInterviewer(
          workspaceId,
          req.user.userId,
          res
        );

      if (!access) {
        return;
      }

      const interview =
        await Interview.findOne({
          workspaceId
        });

      if (!interview) {
        return res.status(404).json({
          message:
            "Interview not found"
        });
      }

      interview.status = "paused";

      if (
        req.body.elapsedSeconds !==
        undefined
      ) {
        const parsedElapsed =
          Number(
            req.body.elapsedSeconds
          );

        if (
          Number.isFinite(
            parsedElapsed
          )
        ) {
          interview.elapsedSeconds =
            Math.max(
              0,
              parsedElapsed
            );
        }
      }

      await interview.save();

      return sendInterviewResponse(
        res,
        interview,
        "interviewer",
        {
          message:
            "Interview paused"
        }
      );
    } catch (err) {
      console.error(
        "Pause interview error:",
        err.message
      );

      return res.status(500).json({
        message:
          "Failed to pause interview"
      });
    }
  }
);

router.post(
  "/:workspaceId/resume",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId = Number(
        req.params.workspaceId
      );

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      const access =
        await requireInterviewer(
          workspaceId,
          req.user.userId,
          res
        );

      if (!access) {
        return;
      }

      const interview =
        await Interview.findOne({
          workspaceId
        });

      if (!interview) {
        return res.status(404).json({
          message:
            "Interview not found"
        });
      }

      interview.status = "active";

      await interview.save();

      return sendInterviewResponse(
        res,
        interview,
        "interviewer",
        {
          message:
            "Interview resumed"
        }
      );
    } catch (err) {
      console.error(
        "Resume interview error:",
        err.message
      );

      return res.status(500).json({
        message:
          "Failed to resume interview"
      });
    }
  }
);

router.post(
  "/:workspaceId/end",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId = Number(
        req.params.workspaceId
      );

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      const access =
        await requireInterviewer(
          workspaceId,
          req.user.userId,
          res
        );

      if (!access) {
        return;
      }

      const interview =
        await Interview.findOne({
          workspaceId
        });

      if (!interview) {
        return res.status(404).json({
          message:
            "Interview not found"
        });
      }

      interview.status = "completed";
      interview.endedAt = new Date();

      if (
        req.body.elapsedSeconds !==
        undefined
      ) {
        const parsedElapsed =
          Number(
            req.body.elapsedSeconds
          );

        if (
          Number.isFinite(
            parsedElapsed
          )
        ) {
          interview.elapsedSeconds =
            Math.max(
              0,
              parsedElapsed
            );
        }
      }

      await interview.save();

      return sendInterviewResponse(
        res,
        interview,
        "interviewer",
        {
          message:
            "Interview ended"
        }
      );
    } catch (err) {
      console.error(
        "End interview error:",
        err.message
      );

      return res.status(500).json({
        message:
          "Failed to end interview"
      });
    }
  }
);

router.put(
  "/:workspaceId/notes",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId = Number(
        req.params.workspaceId
      );

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      const access =
        await requireInterviewer(
          workspaceId,
          req.user.userId,
          res
        );

      if (!access) {
        return;
      }

      const interview =
        await Interview.findOne({
          workspaceId
        });

      if (!interview) {
        return res.status(404).json({
          message:
            "Interview not found"
        });
      }

      interview.notes =
        req.body.notes || "";

      await interview.save();

      return res.json({
        message:
          "Interview notes saved",

        notes:
          interview.notes,

        savedAt:
          new Date().toISOString()
      });
    } catch (err) {
      console.error(
        "Save interview notes error:",
        err.message
      );

      return res.status(500).json({
        message:
          "Failed to save interview notes"
      });
    }
  }
);

router.get(
  "/:workspaceId/questions",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId = Number(
        req.params.workspaceId
      );

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      const access =
        await requireInterviewAccess(
          workspaceId,
          req.user.userId,
          res
        );

      if (!access) {
        return;
      }

      const interview =
        await Interview.findOne({
          workspaceId
        });

      if (!interview) {
        return res.status(404).json({
          message:
            "Interview not found"
        });
      }

      return res.json({
        questions:
          Array.isArray(
            interview.questions
          )
            ? interview.questions
            : [],

        currentQuestionIndex:
          Number(
            interview.currentQuestionIndex
          ) || 0
      });
    } catch (err) {
      console.error(
        "Get interview questions error:",
        err.message
      );

      return res.status(500).json({
        message:
          "Failed to load interview questions"
      });
    }
  }
);

router.post(
  "/:workspaceId/questions",
  authenticateToken,
  async (req, res) => {
    try {
      const workspaceId = Number(
        req.params.workspaceId
      );

      if (!Number.isFinite(workspaceId)) {
        return res.status(400).json({
          message: "Invalid workspace ID"
        });
      }

      const access =
        await requireInterviewer(
          workspaceId,
          req.user.userId,
          res
        );

      if (!access) {
        return;
      }

      const interview =
        await Interview.findOne({
          workspaceId
        });

      if (!interview) {
        return res.status(404).json({
          message:
            "Interview not found"
        });
      }

      const {
        title,
        description,
        difficulty,
        category,
        starterCode
      } = req.body;

      if (
        typeof title !== "string" ||
        !title.trim()
      ) {
        return res.status(400).json({
          message:
            "Question title is required"
        });
      }

      const question = {
        questionId:
          createQuestionId(),

        title:
          title.trim(),

        description:
          typeof description ===
          "string"
            ? description
            : "",

        difficulty:
          ["Easy", "Medium", "Hard"].includes(
            difficulty
          )
            ? difficulty
            : "Medium",

        category:
          typeof category === "string" &&
          category.trim()
            ? category.trim()
            : "General",

        starterCode:
          typeof starterCode ===
          "string"
            ? starterCode
            : "",

        isCustom: true,

        updatedAt:
          new Date(),

        updatedBy:
          req.user.userId
      };

      interview.questions.push(
        question
      );

      await interview.save();

      return res.status(201).json({
        ...question,

        question,

        message:
          "Question created successfully"
      });
    } catch (err) {
      console.error(
        "Create interview question error:",
        err.message
      );

      return res.status(500).json({
        message:
          "Failed to create interview question"
      });
    }
  }
);

module.exports = router;