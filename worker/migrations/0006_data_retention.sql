ALTER TABLE rate_limits ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0;

UPDATE rate_limits SET last_seen_at = CASE
  WHEN window_start > 0 THEN window_start
  ELSE unixepoch()
END;

CREATE INDEX rate_limits_last_seen_at ON rate_limits (last_seen_at);
CREATE INDEX events_created_at ON events (created_at);
CREATE INDEX lead_notifications_lead_id ON lead_notifications (lead_id);
