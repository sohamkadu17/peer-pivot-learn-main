-- Update profiles table to support mentor functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subjects text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_mentor boolean DEFAULT false;

-- Update sessions table to match new requirements
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS start_ts timestamp with time zone;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS end_ts timestamp with time zone;

-- Create RLS policies for mentor functionality
CREATE POLICY "Allow users to update their own mentor profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to view mentor profiles" 
ON public.profiles 
FOR SELECT 
USING (is_mentor = true OR auth.uid() = user_id);

-- Update sessions policies for new flow
DROP POLICY IF EXISTS "Users can view sessions they're part of" ON public.sessions;
CREATE POLICY "Users can view sessions they're part of" 
ON public.sessions 
FOR SELECT 
USING (auth.uid() = teacher_id OR auth.uid() = student_id);

-- Allow session requests
CREATE POLICY "Users can create session requests" 
ON public.sessions 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);