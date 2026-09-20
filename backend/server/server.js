require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Y = require("yjs");
const authRoutes = require("./routes/auth");
const { YSocketIO } = require("y-socket.io/dist/server");
const YjsDocument = require("./models/YjsDocument");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/ping", (req, res) => {
  res.json({ status: "ok", message: "server is alive" });
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

const server = http.createServer(app);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const ysocketio = new YSocketIO(io);
ysocketio.initialize();

const saveTimers = new Map();

function scheduleSave(doc) {
  const roomName = doc.name;
  if (!roomName) {
    console.warn("Yjs document has no .name property - persistence skipped for this update");
    return;
  }
  if (saveTimers.has(roomName)) clearTimeout(saveTimers.get(roomName));
  const timer = setTimeout(async () => {
    try {
      const state = Buffer.from(Y.encodeStateAsUpdate(doc));
      await YjsDocument.findOneAndUpdate(
        { roomName },
        { roomName, state, updatedAt: new Date() },
        { upsert: true }
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

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.emit("connected", { socketId: socket.id });

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.data.roomId = roomId;

    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(socket.id);

    console.log(`${socket.id} joined room ${roomId}`);
    console.log(`  room ${roomId} members:`, [...rooms.get(roomId)]);

    socket.to(roomId).emit("user-joined", { userId: socket.id });
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
  if (!roomId) return;

  socket.leave(roomId);
  const roomSet = rooms.get(roomId);
  if (roomSet) {
    roomSet.delete(socket.id);
    if (roomSet.size === 0) rooms.delete(roomId);
  }

  socket.to(roomId).emit("user-left", { userId: socket.id });
  socket.data.roomId = null;
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));