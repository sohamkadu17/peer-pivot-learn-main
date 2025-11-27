-- Create core tables for Study Circle platform

-- Subjects table
CREATE TABLE public.subjects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles table to extend auth.users
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    username TEXT,
    college_email TEXT,
    credits INTEGER DEFAULT 0,
    total_sessions_taught INTEGER DEFAULT 0,
    total_sessions_attended INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Resources table for learning materials
CREATE TABLE public.resources (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ai_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Doubts table for Q&A
CREATE TABLE public.doubts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ai_answer TEXT,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sessions table - core of the platform
CREATE TABLE public.sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER DEFAULT 60,
    credits_cost INTEGER DEFAULT 5,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    meeting_link TEXT,
    notes TEXT,
    whiteboard_data JSONB DEFAULT '{}',
    session_recording_url TEXT,
    is_interactive BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Session resources junction table
CREATE TABLE public.session_resources (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quizzes for interactive sessions
CREATE TABLE public.quizzes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- Quiz questions
CREATE TABLE public.quiz_questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
    options JSONB DEFAULT '[]',
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0
);

-- Quiz attempts by students
CREATE TABLE public.quiz_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(quiz_id, student_id)
);

-- Polls for live session engagement
CREATE TABLE public.polls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    allow_multiple BOOLEAN DEFAULT false
);

-- Poll votes
CREATE TABLE public.poll_votes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_options JSONB DEFAULT '[]',
    voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(poll_id, voter_id)
);

-- Whiteboards for collaborative drawing
CREATE TABLE public.whiteboards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Session Whiteboard',
    content JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ratings and feedback system
CREATE TABLE public.ratings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(session_id, rater_id, rated_user_id)
);

-- User badges system
CREATE TABLE public.badges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    criteria JSONB DEFAULT '{}'
);

-- User badge achievements
CREATE TABLE public.user_badges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- Subject relationships for teaching/learning
CREATE TABLE public.user_subjects_teach (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    UNIQUE(user_id, subject_id)
);

CREATE TABLE public.user_subjects_learn (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    UNIQUE(user_id, subject_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whiteboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects_teach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects_learn ENABLE ROW LEVEL SECURITY;

-- Subjects policies (publicly readable)
CREATE POLICY "Subjects are viewable by everyone" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can insert subjects" ON public.subjects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Resources policies
CREATE POLICY "Resources are viewable by everyone" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Users can upload resources" ON public.resources FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can update their own resources" ON public.resources FOR UPDATE USING (auth.uid() = uploaded_by);

-- Doubts policies
CREATE POLICY "Doubts are viewable by everyone" ON public.doubts FOR SELECT USING (true);
CREATE POLICY "Users can create doubts" ON public.doubts FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users can update their own doubts" ON public.doubts FOR UPDATE USING (auth.uid() = student_id);

-- Sessions policies
CREATE POLICY "Users can view sessions they're part of" ON public.sessions FOR SELECT USING (auth.uid() = teacher_id OR auth.uid() = student_id);
CREATE POLICY "Students can create sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teachers can update their sessions" ON public.sessions FOR UPDATE USING (auth.uid() = teacher_id);

-- Session resources policies
CREATE POLICY "Session participants can view resources" ON public.session_resources FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND (teacher_id = auth.uid() OR student_id = auth.uid()))
);
CREATE POLICY "Session participants can add resources" ON public.session_resources FOR INSERT WITH CHECK (
    auth.uid() = added_by AND EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND (teacher_id = auth.uid() OR student_id = auth.uid()))
);

-- Quizzes policies
CREATE POLICY "Session participants can view quizzes" ON public.quizzes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND (teacher_id = auth.uid() OR student_id = auth.uid()))
);
CREATE POLICY "Teachers can create quizzes" ON public.quizzes FOR INSERT WITH CHECK (
    auth.uid() = created_by AND EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND teacher_id = auth.uid())
);

