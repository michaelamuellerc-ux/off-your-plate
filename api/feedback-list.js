// GET /api/feedback-list?key=<STATS_KEY>&limit=200
// -> { feedback: [{ t, dishName, tierLabel, rating, comments }, ...] } newest first.
// Gated by the same shared-secret STATS_KEY as visit-stats.js — same
// password-not-real-auth caveat applies, same 404-either-way response so a
// wrong or missing key gives no hint the endpoint exists.
const { redisConfigured, redisLrange } = require("./_lib/codes");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const key = (req.query && req.query.key) || "";
  const expected = process.env.STATS_KEY;
  if (!expected || key !== expected) {
    res.status(404).json({ error: "not found" });
    return;
  }

  if (!redisConfigured()) {
    res.status(200).json({ feedback: [] });
    return;
  }

  try {
    const requested = parseInt((req.query && req.query.limit) || "200", 10);
    const wanted = Math.min(Math.max(requested || 200, 1), 500);
    const raw = await redisLrange("feedback:log", 0, wanted - 1);
    const feedback = raw.map(function (r) {
      try { return JSON.parse(r); } catch (e) { return null; }
    }).filter(Boolean);
    res.status(200).json({ feedback: feedback });
  } catch (e) {
    res.status(500).json({ error: "failed to load feedback" });
  }
};
