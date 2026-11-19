import { isDevMode } from "./config.js";
import { requireDevAccess } from "./dev.js";
import {
  assertValid,
  clientIp,
  isPlainObject,
  json,
  readJson,
  readText,
} from "./http.js";
import { enforceRateLimits } from "./rateLimit.js";
import { requireSession } from "./session.js";

const HONEYPOT_FIELD = "fax";

const SOURCES = ["qualifier", "chat"];
const LANGS = ["pl", "en"];
const SERVICES = ["website", "app", "fixes", "it", "unsure", "emergency"];
const TIMELINES = ["asap", "month", "quarter", "browsing"];
const SHORT_TIMELINES = ["asap", "month"];

const MAX_NAME = 60;
const MAX_PHONE = 30;
const MAX_EMAIL = 254;
const MAX_PAGE = 200;
const MAX_CHAT_SUMMARY = 2000;
const MAX_FOLLOW_UP = 1000;
const MAX_CONSENT_TEXT = 600;
const MAX_ANSWERS = 20;
const MAX_ANSWER_KEY = 40;
const MAX_ANSWER_TEXT = 500;
const MAX_ANSWER_ITEMS = 10;
const LIST_LIMIT = 100;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePolishPhone(input) {
  const compact = input.replace(/[\s().-]/g, "");
  const match = /^(?:\+48|0048)?([1-9]\d{8})$/.exec(compact);
  return match ? `+48${match[1]}` : null;
}

function isAnswerValue(value) {
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return value.length <= MAX_ANSWER_TEXT;
  return (
    Array.isArray(value) &&
    value.length <= MAX_ANSWER_ITEMS &&
    value.every((item) => typeof item === "string" && item.length <= MAX_ANSWER_TEXT)
  );
}

function readAnswers(value, errors) {
  if (value === undefined || value === null) return {};
  const entries = isPlainObject(value) ? Object.entries(value) : null;
  const valid =
    entries !== null &&
    entries.length <= MAX_ANSWERS &&
    entries.every(([key, answer]) => key.length <= MAX_ANSWER_KEY && isAnswerValue(answer)) &&
    (value.service === undefined || SERVICES.includes(value.service)) &&
    (value.timeline === undefined || TIMELINES.includes(value.timeline));
  if (!valid) {
    errors.answers = "invalid";
    return {};
  }
  return value;
}

export function validateLead(body) {
  const errors = {};
  const name = readText(body, "name", MAX_NAME, errors);
  const phoneInput = readText(body, "phone", MAX_PHONE, errors);
  const email = readText(body, "email", MAX_EMAIL, errors);
  const page = readText(body, "page", MAX_PAGE, errors);
  const chatSummary = readText(body, "chatSummary", MAX_CHAT_SUMMARY, errors);
  const consentText = readText(body, "consentText", MAX_CONSENT_TEXT, errors);
  const answers = readAnswers(body.answers, errors);
  const lang = body.lang ?? "pl";

  const phone = phoneInput ? normalizePolishPhone(phoneInput) : null;
  if (phoneInput && !phone) errors.phone = "invalid";
  if (email && !EMAIL_PATTERN.test(email)) errors.email = "invalid";
  if (!phoneInput && !email) errors.contact = "required";
  if (body.consent !== true) errors.consent = "required";
  if (!consentText) errors.consentText ??= "required";
  if (!SOURCES.includes(body.source)) errors.source = "invalid";
  if (!LANGS.includes(lang)) errors.lang = "invalid";
  assertValid(errors);

  return {
    name,
    phone,
    email: email || null,
    page: page || null,
    chatSummary: chatSummary || null,
    consentText,
    answers,
    source: body.source,
    lang,
  };
}

export function scoreLead({ answers, phone }) {
  if (answers.service === "emergency") return "hot";
  if (answers.timeline === "browsing") return "cold";
  if (SHORT_TIMELINES.includes(answers.timeline) && phone) return "hot";
  return "warm";
}

function logLead(env, lead) {
  if (!isDevMode(env)) {
    console.log(`Nowy lead ${lead.id} (${lead.score}, ${lead.source})`);
    return;
  }
  const lines = [
    `===== NOWY LEAD: ${lead.score.toUpperCase()} =====`,
    `Imię:       ${lead.name || "-"}`,
    `Telefon:    ${lead.phone ?? "-"}`,
    `E-mail:     ${lead.email ?? "-"}`,
    `Źródło:     ${lead.source}, podstrona ${lead.page ?? "-"}, język ${lead.lang}`,
    `Odpowiedzi: ${JSON.stringify(lead.answers)}`,
  ];
  if (lead.chatSummary) lines.push(`Rozmowa:    ${lead.chatSummary}`);
  lines.push(`Id: ${lead.id}, ${lead.createdAt}`);
  console.log(lines.join("\n"));
}

export async function handleLead(request, env) {
  const sessionId = await requireSession(request, env);
  await enforceRateLimits(env, { ip: clientIp(request), sessionId });
  const body = await readJson(request);

  if (body[HONEYPOT_FIELD]) {
    console.warn(`Odrzucono lead z wypełnionym honeypotem (sesja ${sessionId})`);
    return json({ ok: true }, 201);
  }

  const lead = validateLead(body);
  const stored = {
    ...lead,
    id: crypto.randomUUID(),
    score: scoreLead(lead),
    createdAt: new Date().toISOString(),
  };

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO leads (id, session_id, name, phone, email, answers, score, source, page, lang,
         consent, consent_at, consent_text, chat_summary, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11, ?12, ?13, ?11)`,
    ).bind(
      stored.id, sessionId, stored.name, stored.phone, stored.email,
      JSON.stringify(stored.answers), stored.score, stored.source, stored.page, stored.lang,
      stored.createdAt, stored.consentText, stored.chatSummary,
    ),
    env.DB.prepare("INSERT INTO lead_notifications (lead_id) VALUES (?1)").bind(stored.id),
  ]);

  logLead(env, stored);
  return json({ ok: true }, 201);
}

export async function handleLeadNote(request, env) {
  const sessionId = await requireSession(request, env);
  await enforceRateLimits(env, { ip: clientIp(request), sessionId });
  const body = await readJson(request);

  const errors = {};
  const note = readText(body, "note", MAX_FOLLOW_UP, errors);
  if (!note) errors.note ??= "required";
  assertValid(errors);

  const [{ meta }] = await env.DB.batch([
    env.DB.prepare(
      `UPDATE leads SET follow_up = ?1
       WHERE id = (SELECT id FROM leads WHERE session_id = ?2 ORDER BY created_at DESC, id DESC LIMIT 1)`,
    ).bind(note, sessionId),
    env.DB.prepare(
      `INSERT INTO lead_notifications (lead_id, note)
       SELECT id, ?1 FROM leads WHERE session_id = ?2 ORDER BY created_at DESC, id DESC LIMIT 1`,
    ).bind(note, sessionId),
  ]);
  if (meta.changes > 0 && isDevMode(env)) console.log(`Dopisek do leada (sesja ${sessionId}): ${note}`);
  return json({ ok: true });
}

export async function handleListLeads(request, env) {
  await requireDevAccess(request, env);

  const { results } = await env.DB.prepare(
    `SELECT id, created_at, score, source, name, phone, email, page, lang, answers,
       consent_at, consent_text, chat_summary, follow_up
     FROM leads ORDER BY created_at DESC LIMIT ?1`,
  )
    .bind(LIST_LIMIT)
    .all();
  return json({ leads: results.map((row) => ({ ...row, answers: JSON.parse(row.answers) })) });
}
