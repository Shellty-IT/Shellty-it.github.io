import pl from "../../src/locales/pl/translation.json";

const BATCH_SIZE = 20;
const LEASE_MS = 2 * 60_000;
const RETRY_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 8_000;
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RETRY_WINDOW_MS = 23 * 60 * 60_000;

const sources = { qualifier: "Dobierz rozwiązanie", chat: "Czat", contact: "Formularz kontaktowy" };
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
    lead.source !== "contact" && `ZGODA NA KONTAKT\n${lead.consent_text || "Zapisana przy zgłoszeniu."}`,
  ].filter(Boolean).join("\n\n");
  return { subject, text: message };
}

export async function deliverLeadNotifications(env) {
  const { RESEND_API_KEY: apiKey, LEAD_MAIL_FROM: from, LEAD_MAIL_TO: to } = env;
  if (!apiKey || !from || !to) return;

  const { results } = await env.DB.prepare(
    `SELECT id FROM lead_notifications WHERE next_attempt_at <= ?1 AND accepted_at IS NULL AND failed_at IS NULL
     ORDER BY next_attempt_at, id LIMIT ?2`,
  ).bind(Date.now(), BATCH_SIZE).all();

  for (const { id } of results) {
    const now = Date.now();
    const { meta } = await env.DB.prepare(
      `UPDATE lead_notifications SET next_attempt_at = ?1, first_attempt_at = COALESCE(first_attempt_at, ?3)
       WHERE id = ?2 AND next_attempt_at <= ?3 AND accepted_at IS NULL AND failed_at IS NULL`,
    ).bind(now + LEASE_MS, id, now).run();
    if (!meta.changes) continue;

    const lead = await env.DB.prepare(
      `SELECT leads.*, lead_notifications.note, lead_notifications.lead_id, lead_notifications.first_attempt_at
       FROM lead_notifications JOIN leads ON leads.id = lead_notifications.lead_id
       WHERE lead_notifications.id = ?1`,
    ).bind(id).first();
    if (!lead) continue;

    let providerId;
    let failure = "retry_window_expired";
    let retryable = false;
    if (now < lead.first_attempt_at + RETRY_WINDOW_MS) {
      try {
        const response = await fetch(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `shellty/${lead.lead_id}/${id}`,
          },
          body: JSON.stringify({ from, to: [to], ...formatLeadNotification(lead), ...(lead.email && { reply_to: lead.email }) }),
          redirect: "manual",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (response.ok) {
          const result = await response.json();
          if (typeof result.id !== "string" || !result.id) throw new Error("missing_message_id");
          providerId = result.id;
        } else {
          failure = `http_${response.status}`;
          retryable = response.status >= 500 || [408, 409, 429].includes(response.status);
        }
      } catch {
        failure = "response_unavailable";
        retryable = true;
      }
    }

    if (providerId) {
      await env.DB.prepare("UPDATE lead_notifications SET accepted_at = ?1, provider_id = ?2, last_error = NULL WHERE id = ?3")
        .bind(Date.now(), providerId, id).run();
      console.log("Lead notification accepted by Resend", lead.lead_id, providerId);
      continue;
    }

    const nextAttempt = Date.now() + RETRY_MS;
    const retry = retryable && nextAttempt < lead.first_attempt_at + RETRY_WINDOW_MS;
    await env.DB.prepare("UPDATE lead_notifications SET next_attempt_at = ?1, failed_at = ?2, last_error = ?3 WHERE id = ?4")
      .bind(nextAttempt, retry ? null : Date.now(), failure, id).run();
    console.error(retry ? "Lead notification retry scheduled" : "Lead notification failed", lead.lead_id, failure);
  }
}
