import { env } from "cloudflare:test";
import { expect, it } from "vitest";
import worker from "../src/index.js";
import { RETENTION_CRON } from "../src/retention.js";

it("purges expired eligible records and their queued notifications at the daily run", async () => {
  const now = Date.parse("2028-02-29T03:17:00.000Z");
  const cutoff = "2027-02-28T03:17:00.000Z";
  const fresh = "2027-02-28T03:17:00.001Z";
  const cutoffSeconds = Date.parse(cutoff) / 1000;
  for (const [id, source, createdAt] of [
    ["expired-chat", "chat", cutoff],
    ["expired-qualifier", "qualifier", cutoff],
    ["fresh-chat", "chat", fresh],
    ["old-contact", "contact", cutoff],
  ]) {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO leads (id, session_id, name, email, score, source, lang, consent, created_at) VALUES (?1, 'session', 'Test', 'test@example.test', 'cold', ?2, 'pl', 1, ?3)",
      ).bind(id, source, createdAt),
      env.DB.prepare("INSERT INTO lead_notifications (lead_id) VALUES (?1)").bind(id),
    ]);
  }
  await env.DB.batch([
    env.DB.prepare("INSERT INTO events (session_id, name, created_at) VALUES ('session', 'old', ?1), ('session', 'new', ?2)").bind(cutoff, fresh),
    env.DB.prepare("INSERT INTO rate_limits VALUES ('old', 0, 1, ?1), ('new', 0, 1, ?2), ('legacy', 0, 1, 0)").bind(cutoffSeconds, cutoffSeconds + 1),
  ]);

  await worker.scheduled({ cron: RETENTION_CRON, scheduledTime: now }, env);

  expect((await env.DB.prepare("SELECT id FROM leads ORDER BY id").all()).results).toEqual([
    { id: "fresh-chat" }, { id: "old-contact" },
  ]);
  expect((await env.DB.prepare("SELECT lead_id FROM lead_notifications ORDER BY lead_id").all()).results).toEqual([
    { lead_id: "fresh-chat" }, { lead_id: "old-contact" },
  ]);
  expect((await env.DB.prepare("SELECT name FROM events").all()).results).toEqual([{ name: "new" }]);
  expect((await env.DB.prepare("SELECT bucket, last_seen_at FROM rate_limits ORDER BY bucket").all()).results).toEqual([
    { bucket: "legacy", last_seen_at: now / 1000 }, { bucket: "new", last_seen_at: cutoffSeconds + 1 },
  ]);
});
