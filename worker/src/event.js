import { assertValid, clientIp, isPlainObject, json, readJson, readText } from "./http.js";
import { enforceEventLimits } from "./rateLimit.js";
import { requireSession } from "./session.js";

const PAGE_EVENTS = new Set([
  "qualifier_open",
  "qualifier_step",
  "qualifier_closed_midway",
  "chat_open",
  "chat_teaser_shown",
  "chat_message",
  "chat_step",
  "contact_card_shown",
  "lead_submitted",
]);

const MAX_PAGE = 200;
const MAX_DATA_FIELDS = 10;
const MAX_DATA_KEY = 40;
const MAX_DATA_TEXT = 60;

function isEventValue(value) {
  return (
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" && value.length <= MAX_DATA_TEXT)
  );
}

function readEventData(value, errors) {
  if (value === undefined || value === null) return {};
  const entries = isPlainObject(value) ? Object.entries(value) : null;
  const valid =
    entries !== null &&
    entries.length <= MAX_DATA_FIELDS &&
    entries.every(([key, item]) => key.length <= MAX_DATA_KEY && isEventValue(item));
  if (!valid) {
    errors.data = "invalid";
    return {};
  }
  return value;
}

export function recordEvent(env, { sessionId, name, page, data = {} }) {
  return env.DB.prepare(
    "INSERT INTO events (session_id, name, page, data, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
  )
    .bind(sessionId, name, page || null, JSON.stringify(data), new Date().toISOString())
    .run();
}

export async function handleEvent(request, env) {
  const sessionId = await requireSession(request, env);
  await enforceEventLimits(env, { ip: clientIp(request), sessionId });
  const body = await readJson(request);

  const errors = {};
  if (!PAGE_EVENTS.has(body.name)) errors.name = "invalid";
  const page = readText(body, "page", MAX_PAGE, errors);
  const data = readEventData(body.data, errors);
  assertValid(errors);

  await recordEvent(env, { sessionId, name: body.name, page, data });
  return json({ ok: true }, 201);
}
