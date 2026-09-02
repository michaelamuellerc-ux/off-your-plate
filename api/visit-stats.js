// GET /api/visit-stats?key=<STATS_KEY>&days=30
// -> { days: [{ date: "2026-09-02", total: 14, bySource: { direct: 9, flyer1: 5 } }, ...] }
// newest date first. Gated by a shared-secret query param (set STATS_KEY
// as an env var on Vercel, alongside the Upstash ones) rather than any
// real auth, since this is a small internal stats page, not a customer
// feature — treat the key like a password and don't share the link
// publicly.
const { redisConfigured, redisGet, redisSmembers } = require("./_lib/codes");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const key = (req.query && req.query.key) || "";
  const expected = process.env.STATS_KEY;
  if (!expected || key !== expected) {
    // Same response whether the key is wrong or STATS_KEY was never set —
    // no hint to a stranger poking at the URL that this endpoint exists.
    res.status(404).json({ error: "not found" });
    return;
  }

  if (!redisConfigured()) {
    res.status(200).json({ days: [] });
    return;
  }

  try {
    const requested = parseInt((req.query && req.query.days) || "30", 10);
    const daysWanted = Math.min(Math.max(requested || 30, 1), 90);

    const allDates = await redisSmembers("visits:dates");
    const sortedDates = allDates.slice().sort().reverse().slice(0, daysWanted);

    const days = await Promise.all(sortedDates.map(async (date) => {
      const [totalRaw, sources] = await Promise.all([
        redisGet("visits:total:" + date),
        redisSmembers("visits:sources:" + date)
      ]);
      const bySource = {};
      await Promise.all(sources.map(async (src) => {
        const count = await redisGet("visits:src:" + date + ":" + src);
        bySource[src] = parseInt(count || "0", 10);
      }));
      return { date: date, total: parseInt(totalRaw || "0", 10), bySource: bySource };
    }));

    res.status(200).json({ days: days });
  } catch (e) {
    res.status(500).json({ error: "failed to load stats" });
  }
};
