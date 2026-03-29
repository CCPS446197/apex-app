-- Expand the provider allowlist to include Fitbit and Strava
ALTER TABLE wearable_tokens DROP CONSTRAINT IF EXISTS wearable_tokens_provider_check;
ALTER TABLE wearable_tokens ADD CONSTRAINT wearable_tokens_provider_check
  CHECK (provider IN ('whoop', 'oura', 'fitbit', 'strava'));
