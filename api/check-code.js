{\rtf1\ansi\ansicpg1252\cocoartf2709
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // POST \{ phone: "+447700900123", code: "FIRST10" \}\
// -> \{ valid: true \}\
// -> \{ valid: false, reason: "first10-reused" | "referral-reused" | "self-referral", usedOn?: "2026-08-20T..." \}\
//\
// What this DOES check, against real recorded history: FIRST10 reuse,\
// referral-code reuse, and self-referral \'97 all worked out from data this\
// endpoint itself owns (see record-usage.js). What it CANNOT check:\
// reward codes (RWD-xxxxx) issued by Michaela's private Order Tracker,\
// which lives on a completely separate system this endpoint has no access\
// to \'97 those pass through here as "no evidence against it," the same as\
// any code this endpoint doesn't recognize. The Tracker's own reuse check\
// (and its one-tap "message customer" button) is still the backstop for\
// those, exactly as before.\
//\
// Never lets a database hiccup block someone from ordering: any failure\
// here answers \{ valid: true \} rather than an error, same as when this\
// endpoint is unreachable at all (a Claude artifact preview, or a real\
// network issue) \'97 the site's own soft, same-device fallback takes over\
// in that case.\
const \{ isFirst10Code, decodeReferralCode, isValidUkE164, redisConfigured, redisGet \} = require("./_lib/codes");\
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
  if (!isValidUkE164(phone) || !code) \{\
    res.status(400).json(\{ error: "invalid phone or code" \});\
    return;\
  \}\
\
  if (!redisConfigured()) \{\
    // No database wired up yet (env vars not set) \'97 don't claim to know\
    // anything either way.\
    res.status(200).json(\{ valid: true \});\
    return;\
  \}\
\
  try \{\
    if (isFirst10Code(code)) \{\
      const usedOn = await redisGet("first10:" + phone);\
      if (usedOn) \{\
        res.status(200).json(\{ valid: false, reason: "first10-reused", usedOn: usedOn \});\
        return;\
      \}\
      res.status(200).json(\{ valid: true \});\
      return;\
    \}\
\
    const referrerPhone = decodeReferralCode(code);\
    if (referrerPhone) \{\
      if (referrerPhone === phone) \{\
        res.status(200).json(\{ valid: false, reason: "self-referral" \});\
        return;\
      \}\
      const usedOn = await redisGet("referral:" + phone);\
      if (usedOn) \{\
        res.status(200).json(\{ valid: false, reason: "referral-reused", usedOn: usedOn \});\
        return;\
      \}\
      res.status(200).json(\{ valid: true \});\
      return;\
    \}\
\
    // Not FIRST10 and not a recognized referral code \'97 most likely a\
    // reward code from the Tracker, which this endpoint can't see.\
    res.status(200).json(\{ valid: true \});\
  \} catch (e) \{\
    res.status(200).json(\{ valid: true \});\
  \}\
\};}