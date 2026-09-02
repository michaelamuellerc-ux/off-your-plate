{\rtf1\ansi\ansicpg1252\cocoartf2709
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // Shared between check-code.js and record-usage.js \'97 no npm dependencies,\
// just plain fetch calls to Upstash's REST API (Node 18+ on Vercel has a\
// global fetch already, so nothing to install).\
\
const PHONE_RE = /^\\+44\\d\{10\}$/;\
\
function isFirst10Code(code) \{\
  return (code || "").trim().toUpperCase() === "FIRST10";\
\}\
\
// Mirrors encodeReferralCode()/decodeReferralCode() in lookbook.html and\
// order-tracker.html exactly \'97 the referrer's phone is encoded straight\
// into the code itself, so decoding needs no lookup. Returns the\
// referrer's number in +44 E.164 form, or null if the code isn't a\
// validly-formed referral code.\
function decodeReferralCode(code) \{\
  const m = (code || "").trim().toUpperCase().match(/^REF([0-9A-Z]\{7\})([0-9A-Z])$/);\
  if (!m) return null;\
  const n = parseInt(m[1], 36);\
  if (isNaN(n) || n < 7000000000 || n > 7999999999) return null;\
  const digits = String(n);\
  let checksum = 0;\
  for (let i = 0; i < digits.length; i++) checksum += parseInt(digits[i], 10);\
  if ((checksum % 36).toString(36).toUpperCase() !== m[2]) return null;\
  return "+44" + digits;\
\}\
\
function isValidUkE164(phone) \{\
  return PHONE_RE.test(phone || "");\
\}\
\
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;\
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;\
\
function redisConfigured() \{\
  return !!(UPSTASH_URL && UPSTASH_TOKEN);\
\}\
\
// One value per key, string in, string out \'97 that's all this needs.\
async function redisGet(key) \{\
  const res = await fetch(UPSTASH_URL + "/get/" + encodeURIComponent(key), \{\
    headers: \{ Authorization: "Bearer " + UPSTASH_TOKEN \}\
  \});\
  if (!res.ok) throw new Error("redis get failed: " + res.status);\
  const data = await res.json();\
  return data.result; // null if unset, else the stored string\
\}\
\
async function redisSet(key, value) \{\
  const res = await fetch(UPSTASH_URL + "/set/" + encodeURIComponent(key) + "/" + encodeURIComponent(value), \{\
    method: "POST",\
    headers: \{ Authorization: "Bearer " + UPSTASH_TOKEN \}\
  \});\
  if (!res.ok) throw new Error("redis set failed: " + res.status);\
  return res.json();\
\}\
\
module.exports = \{\
  isFirst10Code,\
  decodeReferralCode,\
  isValidUkE164,\
  redisConfigured,\
  redisGet,\
  redisSet\
\};}