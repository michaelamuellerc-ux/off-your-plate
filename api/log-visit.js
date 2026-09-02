// POST { source?: "flyer1" } — logs one site visit against today's UTC
// date and an optional source tag (a QR code on a flyer, a link in an
// ad, etc.), defaulting to "direct" when no tag is given. Called once
// per page load from lookbook.html, fire-and-forget — this must never
// slow down or block a real visitor, so any failure here is swallowed
// and just means that one visit wasn't counted, nothing more.
const { redisConfigured, redisIncr, redisSadd } = require("./_lib/codes");

function sanitizeSource(raw) {
  const s = (raw || "").toString().trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  return s || "direct";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  if (!redisConfigured()) {
    res.status(200).json({ logged: false });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};
  const source = sanitizeSource(body.source);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC

  try {
    await Promise.all([
      redisIncr("visits:total:" + today),
      redisIncr("visits:src:" + today + ":" + source),
      redisSadd("visits:dates", today),
      redisSadd("visits:sources:" + today, source)
    ]);
    res.status(200).json({ logged: true });
  } catch (e) {
    res.status(200).json({ logged: false });
  }
};
