{\rtf1\ansi\ansicpg1252\cocoartf2709
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // GET /api/window-capacity?windows=2026-09-07,2026-09-10,...\
// -> \{ counts: \{ "2026-09-07": 4, "2026-09-10": 10 \} \}\
// Only dates with at least one order appear; a missing date means 0.\
// Called from the site on load (and periodically) to grey out any slot\
// at or over ORDER_CAP \'97 see refreshWindowCapacity() in lookbook.html.\
// No secret key here: this is just an order count per slot, needed by\
// every visitor to see which slots are still open, not sensitive data.\
const \{ redisConfigured, redisGet, isValidWindowDate \} = require("./_lib/codes");\
\
module.exports = async (req, res) => \{\
  if (req.method !== "GET") \{\
    res.status(405).json(\{ error: "method not allowed" \});\
    return;\
  \}\
\
  const raw = (req.query && req.query.windows) || "";\
  const dates = raw.split(",").map((d) => d.trim()).filter(isValidWindowDate).slice(0, 12);\
\
  if (!dates.length || !redisConfigured()) \{\
    res.status(200).json(\{ counts: \{\} \});\
    return;\
  \}\
\
  try \{\
    const counts = \{\};\
    await Promise.all(dates.map(async (date) => \{\
      const val = await redisGet("orders:" + date);\
      const n = parseInt(val || "0", 10);\
      if (n > 0) counts[date] = n;\
    \}));\
    res.status(200).json(\{ counts: counts \});\
  \} catch (e) \{\
    // A hiccup here should never make a slot LOOK full when it isn't \'97\
    // same fail-open spirit as check-code.js.\
    res.status(200).json(\{ counts: \{\} \});\
  \}\
\};}