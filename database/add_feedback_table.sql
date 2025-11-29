-- Create feedback table for session feedback system
-- This table stores student feedback for completed sessions with toxicity tracking

-- Drop table if exists (for clean migrations)
DROP TABLE IF EXISTS session_feedback CASCADE;

-- Create session_feedback table
CREATE TABLE public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.session_requests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT NOT NULL,
  
  -- Toxicity detection fields
  toxicity_score FLOAT DEFAULT 0,
  toxicity_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one feedback per session per student
  UNIQUE(session_id, student_id)
);

-- Create index for faster queries
CREATE INDEX idx_session_feedback_session_id ON public.session_feedback(session_id);
CREATE INDEX idx_session_feedback_student_id ON public.session_feedback(student_id);
CREATE INDEX idx_session_feedback_mentor_id ON public.session_feedback(mentor_id);
CREATE INDEX idx_session_feedback_created_at ON public.session_feedback(created_at);

-- Enable Row Level Security
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_feedback
-- Students can view their own feedback and feedback they received as mentors
CREATE POLICY "Students and mentors can view feedback"
  ON public.session_feedback FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);

-- Only the student who wrote the feedback can view/update it
CREATE POLICY "Students can insert their own feedback"
  ON public.session_feedback FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own feedback
CREATE POLICY "Students can update their own feedback"
  ON public.session_feedback FOR UPDATE
  USING (auth.uid() = student_id);

-- Admins can delete feedback (optional)
CREATE POLICY "Admins can delete feedback"
  ON public.session_feedback FOR DELETE
  USING (auth.uid() = mentor_id); -- Mentors can delete feedback on their sessions

-- Enable realtime for session_feedback
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_feedback;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_session_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_feedback_timestamp
  BEFORE UPDATE ON public.session_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_feedback_timestamp();

-- Grant permissions
GRANT ALL ON public.session_feedback TO authenticated;
GRANT SELECT ON public.session_feedback TO authenticated;

-- Success message
SELECT 'Session feedback table created successfully!' as status;
