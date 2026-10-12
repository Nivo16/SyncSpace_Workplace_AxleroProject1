const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const LANGUAGE_MAP = {
  javascript: { language: "nodejs", versionIndex: "4" },
  python: { language: "python3", versionIndex: "4" },
  java: { language: "java", versionIndex: "4" },
};

const MAX_CODE_LENGTH = 20000;
const MAX_STDIN_LENGTH = 10000;
const EXECUTION_TIMEOUT_MS = 15000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_EXECUTIONS_PER_WINDOW = 10;

const executionAttempts = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  let entry = executionAttempts.get(userId);

  if (!entry || now - entry.startedAt >= RATE_LIMIT_WINDOW_MS) {
    entry = { startedAt: now, count: 0 };
    executionAttempts.set(userId, entry);
  }

  if (entry.count >= MAX_EXECUTIONS_PER_WINDOW) {
    return false;
  }

  entry.count += 1;
  return true;
}

router.post("/run", requireAuth, async (req, res) => {
  const { code, language, stdin = "" } = req.body || {};

  if (typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "Code is required" });
  }

  if (code.length > MAX_CODE_LENGTH) {
    return res.status(413).json({
      error: `Code must not exceed ${MAX_CODE_LENGTH} characters`,
    });
  }

  if (typeof stdin !== "string" || stdin.length > MAX_STDIN_LENGTH) {
    return res.status(400).json({
      error: `Input must be a string of at most ${MAX_STDIN_LENGTH} characters`,
    });
  }

  if (
    typeof language !== "string" ||
    !Object.prototype.hasOwnProperty.call(LANGUAGE_MAP, language)
  ) {
    return res.status(400).json({
      error: "Unsupported language. Use javascript, python, or java.",
    });
  }

  if (!checkRateLimit(String(req.user.userId))) {
    return res.status(429).json({
      error: "Too many execution requests. Please wait a minute and try again.",
    });
  }

  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("JDoodle credentials are not configured.");

    return res.status(503).json({
      error: "Code execution service is not configured.",
    });
  }

  const mapped = LANGUAGE_MAP[language];

  try {
    const response = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(EXECUTION_TIMEOUT_MS),
      body: JSON.stringify({
        clientId,
        clientSecret,
        script: code,
        stdin,
        language: mapped.language,
        versionIndex: mapped.versionIndex,
      }),
    });

    let result;

    try {
      result = await response.json();
    } catch {
      return res.status(502).json({
        error: "Code execution service returned an invalid response.",
      });
    }

    if (!response.ok || result.error) {
      return res.status(502).json({
        error: "Code execution service could not process the request.",
      });
    }

    const output = result.output || "";

    return res.json({
      stdout: output,
      stderr: result.statusCode !== 200 ? output : "",
      compileOutput: "",
      status: result.statusCode === 200 ? "Success" : "Error",
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res.status(504).json({
        error: "Code execution timed out. Please try again.",
      });
    }

    console.error("JDoodle request failed:", err.message);

    return res.status(502).json({
      error: "Code execution service is temporarily unavailable.",
    });
  }
});

module.exports = router;