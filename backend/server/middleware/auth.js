const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

function readToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || !secret.trim()) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

function sendAuthError(res, status, message) {
  return res.status(status).json({ message });
}

async function loadCurrentUser(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    return null;
  }

  return User.findById(userId)
    .select("_id name email role passwordChangedAt accountStatus")
    .lean();
}

function tokenPredatesPasswordChange(payload, user) {
  if (!user.passwordChangedAt) {
    return false;
  }

  if (typeof payload.iat !== "number") {
    return true;
  }

  
  const issuedAt = payload.iat * 1000;

  return issuedAt < new Date(user.passwordChangedAt).getTime();
}

function setRequestUser(req, user) {
  req.user = {
    userId: String(user._id),
    email: user.email,
    role: user.role,
  };
}

async function requireAuth(req, res, next) {
  const token = readToken(req);

  if (!token) {
    return sendAuthError(res, 401, "Authentication required");
  }

  let payload;

  try {
    payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
  } catch (err) {
    if (err.message === "JWT_SECRET is not configured") {
      console.error(
        "Authentication configuration error: JWT_SECRET is missing."
      );
      return sendAuthError(
        res,
        503,
        "Authentication service unavailable"
      );
    }

    return sendAuthError(res, 401, "Invalid or expired token");
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.userId !== "string"
  ) {
    return sendAuthError(res, 401, "Invalid or expired token");
  }

  try {
    const user = await loadCurrentUser(payload.userId);

    if (!user) {
      return sendAuthError(res, 401, "User account not found");
    }

    if (user.accountStatus === "suspended") {
      return sendAuthError(res, 403, "This account is suspended");
    }

    if (tokenPredatesPasswordChange(payload, user)) {
      return sendAuthError(
        res,
        401,
        "Session expired because the password was changed. Please log in again."
      );
    }

    setRequestUser(req, user);

    return next();
  } catch (err) {
    console.error(
      "Authentication database lookup failed:",
      err.message
    );
    return sendAuthError(
      res,
      503,
      "Authentication service temporarily unavailable"
    );
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendAuthError(res, 401, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      return sendAuthError(
        res,
        403,
        "You do not have permission to perform this action"
      );
    }

    return next();
  };
}

async function optionalAuth(req, res, next) {
  const token = readToken(req);

  if (!token) {
    req.user = undefined;
    return next();
  }

  let payload;

  try {
    payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
  } catch (err) {
    if (err.message === "JWT_SECRET is not configured") {
      console.error(
        "Authentication configuration error: JWT_SECRET is missing."
      );
      return sendAuthError(
        res,
        503,
        "Authentication service unavailable"
      );
    }

    req.user = undefined;
    return next();
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.userId !== "string"
  ) {
    req.user = undefined;
    return next();
  }

  try {
    const user = await loadCurrentUser(payload.userId);

    if (
      !user ||
      user.accountStatus === "suspended" ||
      tokenPredatesPasswordChange(payload, user)
    ) {
      req.user = undefined;
      return next();
    }

    setRequestUser(req, user);

    return next();
  } catch (err) {
    console.error(
      "Optional authentication lookup failed:",
      err.message
    );
    return sendAuthError(
      res,
      503,
      "Authentication service temporarily unavailable"
    );
  }
}

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.authenticateToken = requireAuth;
module.exports.requireRole = requireRole;
module.exports.optionalAuth = optionalAuth;