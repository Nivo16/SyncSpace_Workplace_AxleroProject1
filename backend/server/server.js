const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Basic route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    console.log(`${socket.id} joined room ${roomId}`);

    // Notify other users in the room
    socket.to(roomId).emit("user-joined", {
      userId: socket.id,
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});