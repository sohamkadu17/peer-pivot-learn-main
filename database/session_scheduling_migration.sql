-- Add video_room_id and mentor approval fields to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS video_room_id TEXT,
ADD COLUMN IF NOT EXISTS mentor_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mentor_response_at TIMESTAMP WITH TIME ZONE;

-- Create session requests table for pending approvals
CREATE TABLE IF NOT EXISTS public.session_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    requested_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 60,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    video_room_id TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.session_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_requests
CREATE POLICY "Users can view their own session requests"
    ON public.session_requests FOR SELECT
    USING (auth.uid() = student_id OR auth.uid() = mentor_id);

CREATE POLICY "Students can create session requests"
    ON public.session_requests FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Mentors can update their session requests"
    ON public.session_requests FOR UPDATE
    USING (auth.uid() = mentor_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_session_requests_mentor ON public.session_requests(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_session_requests_student ON public.session_requests(student_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_video_room ON public.sessions(video_room_id);

-- Function to generate unique room ID
CREATE OR REPLACE FUNCTION generate_video_room_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := 'room-';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate video room ID on session request approval
CREATE OR REPLACE FUNCTION auto_generate_room_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND NEW.video_room_id IS NULL THEN
        NEW.video_room_id := generate_video_room_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_room_id
    BEFORE UPDATE ON public.session_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_room_id();

-- Function to create session from approved request
CREATE OR REPLACE FUNCTION create_session_from_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
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

CREATE TRIGGER trigger_create_session_from_request
    AFTER UPDATE ON public.session_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_session_from_request();
