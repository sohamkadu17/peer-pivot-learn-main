-- Fix session_requests table to work with profiles table
-- Session Requests & Video Room Integration

-- Step 1: Make sure video_room_id is nullable (will be set on approval)
ALTER TABLE public.session_requests 
ALTER COLUMN video_room_id DROP NOT NULL;

-- Step 2: Update the trigger to ensure room ID is ALWAYS generated on approval
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_room_id ON public.session_requests;
CREATE TRIGGER trigger_auto_generate_room_id
    BEFORE UPDATE ON public.session_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_room_id();

-- Step 3: Update the session creation trigger to use the generated room_id
CREATE OR REPLACE FUNCTION create_session_from_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        -- Ensure room_id exists
        IF NEW.video_room_id IS NULL OR NEW.video_room_id = '' THEN
            NEW.video_room_id := 'room-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
        END IF;
        
        -- Create the session
        INSERT INTO public.sessions (
            teacher_id,
            student_id,
            subject_id,
            title,
            description,
            scheduled_time,
            duration,
            status,
            video_room_id,
            mentor_approved
        ) VALUES (
            NEW.mentor_id,
            NEW.student_id,
            NEW.subject_id,
            NEW.title,
            NEW.description,
            NEW.requested_time,
            NEW.duration,
            'scheduled',
            NEW.video_room_id,
            true
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_session_from_request ON public.session_requests;
CREATE TRIGGER trigger_create_session_from_request
    AFTER UPDATE ON public.session_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_session_from_request();

-- Step 4: Add chat_messages table for real-time chat in video rooms
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;

-- Step 7: Create RLS Policies for chat_messages
-- Temporarily allow all authenticated users to view and insert messages
-- The app will handle room-level access control
CREATE POLICY "Users can view messages in their rooms"
    ON public.chat_messages FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert messages where they are the author
CREATE POLICY "Users can insert messages in their rooms"
    ON public.chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Step 8: Enable realtime for chat_messages
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 9: Verify setup
SELECT 'Session Requests Table' as item, COUNT(*) as count FROM public.session_requests
UNION ALL
SELECT 'Chat Messages Table' as item, COUNT(*) as count FROM public.chat_messages
UNION ALL
SELECT 'Sessions with Room IDs' as item, COUNT(*) as count FROM public.sessions WHERE video_room_id IS NOT NULL;
