-- APEX — performance indexes on the most-queried columns.
-- Every query in db.ts filters/orders by user_id and optionally date,
-- so composite indexes on (user_id, date) give the biggest win.

-- profiles: queried by primary key (id = user_id) — already indexed as PK,
-- but make it explicit for documentation.
CREATE INDEX IF NOT EXISTS idx_profiles_id
    ON profiles(id);

-- app_state: queried by user_id only
CREATE INDEX IF NOT EXISTS idx_app_state_user_id
    ON app_state(user_id);

-- daily_logs: queried by (user_id, date) — composite covers both columns
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date
    ON daily_logs(user_id, date);

-- metric_history: queried by user_id, ordered by date, limited to 90 rows
CREATE INDEX IF NOT EXISTS idx_metric_history_user_date
    ON metric_history(user_id, date);
