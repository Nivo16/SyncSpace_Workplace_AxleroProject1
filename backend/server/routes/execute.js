const express = require("express");
const router = express.Router();

const LANGUAGE_MAP = {
  javascript: { language: "nodejs", versionIndex: "4" },
  python: { language: "python3", versionIndex: "4" },
  java: { language: "java", versionIndex: "4" },
};

router.post("/run", async (req, res) => {
  console.log("Received /run request:", req.body);

  const { code, language } = req.body;
  const mapped = LANGUAGE_MAP[language];
  if (!mapped) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }

  try {
    console.log("Calling JDoodle...");
    const response = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
        script: code,
        language: mapped.language,
        versionIndex: mapped.versionIndex,
      }),
    });
    console.log("JDoodle responded with status:", response.status);

    const result = await response.json();
    console.log("JDoodle result:", result);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      stdout: result.output || "",
      stderr: result.statusCode !== 200 ? result.output : "",
      compileOutput: "",
      status: result.statusCode === 200 ? "Success" : "Error",
    });
  } catch (err) {
    console.error("JDoodle execution error:", err.message);
    res.status(500).json({ error: "Code execution service unavailable" });
  }
});

module.exports = router;