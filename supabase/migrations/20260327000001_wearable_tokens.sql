-- wearable_tokens: per-user OAuth tokens for WHOOP and Oura
-- Replaces the single-instance SQLite store so every user has their own tokens.

CREATE TABLE IF NOT EXISTS wearable_tokens (
    id             uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id        uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider       text         NOT NULL CHECK (provider IN ('whoop', 'oura')),
    access_token   text         NOT NULL,
    refresh_token  text,
    expires_at     float8,                 -- Unix epoch (seconds)
    last_synced    text,                   -- ISO-8601 string
    created_at     timestamptz  DEFAULT now(),
    updated_at     timestamptz  DEFAULT now(),
    UNIQUE (user_id, provider)
);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION _set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER wearable_tokens_updated_at
    BEFORE UPDATE ON wearable_tokens
    FOR EACH ROW EXECUTE PROCEDURE _set_updated_at();

-- Row-level security: users can only see their own rows via the anon/user role.
-- The backend uses the service key which bypasses RLS.
ALTER TABLE wearable_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own wearable tokens"
    ON wearable_tokens FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Fast lookup by (user_id, provider) — the most common query pattern
CREATE INDEX idx_wearable_tokens_user_provider ON wearable_tokens (user_id, provider);
