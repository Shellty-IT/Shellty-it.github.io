CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  answers TEXT NOT NULL DEFAULT '{}',
  score TEXT NOT NULL CHECK (score IN ('hot', 'warm', 'cold')),
  source TEXT NOT NULL CHECK (source IN ('qualifier', 'chat')),
  page TEXT,
  lang TEXT NOT NULL CHECK (lang IN ('pl', 'en')),
  consent INTEGER NOT NULL CHECK (consent = 1),
  consent_at TEXT NOT NULL,
  chat_summary TEXT,
  created_at TEXT NOT NULL,
  CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX leads_created_at ON leads (created_at);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  page TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX events_name_created_at ON events (name, created_at);

CREATE TABLE rate_limits (
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);
