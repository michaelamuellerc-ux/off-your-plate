{\rtf1\ansi\ansicpg1252\cocoartf2709
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // POST \{ windows: ["2026-09-07", "2026-09-10"] \} \'97 records one real order\
// against each listed slot's counter. Called the moment an order is\
// actually sent (see recordOrderWindowsIfAny() in lookbook.html), the\
// same fire-and-forget way discount-code usage already is \'97 this never\
// blocks Send itself. The cap is enforced earlier, by the site showing a\
// slot as sold out once window-capacity.js reports it at ORDER_CAP; this\
// endpoint just makes that count real, so a small overshoot from two\
// people sending within the same refresh window is possible and\
// acceptable (Michaela reviews every order by hand regardless).\
const \{ redisConfigured, redisIncr, isValidWindowDate \} = require("./_lib/codes");\
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
  const windows = Array.isArray(body.windows) ? body.windows : [];\
  const dates = windows.filter(isValidWindowDate).slice(0, 12);\
\
  if (!dates.length) \{\
    res.status(200).json(\{ recorded: false \});\
    return;\
  \}\
\
  try \{\
    await Promise.all(dates.map((date) => redisIncr("orders:" + date)));\
    res.status(200).json(\{ recorded: true \});\
  \} catch (e) \{\
    res.status(200).json(\{ recorded: false \});\
  \}\
\};}