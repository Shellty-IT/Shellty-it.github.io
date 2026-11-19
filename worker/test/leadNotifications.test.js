import { env } from "cloudflare:test";
import { afterEach, expect, it, vi } from "vitest";
import worker from "../src/index.js";
import { createSessionToken } from "../src/session.js";

const bindings = { ...env, RESEND_API_KEY: "test-key", LEAD_MAIL_FROM: "zgloszenia@mail.shellty.pl", LEAD_MAIL_TO: "kontakt@shellty.pl" };

async function submit(path, token, body) {
  return worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), bindings);
}

afterEach(() => vi.restoreAllMocks());

it("emails all three sources and subsequent notes, and queues only accepted leads", async () => {
  const emails = [];
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    emails.push(JSON.parse(init.body));
    return Response.json({ id: "resend-message" });
  });
  for (const source of ["qualifier", "chat", "contact"]) {
    const { token } = await createSessionToken(bindings);
    const body = {
      email: `${source}@example.test`, source, consent: true, consentText: "Zgoda testowa",
      answers: { service: "website", timeline: "asap" },
      ...(source === "contact" && { name: "Kontakt", message: "Pytanie z formularza", consent: undefined }),
      ...(source === "chat" && { chatSummary: "Potrzebuję rezerwacji online." }),
    };
    expect((await submit("/lead", token, body)).status).toBe(201);
    expect((await submit("/lead", token, { ...body, fax: "bot" })).status).toBe(201);
    if (source === "chat") expect((await submit("/lead/note", token, { note: "Najlepiej po południu." })).status).toBe(200);
  }

  await worker.scheduled({}, bindings);
  for (const [url, request] of fetch.mock.calls) {
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.headers.Authorization).toBe("Bearer test-key");
  }
  expect(emails.map(({ subject }) => subject)).toEqual([
    "Nowe zgłoszenie Shellty · Dobierz rozwiązanie",
    "Nowe zgłoszenie Shellty · Czat",
    "Dopisek do zgłoszenia Shellty · Czat",
    "Nowe zgłoszenie Shellty · Formularz kontaktowy",
  ]);
  expect(emails[0].text).toContain("qualifier@example.test");
  expect(emails[0].text).toContain("Nowa strona internetowa");
  expect(emails[1].text).toContain("Potrzebuję rezerwacji online.");
  expect(emails[2].text).toContain("Najlepiej po południu.");
  expect(emails[3].text).toContain("Pytanie z formularza");
  expect(emails[3].reply_to).toBe("contact@example.test");
  expect(emails.every(({ to }) => to[0] === "kontakt@shellty.pl")).toBe(true);
  expect((await bindings.DB.prepare("SELECT COUNT(*) AS count FROM lead_notifications WHERE accepted_at IS NOT NULL AND provider_id IS NOT NULL").first()).count).toBe(4);
  await worker.scheduled({}, bindings);
  expect(fetch).toHaveBeenCalledTimes(4);
});

it("keeps unsuccessful notifications for retry without resubmitting a lead", async () => {
  const { token } = await createSessionToken(bindings);
  const fetch = vi.spyOn(globalThis, "fetch")
    .mockImplementationOnce(async () => Response.json({ error: "unavailable" }, { status: 503 }))
    .mockImplementationOnce(async () => Response.json({ ok: false }))
    .mockImplementationOnce(async () => Response.json({ id: "resend-message" }));
  expect((await submit("/lead", token, {
    email: "retry@example.test", source: "qualifier", consent: true, consentText: "Zgoda testowa",
  })).status).toBe(201);

  await worker.scheduled({}, bindings);
  await worker.scheduled({}, bindings);
  expect(fetch).toHaveBeenCalledTimes(1);
  await bindings.DB.prepare("UPDATE lead_notifications SET next_attempt_at = 0").run();
  await worker.scheduled({}, bindings);
  expect(fetch).toHaveBeenCalledTimes(2);
  await bindings.DB.prepare("UPDATE lead_notifications SET next_attempt_at = 0").run();
  await worker.scheduled({}, bindings);
  await worker.scheduled({}, bindings);
  expect(fetch).toHaveBeenCalledTimes(3);
  const keys = fetch.mock.calls.map(([, init]) => init.headers["Idempotency-Key"]);
  expect(new Set(keys).size).toBe(1);
  expect((await bindings.DB.prepare("SELECT COUNT(*) AS count FROM leads WHERE email = 'retry@example.test'").first()).count).toBe(1);
});

it("keeps rejected notifications and exposes their error without repeating permanent failures", async () => {
  const { token } = await createSessionToken(bindings);
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 403 }));
  expect((await submit("/lead", token, {
    source: "contact", name: "Kontakt", email: "rejected@example.test", message: "Test odrzuconej wysyłki",
  })).status).toBe(201);
  await worker.scheduled({}, bindings);
  await worker.scheduled({}, bindings);
  expect(fetch).toHaveBeenCalledTimes(1);
  const notification = await bindings.DB.prepare(
    "SELECT failed_at, last_error, accepted_at FROM lead_notifications WHERE last_error = 'http_403'",
  ).first();
  expect(notification.failed_at).toBeGreaterThan(0);
  expect(notification.accepted_at).toBeNull();
});
