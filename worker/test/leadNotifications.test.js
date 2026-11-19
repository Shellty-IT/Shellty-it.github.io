import { env } from "cloudflare:test";
import { afterEach, expect, it, vi } from "vitest";
import worker from "../src/index.js";
import { createSessionToken } from "../src/session.js";

const bindings = { ...env, LEAD_NOTIFICATION_ENDPOINT: "https://formspree.test/f/notification" };

async function submit(path, token, body) {
  return worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), bindings);
}

afterEach(() => vi.restoreAllMocks());

it("emails both sources and subsequent notes, and queues only accepted leads", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ ok: true }));
  for (const source of ["qualifier", "chat"]) {
    const { token } = await createSessionToken(bindings);
    const body = {
      email: `${source}@example.test`, source, consent: true, consentText: "Zgoda testowa",
      answers: { service: "website", timeline: "asap" },
      ...(source === "chat" && { chatSummary: "Potrzebuję rezerwacji online." }),
    };
    expect((await submit("/lead", token, body)).status).toBe(201);
    expect((await submit("/lead", token, { ...body, fax: "bot" })).status).toBe(201);
    if (source === "chat") expect((await submit("/lead/note", token, { note: "Najlepiej po południu." })).status).toBe(200);
  }

  await worker.scheduled({}, bindings);
  const emails = fetch.mock.calls.map(([, request]) => JSON.parse(request.body));
  expect(emails.map(({ subject }) => subject)).toEqual([
    "Nowe zgłoszenie Shellty · Dobierz rozwiązanie",
    "Nowe zgłoszenie Shellty · Czat",
    "Dopisek do zgłoszenia Shellty · Czat",
  ]);
  expect(emails[0].message).toContain("qualifier@example.test");
  expect(emails[0].message).toContain("Nowa strona internetowa");
  expect(emails[1].message).toContain("Potrzebuję rezerwacji online.");
  expect(emails[2].message).toContain("Najlepiej po południu.");
  await worker.scheduled({}, bindings);
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("keeps unsuccessful notifications for retry without resubmitting a lead", async () => {
  const { token } = await createSessionToken(bindings);
  const fetch = vi.spyOn(globalThis, "fetch")
    .mockImplementationOnce(async () => Response.json({ error: "unavailable" }, { status: 503 }))
    .mockImplementationOnce(async () => Response.json({ ok: false }))
    .mockImplementationOnce(async () => Response.json({ ok: true }));
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
  expect((await bindings.DB.prepare("SELECT COUNT(*) AS count FROM leads WHERE email = 'retry@example.test'").first()).count).toBe(1);
});
