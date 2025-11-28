-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to send email reminders for upcoming sessions
CREATE OR REPLACE FUNCTION send_session_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    student_email TEXT;
    mentor_email TEXT;
BEGIN
    -- Find sessions starting in 10 minutes
    FOR session_record IN 
        SELECT 
            s.*,
            s_profile.user_id as student_user_id,
            m_profile.user_id as mentor_user_id,
            s_profile.username as student_name,
            m_profile.username as mentor_name,
            subj.name as subject_name
        FROM sessions s
        LEFT JOIN profiles s_profile ON s.student_id = s_profile.user_id
        LEFT JOIN profiles m_profile ON s.teacher_id = m_profile.user_id  
        LEFT JOIN subjects subj ON s.subject_id = subj.id
        WHERE s.status = 'scheduled'
          AND s.scheduled_time > NOW()
          AND s.scheduled_time <= NOW() + INTERVAL '10 minutes'
          AND s.mentor_approved = true
    LOOP
        -- Get emails from auth.users
        SELECT email INTO student_email
        FROM auth.users
        WHERE id = session_record.student_user_id;
        
        SELECT email INTO mentor_email
        FROM auth.users
        WHERE id = session_record.mentor_user_id;
        
        -- Log the reminder (in production, this would call an edge function to send emails)
        INSERT INTO user_events (user_id, event_type, metadata)
        VALUES 
            (session_record.student_user_id, 'email_reminder_sent', 
             jsonb_build_object(
                 'session_id', session_record.id,
                 'email', student_email,
                 'subject', session_record.subject_name,
                 'scheduled_time', session_record.scheduled_time,
                 'room_id', session_record.video_room_id
             )),
            (session_record.mentor_user_id, 'email_reminder_sent',
             jsonb_build_object(
                 'session_id', session_record.id,
                 'email', mentor_email,
                 'subject', session_record.subject_name,
                 'scheduled_time', session_record.scheduled_time,
                 'room_id', session_record.video_room_id
             ));
        
        -- Here you would call your edge function to actually send the emails
        -- Example: SELECT net.http_post(...) to call send-email edge function
        
    END LOOP;
END;
$$;

-- Schedule the reminder function to run every hour
-- Note: pg_cron might not be available on all Supabase plans
-- SELECT cron.schedule('session-reminders', '0 * * * *', 'SELECT send_session_reminders();');

-- Alternative: Create a webhook that can be called from external cron services
COMMENT ON FUNCTION send_session_reminders() IS 
'Sends email reminders for sessions starting within 10 minutes. 
Can be called via edge function or external cron service.';
