import pl from "../../src/locales/pl/translation.json";

const BATCH_SIZE = 20;
const LEASE_MS = 2 * 60_000;
const RETRY_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 8_000;
const FORM_REFERER = "https://shellty.pl/";

const sources = { qualifier: "Dobierz rozwiązanie", chat: "Czat" };
const priorities = { hot: "pilne", warm: "standardowe", cold: "na później" };
const contactFields = pl.qualifier.contact.fields;
const extraLabels = { siteUrl: "Adres strony", callTime: contactFields.callTime, description: contactFields.description, message: contactFields.message };

export function formatLeadNotification(lead) {
  const source = sources[lead.source];
  const answers = Object.entries(JSON.parse(lead.answers)).map(([key, value]) => {
    const step = Object.hasOwn(pl.qualifier.steps, key) ? pl.qualifier.steps[key] : undefined;
    const label = step?.summary ?? (Object.hasOwn(extraLabels, key) ? extraLabels[key] : key);
    const values = Array.isArray(value) ? value : [value];
    const formatted = values.map((item) => {
      if (typeof item === "boolean") return item ? "Tak" : "Nie";
      if (key === "callTime" && Object.hasOwn(pl.qualifier.contact.callTimes, item)) return pl.qualifier.contact.callTimes[item];
      return step?.options && Object.hasOwn(step.options, item) ? step.options[item].label ?? item : item;
    });
    return `${label}: ${formatted.join(", ")}`;
  });
  const subject = `${lead.note === null ? "Nowe zgłoszenie" : "Dopisek do zgłoszenia"} Shellty · ${source}`;
  const message = [
    `KONTAKT\nImię: ${lead.name || "—"}\nTelefon: ${lead.phone || "—"}\nE-mail: ${lead.email || "—"}`,
    lead.note !== null && `DOPISEK OD KLIENTA\n${lead.note}`,
    answers.length > 0 && `ODPOWIEDZI I SZCZEGÓŁY\n${answers.join("\n")}`,
    lead.chat_summary && `WIADOMOŚCI KLIENTA W CZACIE\n${lead.chat_summary}`,
    `ZGŁOSZENIE\nŹródło: ${source}\nPriorytet: ${priorities[lead.score]}\nPodstrona: ${lead.page || "—"}\nJęzyk: ${lead.lang}\nData (UTC): ${lead.created_at}\nNumer: ${lead.lead_id}`,
    `ZGODA NA KONTAKT\n${lead.consent_text || "Zapisana przy zgłoszeniu."}`,
  ].filter(Boolean).join("\n\n");
  const form = new FormData();
  form.set("subject", subject);
  form.set("message", message);
  return form;
}

export async function deliverLeadNotifications(env) {
  const endpoint = env.LEAD_NOTIFICATION_ENDPOINT;
  if (!endpoint) return;

  const { results } = await env.DB.prepare(
    "SELECT id FROM lead_notifications WHERE next_attempt_at <= ?1 ORDER BY next_attempt_at, id LIMIT ?2",
  ).bind(Date.now(), BATCH_SIZE).all();

  for (const { id } of results) {
    const now = Date.now();
    const { meta } = await env.DB.prepare(
      "UPDATE lead_notifications SET next_attempt_at = ?1 WHERE id = ?2 AND next_attempt_at <= ?3",
    ).bind(now + LEASE_MS, id, now).run();
    if (!meta.changes) continue;

    const lead = await env.DB.prepare(
      `SELECT leads.*, lead_notifications.note, lead_notifications.lead_id
       FROM lead_notifications JOIN leads ON leads.id = lead_notifications.lead_id
       WHERE lead_notifications.id = ?1`,
    ).bind(id).first();
    if (!lead) continue;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json", Referer: FORM_REFERER },
        body: formatLeadNotification(lead),
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error(`Notification response HTTP ${response.status}`);
    } catch (error) {
      console.error("Lead notification failed; retry scheduled", id, `${error.name}: ${error.message}`);
      await env.DB.prepare("UPDATE lead_notifications SET next_attempt_at = ?1 WHERE id = ?2")
        .bind(Date.now() + RETRY_MS, id).run();
      continue;
    }

    await env.DB.prepare("DELETE FROM lead_notifications WHERE id = ?1").bind(id).run();
    console.log("Lead notification accepted by Formspree", id);
  }
}
