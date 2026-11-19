import { positiveInt, requiredSecret } from "./config.js";
import { hmacSign, toHex } from "./crypto.js";
import { HttpError } from "./http.js";

const DAY_SECONDS = 24 * 60 * 60;
const SESSION_WINDOW = 0;

const HIT_SQL = `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?1, ?2, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET count = count + 1
  RETURNING count`;

async function ipHash(env, ip) {
  const digest = await hmacSign(requiredSecret(env, "SESSION_SIGNING_KEY"), `ip:${ip}`);
  return toHex(digest.slice(0, 16));
}

async function consume(env, checks, code) {
  const results = await env.DB.batch(
    checks.map(({ bucket, windowStart }) => env.DB.prepare(HIT_SQL).bind(bucket, windowStart)),
  );
  const exceeded = checks.some(({ limit }, index) => results[index].results[0].count > limit);
  if (exceeded) throw new HttpError(429, code);
}

async function limitChecks(env, { ip, sessionId, prefix, ipLimitVar, sessionLimitVar }, nowMs) {
  const nowSeconds = Math.floor(nowMs / 1000);
  const checks = [
    {
      bucket: `${prefix}ip:${await ipHash(env, ip)}`,
      windowStart: nowSeconds - (nowSeconds % DAY_SECONDS),
      limit: positiveInt(env, ipLimitVar),
    },
  ];
  if (sessionId) {
    checks.push({
      bucket: `${prefix}session:${sessionId}`,
      windowStart: SESSION_WINDOW,
      limit: positiveInt(env, sessionLimitVar),
    });
  }
  return checks;
}

export async function enforceRateLimits(env, { ip, sessionId }, nowMs = Date.now()) {
  const checks = await limitChecks(env, {
    ip,
    sessionId,
    prefix: "",
    ipLimitVar: "RATE_LIMIT_PER_IP_PER_DAY",
    sessionLimitVar: "RATE_LIMIT_PER_SESSION",
  }, nowMs);
  await consume(env, checks, "rate_limited");
}

export async function enforceLeadSessionLimits(env, ip, nowMs = Date.now()) {
  const checks = await limitChecks(env, {
    ip, prefix: "lead-session-", ipLimitVar: "LEAD_SESSION_LIMIT_PER_IP_PER_DAY",
  }, nowMs);
  await consume(env, checks, "rate_limited");
}

export async function enforceLeadLimits(env, { ip, sessionId }, nowMs = Date.now()) {
  const checks = await limitChecks(env, {
    ip, sessionId, prefix: "lead-", ipLimitVar: "LEAD_LIMIT_PER_IP_PER_DAY",
    sessionLimitVar: "LEAD_LIMIT_PER_SESSION",
  }, nowMs);
  await consume(env, checks, "rate_limited");
}

export async function enforceLeadVolume(env, nowMs = Date.now()) {
  const nowSeconds = Math.floor(nowMs / 1000);
  await consume(env, [{
    bucket: "lead-global",
    windowStart: nowSeconds - (nowSeconds % DAY_SECONDS),
    limit: positiveInt(env, "LEAD_LIMIT_PER_DAY"),
  }], "rate_limited");
}

export async function enforceEventLimits(env, { ip, sessionId }, nowMs = Date.now()) {
  const checks = await limitChecks(env, {
    ip,
    sessionId,
    prefix: "event-",
    ipLimitVar: "EVENT_LIMIT_PER_IP_PER_DAY",
    sessionLimitVar: "EVENT_LIMIT_PER_SESSION",
  }, nowMs);
  await consume(env, checks, "event_limit");
}

export async function enforceChatLimits(env, { ip, sessionId }, nowMs = Date.now()) {
  const checks = await limitChecks(env, {
    ip,
    sessionId,
    prefix: "chat-",
    ipLimitVar: "CHAT_LIMIT_PER_IP_PER_DAY",
    sessionLimitVar: "CHAT_LIMIT_PER_SESSION",
  }, nowMs);
  await consume(env, checks, "chat_limit");
}
