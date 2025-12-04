-- Create session_feedback table for storing session feedback
CREATE TABLE IF NOT EXISTS public.session_feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.session_requests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    toxicity_score DECIMAL(3,2) DEFAULT 0.0,
    toxicity_categories JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(session_id, student_id)
);

-- Create shared_resources table for mentors to share resources with peers
CREATE TABLE IF NOT EXISTS public.shared_resources (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.session_requests(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'link', 'video', 'image', 'code', 'other')),
    resource_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_feedback
CREATE POLICY "Users can view their own feedback"
    ON public.session_feedback FOR SELECT
    USING (auth.uid() = student_id OR auth.uid() = mentor_id);

CREATE POLICY "Students can insert their own feedback"
    ON public.session_feedback FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own feedback"
    ON public.session_feedback FOR UPDATE
    USING (auth.uid() = student_id);

-- RLS Policies for shared_resources
CREATE POLICY "Users can view shared resources in their sessions"
    ON public.shared_resources FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.session_requests sr
            WHERE sr.id = shared_resources.session_id
            AND (sr.student_id = auth.uid() OR sr.mentor_id = auth.uid())
        )
        OR shared_by = auth.uid()
    );

CREATE POLICY "Users can share resources in their sessions"
    ON public.shared_resources FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.session_requests sr
            WHERE sr.id = shared_resources.session_id
            AND (sr.student_id = auth.uid() OR sr.mentor_id = auth.uid())
        )
        OR auth.uid() = shared_by
    );

CREATE POLICY "Users can update their own shared resources"
    ON public.shared_resources FOR UPDATE
    USING (auth.uid() = shared_by);

CREATE POLICY "Users can delete their own shared resources"
    ON public.shared_resources FOR DELETE
    USING (auth.uid() = shared_by);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_feedback_session_id ON public.session_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_student_id ON public.session_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_mentor_id ON public.session_feedback(mentor_id);
CREATE INDEX IF NOT EXISTS idx_shared_resources_session_id ON public.shared_resources(session_id);
CREATE INDEX IF NOT EXISTS idx_shared_resources_shared_by ON public.shared_resources(shared_by);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_session_feedback_updated_at BEFORE UPDATE ON public.session_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
