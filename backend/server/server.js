require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Y = require("yjs");

const authRoutes = require("./routes/auth");
const executeRoutes = require("./routes/execute");
const workspaceRoutes = require("./routes/workspaces");
const interviewRoutes = require("./routes/interviews");

const { YSocketIO } = require("y-socket.io/dist/server");
const YjsDocument = require("./models/YjsDocument");
const { socketAuth, yjsRoomGuard, getMembership } = require("./socketAuth");

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/interviews", interviewRoutes);

app.get("/ping", (req, res) => {
  res.json({ status: "ok", message: "server is alive" });
});

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "SyncSpace backend is running" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.use(socketAuth);

const ysocketio = new YSocketIO(io);
ysocketio.initialize();

console.log("yjs nsp:", ysocketio.nsp && ysocketio.nsp.name);

if (!ysocketio.nsp) {
  throw new Error("y-socket.io namespace unavailable; refusing to start unprotected");
}

ysocketio.nsp.use(socketAuth);
ysocketio.nsp.use(yjsRoomGuard);

const saveTimers = new Map();

function scheduleSave(doc) {
  const roomName = doc.name;

  if (!roomName) {
    console.warn("Yjs document has no .name property - persistence skipped for this update");
    return;
  }

  if (saveTimers.has(roomName)) {
    clearTimeout(saveTimers.get(roomName));
  }

  const timer = setTimeout(async () => {
    try {
      const state = Buffer.from(Y.encodeStateAsUpdate(doc));

      await YjsDocument.findOneAndUpdate(
        { roomName },
        { roomName, state, updatedAt: new Date() },
        { upsert: true, returnDocument: "after" }
      );

      console.log(`Persisted Yjs doc: ${roomName}`);
    } catch (err) {
      console.error(`Failed to persist Yjs doc ${roomName}:`, err.message);
    }

    saveTimers.delete(roomName);
  }, 3000);

  saveTimers.set(roomName, timer);
}

ysocketio.on("document-loaded", async (doc) => {
  console.log("document-loaded fired, room name:", doc.name);

  if (!doc.name) {
    console.warn("Cannot restore Yjs document because room name is missing");
    return;
  }

  try {
    const saved = await YjsDocument.findOne({ roomName: doc.name });

    if (saved && saved.state) {
      Y.applyUpdate(doc, new Uint8Array(saved.state));
      console.log(`Restored Yjs doc from MongoDB: ${doc.name}`);
    }
  } catch (err) {
    console.error(`Failed to load Yjs doc ${doc.name}:`, err.message);
  }
});

ysocketio.on("document-update", (doc) => {
  scheduleSave(doc);
});

const rooms = new Map();

function broadcastPresence(roomId) {
  const members = rooms.get(roomId);
  const list = members ? [...members.values()] : [];
  io.to(roomId).emit("presence-update", list);
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.emit("connected", { socketId: socket.id });

  socket.on("join-room", async (payload) => {
    try {
      const isObject = payload !== null && typeof payload === "object";
      const roomId = isObject ? payload.roomId : payload;

      if (!roomId) {
        return;
      }

      const normalizedRoomId = String(roomId);

      const membership = await getMembership(socket.data.userId, normalizedRoomId);

      if (!socket.connected) {
        return;
      }

      if (!membership) {
        socket.emit("join-error", { message: "Not allowed in this workspace" });
        return;
      }

      if (socket.data.roomId && socket.data.roomId !== normalizedRoomId) {
        cleanupSocket(socket);
      }

      const name = isObject && payload.name ? String(payload.name).slice(0, 50) : "User";

      socket.join(normalizedRoomId);
      socket.data.roomId = normalizedRoomId;

      if (!rooms.has(normalizedRoomId)) {
        rooms.set(normalizedRoomId, new Map());
      }

      rooms.get(normalizedRoomId).set(socket.id, {
        userId: socket.data.userId,
        name,
      });

      console.log(`${socket.id} joined room ${normalizedRoomId}`);
      console.log(`room ${normalizedRoomId} members:`, [...rooms.get(normalizedRoomId).keys()]);

      socket.to(normalizedRoomId).emit("user-joined", { userId: socket.id });
      broadcastPresence(normalizedRoomId);
    } catch (err) {
      console.error("join-room failed:", err.message);
      socket.emit("join-error", { message: "Could not join workspace" });
    }
  });

  socket.on("leave-room", () => {
    cleanupSocket(socket);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    cleanupSocket(socket);
  });
});

function cleanupSocket(socket) {
  const roomId = socket.data.roomId;

  if (!roomId) {
    return;
  }

  socket.leave(roomId);

  const roomMap = rooms.get(roomId);

  if (roomMap) {
    roomMap.delete(socket.id);

    if (roomMap.size === 0) {
      rooms.delete(roomId);
    }
  }

  socket.to(roomId).emit("user-left", { userId: socket.id });
  broadcastPresence(roomId);

  socket.data.roomId = null;
}

async function connectDatabase() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in the environment");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectDatabase();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();