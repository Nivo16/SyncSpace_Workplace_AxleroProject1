const jwt = require("jsonwebtoken");
const Workspace = require("./models/Workspace");

async function getMembership(userId, workspaceId) {
  const numericId = Number(workspaceId);
  if (!Number.isSafeInteger(numericId)) return null;

  const ws = await Workspace.findOne({ workspaceId: numericId })
    .select("owner members")
    .lean();
  if (!ws) return null;

  if (String(ws.owner) === String(userId)) return { role: "owner" };
  const member = ws.members.find((m) => String(m.user) === String(userId));
  return member ? { role: member.role } : null;
}

function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("AUTH_REQUIRED"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.userId) return next(new Error("AUTH_INVALID"));

    socket.data.userId = String(decoded.userId);
    next();
  } catch (err) {
    next(new Error("AUTH_INVALID"));
  }
}

async function yjsRoomGuard(socket, next) {
  try {
    const match = socket.nsp.name.match(
      /^\/yjs\|(?:whiteboard|codeeditor)-(\d+)$/
    );
    if (!match) return next(new Error("FORBIDDEN"));

    const membership = await getMembership(socket.data.userId, match[1]);
    if (!membership) return next(new Error("FORBIDDEN"));

    socket.data.role = membership.role;
    next();
  } catch (err) {
    next(new Error("FORBIDDEN"));
  }
}

module.exports = { socketAuth, yjsRoomGuard, getMembership };