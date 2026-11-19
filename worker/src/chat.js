import { runAssistant } from "./ai/assistant.js";
import { recordEvent } from "./event.js";
import { HttpError, assertValid, clientIp, json, readJson, readText } from "./http.js";
import { enforceChatLimits, enforceRateLimits } from "./rateLimit.js";
import { requireSession } from "./session.js";

const MAX_USER_MESSAGE = 500;
const MAX_ASSISTANT_MESSAGE = 1000;
const MAX_MESSAGES = 40;
const HISTORY_LIMIT = 16;
const MAX_PAGE = 200;
const MAX_CONTEXT = 1000;
const LANGS = ["pl", "en"];

function readHistory(value, errors) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    errors.messages = "invalid";
    return [];
  }
  const valid = value.every(
    (message) =>
      (message?.role === "user" || message?.role === "assistant") &&
      typeof message.content === "string" &&
      message.content.trim() !== "" &&
      message.content.length <= (message.role === "user" ? MAX_USER_MESSAGE : MAX_ASSISTANT_MESSAGE),
  );
  if (!valid || value[value.length - 1].role !== "user") {
    errors.messages = "invalid";
    return [];
  }
  return value.slice(-HISTORY_LIMIT).map(({ role, content }) => ({ role, content: content.trim() }));
}

export async function handleChat(request, env) {
  const sessionId = await requireSession(request, env);
  const ip = clientIp(request);
  await enforceRateLimits(env, { ip, sessionId });
  const body = await readJson(request);

  const errors = {};
  const history = readHistory(body.messages, errors);
  const page = readText(body, "page", MAX_PAGE, errors);
  const context = readText(body, "context", MAX_CONTEXT, errors);
  const lang = body.lang ?? "pl";
  if (!LANGS.includes(lang)) errors.lang = "invalid";
  assertValid(errors);

  try {
    await enforceChatLimits(env, { ip, sessionId });
  } catch (error) {
    if (error instanceof HttpError && error.code === "chat_limit") {
      console.log("[chat] limit reached, scripted fallback");
      await recordEvent(env, { sessionId, name: "ai_fallback", page, data: { reason: "limit" } });
      return json({ fallback: true, reason: "limit" });
    }
    throw error;
  }

  const result = await runAssistant(env, { history, lang, page, context });
  const summary = result.attempts.map(({ provider, outcome, ms }) => `${provider}:${outcome}${ms === undefined ? "" : `/${ms}ms`}`);
  console.log(`[chat] ${result.fallback ? "fallback" : `provider=${result.provider}`} attempts=${summary.join(",") || "none"}`);

  if (result.fallback) {
    await recordEvent(env, { sessionId, name: "ai_fallback", page, data: { reason: "providers" } });
    return json({ fallback: true, reason: "providers" });
  }
  const used = result.attempts.find(({ outcome }) => outcome === "ok");
  await recordEvent(env, {
    sessionId,
    name: "ai_provider_used",
    page,
    data: { provider: result.provider, ms: used?.ms ?? 0, attempts: result.attempts.length },
  });
  const { reply, quickReplies, action, signals } = result;
  return json({ reply, quickReplies, action, signals });
}
