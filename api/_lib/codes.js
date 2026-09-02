// Shared between check-code.js and record-usage.js — no npm dependencies,
// just plain fetch calls to Upstash's REST API (Node 18+ on Vercel has a
// global fetch already, so nothing to install).

const PHONE_RE = /^\+44\d{10}$/;

// Max separate orders any one delivery slot accepts (window-capacity.js
// reads this to say a slot's full; record-order.js just counts against
// it — the actual cap is enforced by the site showing sold-out slots,
// see the long comment on refreshWindowCapacity() in lookbook.html).
// Keep in sync with ORDER_CAP in lookbook.html.
const ORDER_CAP = 10;

// A window is identified by its start date ("YYYY-MM-DD") — see
// windowDateKey() in lookbook.html — a plain string both sides agree on,
// not parsed as a real date here.
const WINDOW_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidWindowDate(d) {
  return WINDOW_DATE_RE.test(d || "");
}

function isFirst10Code(code) {
  return (code || "").trim().toUpperCase() === "FIRST10";
}

// Mirrors encodeReferralCode()/decodeReferralCode() in lookbook.html and
// order-tracker.html exactly — the referrer's phone is encoded straight
// into the code itself, so decoding needs no lookup. Returns the
// referrer's number in +44 E.164 form, or null if the code isn't a
// validly-formed referral code.
function decodeReferralCode(code) {
  const m = (code || "").trim().toUpperCase().match(/^REF([0-9A-Z]{7})([0-9A-Z])$/);
  if (!m) return null;
  const n = parseInt(m[1], 36);
  if (isNaN(n) || n < 7000000000 || n > 7999999999) return null;
  const digits = String(n);
  let checksum = 0;
  for (let i = 0; i < digits.length; i++) checksum += parseInt(digits[i], 10);
  if ((checksum % 36).toString(36).toUpperCase() !== m[2]) return null;
  return "+44" + digits;
}

function isValidUkE164(phone) {
  return PHONE_RE.test(phone || "");
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function redisConfigured() {
  return !!(UPSTASH_URL && UPSTASH_TOKEN);
}

// One value per key, string in, string out — that's all this needs.
async function redisGet(key) {
  const res = await fetch(UPSTASH_URL + "/get/" + encodeURIComponent(key), {
    headers: { Authorization: "Bearer " + UPSTASH_TOKEN }
  });
  if (!res.ok) throw new Error("redis get failed: " + res.status);
  const data = await res.json();
  return data.result; // null if unset, else the stored string
}

async function redisSet(key, value) {
  const res = await fetch(UPSTASH_URL + "/set/" + encodeURIComponent(key) + "/" + encodeURIComponent(value), {
    method: "POST",
    headers: { Authorization: "Bearer " + UPSTASH_TOKEN }
  });
  if (!res.ok) throw new Error("redis set failed: " + res.status);
  return res.json();
}

// Atomic +1, returns the new value — used for the visit counters (log-visit.js).
async function redisIncr(key) {
  const res = await fetch(UPSTASH_URL + "/incr/" + encodeURIComponent(key), {
    headers: { Authorization: "Bearer " + UPSTASH_TOKEN }
  });
  if (!res.ok) throw new Error("redis incr failed: " + res.status);
  const data = await res.json();
  return data.result;
}

// Adds one member to a set (e.g. "which dates have visits", "which
// sources were seen on this date") — used so visit-stats.js can list
// what exists without scanning every possible key.
async function redisSadd(key, member) {
  const res = await fetch(UPSTASH_URL + "/sadd/" + encodeURIComponent(key) + "/" + encodeURIComponent(member), {
    headers: { Authorization: "Bearer " + UPSTASH_TOKEN }
  });
  if (!res.ok) throw new Error("redis sadd failed: " + res.status);
  const data = await res.json();
  return data.result;
}

async function redisSmembers(key) {
  const res = await fetch(UPSTASH_URL + "/smembers/" + encodeURIComponent(key), {
    headers: { Authorization: "Bearer " + UPSTASH_TOKEN }
  });
  if (!res.ok) throw new Error("redis smembers failed: " + res.status);
  const data = await res.json();
  return data.result || [];
}

module.exports = {
  isFirst10Code,
  decodeReferralCode,
  isValidUkE164,
  redisConfigured,
  redisGet,
  redisSet,
  redisIncr,
  redisSadd,
  redisSmembers,
  ORDER_CAP,
  isValidWindowDate
};
