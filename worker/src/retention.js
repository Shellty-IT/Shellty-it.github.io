export const RETENTION_CRON = "17 3 * * *";

export async function purgeExpiredData(env, nowMs = Date.now()) {
  const cutoff = new Date(nowMs);
  const month = cutoff.getUTCMonth();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  if (cutoff.getUTCMonth() !== month) cutoff.setUTCDate(0);

  const timestamp = cutoff.toISOString();
  const [leads, events, counters] = await env.DB.batch([
    env.DB.prepare("DELETE FROM leads WHERE created_at <= ?1 AND source IN ('qualifier', 'chat')").bind(timestamp),
    env.DB.prepare("DELETE FROM events WHERE created_at <= ?1").bind(timestamp),
    env.DB.prepare("DELETE FROM rate_limits WHERE last_seen_at > 0 AND last_seen_at <= ?1")
      .bind(Math.floor(cutoff.getTime() / 1000)),
    env.DB.prepare("UPDATE rate_limits SET last_seen_at = ?1 WHERE last_seen_at = 0")
      .bind(Math.floor(nowMs / 1000)),
  ]);
  console.log("Shellty data retention completed", {
    leads: leads.meta.changes, events: events.meta.changes, counters: counters.meta.changes,
  });
}
