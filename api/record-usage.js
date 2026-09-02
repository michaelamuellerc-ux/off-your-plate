{\rtf1\ansi\ansicpg1252\cocoartf2709
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // POST \{ phone: "+447700900123", code: "FIRST10" \} \'97 called the moment an\
// order is actually sent (not confirmed by Michaela \'97 same optimistic\
// timing as the old device-only localStorage flag, just shared across\
// every device and browser now instead of one). Records real usage so a\
// later check-code call can catch a repeat. Silently records nothing for\
// a code this endpoint doesn't own (a reward code) or that needs no\
// recording (self-referral, which check-code re-derives every time\
// without needing history).\
const \{ isFirst10Code, decodeReferralCode, isValidUkE164, redisConfigured, redisSet \} = require("./_lib/codes");\
\
module.exports = async (req, res) => \{\
  if (req.method !== "POST") \{\
    res.status(405).json(\{ error: "method not allowed" \});\
    return;\
  \}\
\
  let body = req.body;\
  if (typeof body === "string") \{\
    try \{ body = JSON.parse(body); \} catch (e) \{ body = \{\}; \}\
  \}\
  body = body || \{\};\
  const phone = body.phone;\
  const code = body.code;\
\
  if (!isValidUkE164(phone) || !code || !redisConfigured()) \{\
    res.status(200).json(\{ recorded: false \});\
    return;\
  \}\
\
  const now = new Date().toISOString();\
\
  try \{\
    if (isFirst10Code(code)) \{\
      await redisSet("first10:" + phone, now);\
      res.status(200).json(\{ recorded: true \});\
      return;\
    \}\
\
    const referrerPhone = decodeReferralCode(code);\
    if (referrerPhone && referrerPhone !== phone) \{\
      await redisSet("referral:" + phone, now);\
      res.status(200).json(\{ recorded: true \});\
      return;\
    \}\
\
    res.status(200).json(\{ recorded: false \});\
  \} catch (e) \{\
    res.status(200).json(\{ recorded: false \});\
  \}\
\};}