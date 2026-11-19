ALTER TABLE leads ADD COLUMN follow_up TEXT;

CREATE INDEX leads_session_created_at ON leads (session_id, created_at);