-- Quiz questions policies
CREATE POLICY "Quiz participants can view questions" ON public.quiz_questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quizzes q JOIN public.sessions s ON q.session_id = s.id 
             WHERE q.id = quiz_id AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid()))
);
CREATE POLICY "Quiz creators can manage questions" ON public.quiz_questions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.created_by = auth.uid())
);

-- Quiz attempts policies
CREATE POLICY "Users can view their own attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can create attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Polls policies
CREATE POLICY "Session participants can view polls" ON public.polls FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND (teacher_id = auth.uid() OR student_id = auth.uid()))
);
CREATE POLICY "Teachers can create polls" ON public.polls FOR INSERT WITH CHECK (
    auth.uid() = created_by AND EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND teacher_id = auth.uid())
);

-- Poll votes policies
CREATE POLICY "Users can view poll votes" ON public.poll_votes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.polls p JOIN public.sessions s ON p.session_id = s.id 
             WHERE p.id = poll_id AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid()))
);
CREATE POLICY "Session participants can vote" ON public.poll_votes FOR INSERT WITH CHECK (
    auth.uid() = voter_id AND EXISTS (SELECT 1 FROM public.polls p JOIN public.sessions s ON p.session_id = s.id 
                                      WHERE p.id = poll_id AND (s.teacher_id = auth.uid() OR s.student_id = auth.uid()))
);

-- Whiteboards policies
CREATE POLICY "Session participants can view whiteboards" ON public.whiteboards FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND (teacher_id = auth.uid() OR student_id = auth.uid()))
);
CREATE POLICY "Session participants can update whiteboards" ON public.whiteboards FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND (teacher_id = auth.uid() OR student_id = auth.uid()))
);

-- Ratings policies
CREATE POLICY "Users can view ratings for their sessions" ON public.ratings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND (teacher_id = auth.uid() OR student_id = auth.uid()))
);
CREATE POLICY "Users can rate their session partners" ON public.ratings FOR INSERT WITH CHECK (
    auth.uid() = rater_id AND EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND (teacher_id = auth.uid() OR student_id = auth.uid()))
);

-- Badges policies
CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (true);

-- User badges policies
CREATE POLICY "User badges are viewable by everyone" ON public.user_badges FOR SELECT USING (true);

-- Subject relationship policies
CREATE POLICY "Users can manage their teaching subjects" ON public.user_subjects_teach FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their learning subjects" ON public.user_subjects_learn FOR ALL USING (auth.uid() = user_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, college_email, credits)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username', NEW.raw_user_meta_data ->> 'college_email', 100);
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whiteboards_updated_at
    BEFORE UPDATE ON public.whiteboards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_sessions_teacher_id ON public.sessions(teacher_id);
CREATE INDEX idx_sessions_student_id ON public.sessions(student_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_resources_subject_id ON public.resources(subject_id);
CREATE INDEX idx_doubts_subject_id ON public.doubts(subject_id);
CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_order ON public.quiz_questions(order_index);

-- Insert some initial subjects
INSERT INTO public.subjects (name, description) VALUES
('Mathematics', 'Mathematics and related topics'),
('Computer Science', 'Programming, algorithms, and computer science concepts'),
('Physics', 'Physics and applied physics'),
('Chemistry', 'Chemistry and chemical engineering'),
('Biology', 'Biology and life sciences'),
('English', 'English language and literature'),
('History', 'History and social studies'),
('Economics', 'Economics and business studies'),
('Engineering', 'Engineering disciplines'),
('Statistics', 'Statistics and data analysis');

-- Insert some sample badges
INSERT INTO public.badges (name, description, icon) VALUES
('First Session', 'Completed your first learning session', '🎓'),
('Great Teacher', 'Received 5+ ratings of 4 stars or higher', '⭐'),
('Knowledge Seeker', 'Attended 10+ learning sessions', '📚'),
('Quiz Master', 'Created 5+ interactive quizzes', '🧠'),
('Helpful Peer', 'Answered 20+ doubts from other students', '🤝'),
('Session Streak', 'Completed sessions for 7 consecutive days', '🔥');