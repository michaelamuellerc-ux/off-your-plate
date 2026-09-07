{\rtf1\ansi\ansicpg1252\cocoartf2709
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // GET /api/feedback-list?key=<STATS_KEY>&limit=200\
// -> \{ feedback: [\{ t, dishName, tierLabel, rating, comments \}, ...] \} newest first.\
// Gated by the same shared-secret STATS_KEY as visit-stats.js \'97 same\
// password-not-real-auth caveat applies, same 404-either-way response so a\
// wrong or missing key gives no hint the endpoint exists.\
const \{ redisConfigured, redisLrange \} = require("./_lib/codes");\
\
module.exports = async (req, res) => \{\
  if (req.method !== "GET") \{\
    res.status(405).json(\{ error: "method not allowed" \});\
    return;\
  \}\
\
  const key = (req.query && req.query.key) || "";\
  const expected = process.env.STATS_KEY;\
  if (!expected || key !== expected) \{\
    res.status(404).json(\{ error: "not found" \});\
    return;\
  \}\
\
  if (!redisConfigured()) \{\
    res.status(200).json(\{ feedback: [] \});\
    return;\
  \}\
\
  try \{\
    const requested = parseInt((req.query && req.query.limit) || "200", 10);\
    const wanted = Math.min(Math.max(requested || 200, 1), 500);\
    const raw = await redisLrange("feedback:log", 0, wanted - 1);\
    const feedback = raw.map(function (r) \{\
      try \{ return JSON.parse(r); \} catch (e) \{ return null; \}\
    \}).filter(Boolean);\
    res.status(200).json(\{ feedback: feedback \});\
  \} catch (e) \{\
    // This endpoint only reaches here once STATS_KEY has already matched,\
    // so it's safe to include the real error text \'97 it's the fastest way\
    // to tell "Upstash rejected the request" from "the request never\
    // reached Upstash" from a browser's Network tab alone, no server log\
    // digging required.\
    res.status(500).json(\{ error: "failed to load feedback", detail: String((e && e.message) || e) \});\
  \}\
\};}