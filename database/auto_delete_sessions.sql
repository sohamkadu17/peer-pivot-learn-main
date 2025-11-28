-- Function to automatically delete completed sessions
CREATE OR REPLACE FUNCTION delete_completed_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete sessions that have ended (scheduled_time + duration_minutes has passed)
    DELETE FROM sessions
    WHERE status = 'scheduled'
      AND mentor_approved = true
      AND scheduled_time + (duration_minutes || ' minutes')::INTERVAL < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the deletion event
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Deleted % completed sessions', deleted_count;
    END IF;
END;
$$;

COMMENT ON FUNCTION delete_completed_sessions() IS 
'Automatically deletes sessions that have completed (scheduled_time + duration has passed). 
Should be run periodically via cron job.';

-- Optional: Schedule to run every 10 minutes
-- SELECT cron.schedule('delete-completed-sessions', '*/10 * * * *', 'SELECT delete_completed_sessions();');
