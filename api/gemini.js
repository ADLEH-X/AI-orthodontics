// Vercel serverless proxy for Gemini. Set GEMINI_API_KEY in Vercel > Settings > Environment Variables.
// The key never reaches the browser.
const ALLOWED_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest"
];

module.exports = async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;

  if (req.method === "GET") {
    return res.status(200).json({ configured: Boolean(key) });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }
  if (!key) {
    return res.status(503).json({ error: { message: "GEMINI_API_KEY is not configured on the server" } });
  }

  const { model, contents, generationConfig } = req.body || {};
  if (!ALLOWED_MODELS.includes(model) || !Array.isArray(contents)) {
    return res.status(400).json({ error: { message: "Invalid request" } });
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents, generationConfig })
      }
    );
    const data = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: { message: "Upstream request failed" } });
  }
};
