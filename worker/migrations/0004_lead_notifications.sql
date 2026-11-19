CREATE TABLE lead_notifications (
  id INTEGER PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note TEXT,
  next_attempt_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX lead_notifications_due ON lead_notifications (next_attempt_at, id);
