-- Add Google Calendar integration to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_connected_at timestamptz;

-- Add encryption key for tokens (we'll encrypt in the edge functions)
-- Update sessions table to store calendar event data
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS google_event_id text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS google_calendar_id text;