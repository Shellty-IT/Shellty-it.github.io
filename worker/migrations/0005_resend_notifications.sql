CREATE TABLE leads_new (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  answers TEXT NOT NULL DEFAULT '{}',
  score TEXT NOT NULL CHECK (score IN ('hot', 'warm', 'cold')),
  source TEXT NOT NULL CHECK (source IN ('qualifier', 'chat', 'contact')),
  page TEXT,
  lang TEXT NOT NULL CHECK (lang IN ('pl', 'en')),
  consent INTEGER NOT NULL CHECK (consent IN (0, 1)),
  consent_at TEXT,
  chat_summary TEXT,
  created_at TEXT NOT NULL,
  follow_up TEXT,
  consent_text TEXT,
  CHECK (phone IS NOT NULL OR email IS NOT NULL),
  CHECK (source = 'contact' OR consent = 1)
);

INSERT INTO leads_new SELECT id, session_id, name, phone, email, answers, score, source,
  page, lang, consent, consent_at, chat_summary, created_at, follow_up, consent_text FROM leads;

CREATE TABLE lead_notifications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id TEXT NOT NULL REFERENCES leads_new(id) ON DELETE CASCADE,
  note TEXT,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  first_attempt_at INTEGER,
  accepted_at INTEGER,
  provider_id TEXT,
  failed_at INTEGER,
  last_error TEXT
);

INSERT INTO lead_notifications_new (id, lead_id, note, next_attempt_at)
  SELECT id, lead_id, note, next_attempt_at FROM lead_notifications;

DROP TABLE lead_notifications;
DROP TABLE leads;
ALTER TABLE leads_new RENAME TO leads;
ALTER TABLE lead_notifications_new RENAME TO lead_notifications;
CREATE INDEX leads_created_at ON leads (created_at);
CREATE INDEX leads_session_created_at ON leads (session_id, created_at);
CREATE INDEX lead_notifications_due ON lead_notifications (next_attempt_at, id)
  WHERE accepted_at IS NULL AND failed_at IS NULL;
