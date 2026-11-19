import { positiveInt, requiredSecret } from "./config.js";
import { encodeText, fromBase64Url, hmacSign, hmacVerify, toBase64Url } from "./crypto.js";
import { HttpError, bearerToken, clientIp, json, readJson } from "./http.js";
import { enforceLeadSessionLimits, enforceRateLimits } from "./rateLimit.js";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TIMEOUT_MS = 5000;
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

export async function createSessionToken(env, nowMs = Date.now(), purpose) {
  const expiresAt = Math.floor(nowMs / 1000) + positiveInt(env, "SESSION_TTL_SECONDS");
  const payload = toBase64Url(encodeText(JSON.stringify({ sid: crypto.randomUUID(), exp: expiresAt, purpose })));
  const signature = await hmacSign(requiredSecret(env, "SESSION_SIGNING_KEY"), payload);
  return {
    token: `${payload}.${toBase64Url(signature)}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export async function verifySessionToken(env, token, nowMs = Date.now(), purpose) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;

  let claims;
  try {
    const signatureValid = await hmacVerify(
      requiredSecret(env, "SESSION_SIGNING_KEY"),
      payload,
      fromBase64Url(signature),
    );
    if (!signatureValid) return null;
    claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
  } catch (error) {
    if (error instanceof DOMException || error instanceof SyntaxError) return null;
    throw error;
  }

  if (typeof claims?.sid !== "string" || !Number.isInteger(claims.exp)) return null;
  if (claims.purpose !== undefined && claims.purpose !== purpose) return null;
  if (claims.exp * 1000 <= nowMs) return null;
  return claims.sid;
}

export async function requireSession(request, env, purpose) {
  const token = bearerToken(request);
  const sessionId = token ? await verifySessionToken(env, token, Date.now(), purpose) : null;
  if (!sessionId) throw new HttpError(401, "invalid_session");
  return sessionId;
}

export async function handleLeadSession(request, env) {
  if (!request.headers.get("Origin")) throw new HttpError(403, "origin_required");
  await enforceLeadSessionLimits(env, clientIp(request));
  return json(await createSessionToken(env, Date.now(), "lead"));
}

async function verifyTurnstile(env, token, ip) {
  const form = new FormData();
  form.append("secret", requiredSecret(env, "TURNSTILE_SECRET"));
  form.append("response", token);
  form.append("remoteip", ip);

  let result;
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Siteverify responded with HTTP ${response.status}`);
    result = await response.json();
  } catch (error) {
    console.error("Turnstile verification unavailable:", error);
    throw new HttpError(502, "turnstile_unavailable");
  }
  return result.success === true;
}

export async function handleSession(request, env) {
  const ip = clientIp(request);
  await enforceRateLimits(env, { ip });
  const body = await readJson(request);
  const token = body.turnstileToken;
  const tokenValid =
    typeof token === "string" &&
    token !== "" &&
    token.length <= MAX_TURNSTILE_TOKEN_LENGTH &&
    (await verifyTurnstile(env, token, ip));
  if (!tokenValid) throw new HttpError(403, "turnstile_failed");
  return json(await createSessionToken(env));
}
