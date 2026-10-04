const mongoose = require("mongoose");

const interviewParticipantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    name: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      enum: ["interviewer", "candidate"],
      required: true,
    },

    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },

    avatar: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const interviewQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },

    category: {
      type: String,
      default: "General",
      trim: true,
    },

    starterCode: {
      type: String,
      default: "",
    },

    isCustom: {
      type: Boolean,
      default: false,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    _id: false,
  }
);

const interviewSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "scheduled",
        "active",
        "paused",
        "completed",
      ],
      default: "scheduled",
    },

    interviewer: {
      type: interviewParticipantSchema,
      required: true,
    },

    candidate: {
      type: interviewParticipantSchema,
      required: true,
    },

    durationMinutes: {
      type: Number,
      min: 1,
      default: 60,
    },

    elapsedSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },

    currentQuestionIndex: {
      type: Number,
      min: 0,
      default: 0,
    },

    questions: {
      type: [interviewQuestionSchema],
      default: [],
    },

    liveQuestion: {
      type: interviewQuestionSchema,
      default: null,
    },

    notes: {
      type: String,
      default: "",
    },

    startedAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Interview",
  interviewSchema
);