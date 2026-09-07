{\rtf1\ansi\ansicpg1252\cocoartf2709
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // POST \{ dishId, dishName, tierLabel, rating: "loved"|"meh", comments? \}\
// Records one piece of dish feedback straight to Redis \'97 the replacement\
// for the old flow, where "Send feedback" just built a wa.me link and the\
// customer still had to hit send in WhatsApp themselves. This endpoint is\
// what lets the button submit feedback directly instead, no text message\
// involved. Modelled on log-visit.js: one running list (feedback:log),\
// newest first, trimmed to FEEDBACK_MAX so it can't grow without bound.\
const \{ redisConfigured, redisLpush, redisLtrim \} = require("./_lib/codes");\
\
const FEEDBACK_MAX = 500;\
const RATINGS = ["loved", "meh"];\
\
function cleanText(raw, maxLen) \{\
  return (raw || "").toString().trim().slice(0, maxLen);\
\}\
\
module.exports = async (req, res) => \{\
  if (req.method !== "POST") \{\
    res.status(405).json(\{ error: "method not allowed" \});\
    return;\
  \}\
  if (!redisConfigured()) \{\
    res.status(200).json(\{ recorded: false \});\
    return;\
  \}\
\
  let body = req.body;\
  if (typeof body === "string") \{\
    try \{ body = JSON.parse(body); \} catch (e) \{ body = \{\}; \}\
  \}\
  body = body || \{\};\
\
  const rating = RATINGS.indexOf(body.rating) !== -1 ? body.rating : null;\
  const dishName = cleanText(body.dishName, 120);\
  const tierLabel = cleanText(body.tierLabel, 60);\
  const comments = cleanText(body.comments, 500);\
\
  if (!rating || !dishName) \{\
    res.status(200).json(\{ recorded: false \});\
    return;\
  \}\
\
  const entry = JSON.stringify(\{\
    t: new Date().toISOString(),\
    dishName: dishName,\
    tierLabel: tierLabel,\
    rating: rating,\
    comments: comments\
  \});\
\
  try \{\
    await redisLpush("feedback:log", entry);\
    await redisLtrim("feedback:log", 0, FEEDBACK_MAX - 1);\
    res.status(200).json(\{ recorded: true \});\
  \} catch (e) \{\
    // Stays a 200 (a real visitor's page must never break over this), but\
    // carries the real error text for whoever's looking at the Network tab\
    // while debugging \'97 lookbook.html itself only ever reads `recorded`.\
    res.status(200).json(\{ recorded: false, detail: String((e && e.message) || e) \});\
  \}\
\};}