-- Drop the problematic triggers that reference the non-existent sessions table
-- These triggers were trying to create entries in public.sessions which doesn't exist

DROP TRIGGER IF EXISTS trigger_create_session_from_request ON public.session_requests;
DROP FUNCTION IF EXISTS create_session_from_request();

-- Keep only the room ID generation trigger (this one is safe)
CREATE OR REPLACE FUNCTION auto_generate_room_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate room ID when status changes to approved
    IF NEW.status = 'approved' AND (NEW.video_room_id IS NULL OR NEW.video_room_id = '') THEN
        NEW.video_room_id := 'room-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
        NEW.responded_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the room ID trigger exists
DROP TRIGGER IF EXISTS trigger_auto_generate_room_id ON public.session_requests;
CREATE TRIGGER trigger_auto_generate_room_id
    BEFORE UPDATE ON public.session_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_room_id();

-- Verify the fix
SELECT 'Triggers on session_requests:' as info;
SELECT tgname, proname 
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'public.session_requests'::regclass;
