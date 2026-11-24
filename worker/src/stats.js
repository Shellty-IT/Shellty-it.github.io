import { requireDevAccess } from "./dev.js";
import { json } from "./http.js";

const FUNNEL = [
  ["qualifierOpened", "qualifier_open"],
  ["leftMidway", "qualifier_closed_midway"],
  ["chatOpened", "chat_open"],
  ["contactCardShown", "contact_card_shown"],
  ["leadSubmitted", "lead_submitted"],
];

export async function handleStats(request, env) {
  await requireDevAccess(request, env);

  const [events, steps, providers, leads] = await env.DB.batch([
    env.DB.prepare(
      "SELECT name, COUNT(*) AS total, COUNT(DISTINCT session_id) AS sessions FROM events GROUP BY name",
    ),
    env.DB.prepare(
      `SELECT name, json_extract(data, '$.step') AS step, COUNT(DISTINCT session_id) AS sessions
       FROM events WHERE name IN ('qualifier_step', 'chat_step') GROUP BY name, step ORDER BY sessions DESC`,
    ),
    env.DB.prepare(
      `SELECT name, COALESCE(json_extract(data, '$.provider'), json_extract(data, '$.reason')) AS detail,
         COUNT(*) AS total
       FROM events WHERE name IN ('ai_provider_used', 'ai_fallback') GROUP BY name, detail`,
    ),
    env.DB.prepare("SELECT source, score, COUNT(*) AS total FROM leads GROUP BY source, score"),
  ]);

  const byName = Object.fromEntries(events.results.map(({ name, total, sessions }) => [name, { total, sessions }]));
  const funnel = Object.fromEntries(FUNNEL.map(([key, name]) => [key, byName[name]?.sessions ?? 0]));
  return json({
    funnel,
    events: byName,
    steps: steps.results,
    ai: providers.results,
    leads: leads.results,
  });
}
