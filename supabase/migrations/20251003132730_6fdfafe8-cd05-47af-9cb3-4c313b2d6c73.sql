-- Create challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  target_metric text NOT NULL,
  target_value integer NOT NULL,
  badge_id uuid,
  points_reward integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create badges table (metadata for badges)
CREATE TABLE IF NOT EXISTS public.badge_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  icon_name text NOT NULL,
  condition_metric text,
  condition_value integer,
  created_at timestamptz DEFAULT now()
);

-- Create user_challenge_progress table
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
  current_value integer DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Create certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid REFERENCES public.badge_types(id),
  title text NOT NULL,
  issued_at timestamptz DEFAULT now(),
  pdf_url text,
  share_token text UNIQUE
);

-- Create events table for tracking user actions
CREATE TABLE IF NOT EXISTS public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create leaderboard cache table
CREATE TABLE IF NOT EXISTS public.leaderboard_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  contribution_score integer DEFAULT 0,
  rank integer,
  updated_at timestamptz DEFAULT now()
);

-- Add contribution_score to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS contribution_score integer DEFAULT 0;

-- Add user_badges junction table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid REFERENCES public.badge_types(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Challenges viewable by all" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Badge types viewable by all" ON public.badge_types FOR SELECT USING (true);

CREATE POLICY "Users can view own progress" ON public.user_challenge_progress 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own certificates" ON public.certificates 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON public.user_events 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leaderboard viewable by all" ON public.leaderboard_cache 
  FOR SELECT USING (true);

CREATE POLICY "Users can view all badges" ON public.user_badges 
  FOR SELECT USING (true);

-- Function to calculate contribution score
CREATE OR REPLACE FUNCTION calculate_contribution_score(user_profile profiles)
RETURNS integer AS $$
BEGIN
  RETURN COALESCE(user_profile.credits, 0) + 
         (10 * COALESCE(user_profile.total_sessions_taught, 0)) + 
         (5 * COALESCE(
           (SELECT COUNT(*) FROM doubts WHERE student_id = user_profile.user_id AND is_resolved = true), 
           0
         )) +
         (3 * COALESCE(
           (SELECT COUNT(*) FROM resources WHERE uploaded_by = user_profile.user_id),
           0
         ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed badge types (10 programmatic SVG badges)
INSERT INTO public.badge_types (title, description, icon_name, condition_metric, condition_value) VALUES
  ('First Step', 'Completed your first session', 'trophy', 'sessions_completed', 1),
  ('Rising Star', 'Completed 5 sessions', 'star', 'sessions_completed', 5),
  ('Knowledge Seeker', 'Attended 10 sessions', 'book', 'sessions_attended', 10),
  ('Bright Mind', 'Solved 20 problems', 'lightbulb', 'problems_solved', 20),
  ('Team Player', 'Answered 10 doubts', 'handshake', 'doubts_answered', 10),
  ('Defender', 'Helped 15 peers', 'shield', 'doubts_answered', 15),
  ('Innovator', 'Shared 5 resources', 'rocket', 'materials_shared', 5),
  ('Champion', 'Top 10 contributor', 'medal', 'contribution_score', 100),
  ('Achiever', 'Earned 50 points', 'ribbon', 'points', 50),
  ('Master', 'Completed 20 sessions', 'crown', 'sessions_completed', 20)
ON CONFLICT DO NOTHING;

-- Seed sample challenges
INSERT INTO public.challenges (title, description, start_date, end_date, target_metric, target_value, points_reward) VALUES
  ('Weekly Session Goal', 'Complete 3 peer sessions this week', now(), now() + interval '7 days', 'sessions_completed', 3, 50),
  ('Problem Solver', 'Solve 10 DSA problems this week', now(), now() + interval '7 days', 'problems_solved', 10, 75),
  ('Helping Hand', 'Answer 5 doubts this week', now(), now() + interval '7 days', 'doubts_answered', 5, 40)
ON CONFLICT DO NOTHING;