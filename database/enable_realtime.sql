-- Enable Realtime for Session Requests
-- Run this in Supabase SQL Editor to enable real-time notifications

-- Enable realtime for session_requests table
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.session_requests;
EXCEPTION
  WHEN duplicate_object THEN 
    RAISE NOTICE 'Table public.session_requests is already added to realtime';
END $$;

-- Verify realtime is enabled
SELECT 
    schemaname,
    tablename
FROM 
    pg_publication_tables
WHERE 
    pubname = 'supabase_realtime'
    AND tablename IN ('session_requests', 'sessions', 'profiles', 'chat_messages')
ORDER BY tablename;

-- If the above query shows session_requests, it's enabled!
