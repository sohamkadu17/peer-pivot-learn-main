-- COMPREHENSIVE FIX: Verify and fix all database issues for session scheduling
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Verify Required Tables Exist
-- ============================================

-- Check if session_requests table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'session_requests'
) as session_requests_exists;

-- Check if sessions table has required columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
  AND column_name IN ('video_room_id', 'mentor_approved', 'scheduled_time', 'teacher_id', 'student_id')
ORDER BY column_name;

-- ============================================
-- STEP 2: Enable Realtime for Session Tables
-- ============================================

-- Enable realtime for sessions table (ignore errors if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.session_requests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STEP 3: Verify RLS Policies
-- ============================================

-- Check RLS policies on session_requests
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'session_requests'
ORDER BY policyname;

-- ============================================
-- STEP 4: Fix Mentor Flags
-- ============================================

-- Set is_mentor flag for all mentors
UPDATE public.profiles 
SET is_mentor = true 
WHERE total_sessions_taught >= 1 OR is_mentor = true;

-- Verify mentors
SELECT 
  user_id,
  username,
  is_mentor,
  total_sessions_taught,
  rating
FROM public.profiles
WHERE is_mentor = true OR total_sessions_taught >= 1
ORDER BY rating DESC NULLS LAST;

-- ============================================
-- STEP 5: Check Existing Session Requests
-- ============================================

-- Show all session requests
SELECT 
  sr.id,
  sr.title,
  sr.status,
  sr.requested_time,
  sr.video_room_id,
  sr.created_at,
  p1.username as student_name,
  p2.username as mentor_name,
  s.name as subject_name
FROM public.session_requests sr
LEFT JOIN public.profiles p1 ON p1.user_id = sr.student_id
LEFT JOIN public.profiles p2 ON p2.user_id = sr.mentor_id
LEFT JOIN public.subjects s ON s.id = sr.subject_id
ORDER BY sr.created_at DESC
LIMIT 10;

-- ============================================
-- STEP 6: Check Existing Sessions
-- ============================================

-- Show all upcoming sessions
SELECT 
  s.id,
  s.title,
  s.scheduled_time,
  s.duration,
  s.status,
  s.video_room_id,
  p1.username as teacher_name,
  p2.username as student_name,
  subj.name as subject_name
FROM public.sessions s
LEFT JOIN public.profiles p1 ON p1.user_id = s.teacher_id
LEFT JOIN public.profiles p2 ON p2.user_id = s.student_id
LEFT JOIN public.subjects subj ON subj.id = s.subject_id
WHERE s.scheduled_time >= NOW()
ORDER BY s.scheduled_time
LIMIT 10;

-- ============================================
-- STEP 7: Create Test Data (if needed)
-- ============================================

-- Only run this if you have no sessions and want to test

-- Create a test session request (will be visible to mentor)
INSERT INTO public.session_requests (
  student_id,
  mentor_id,
  subject_id,
  title,
  description,
  requested_time,
  duration,
  status
)
SELECT 
  auth.uid() as student_id,
  (SELECT user_id FROM public.profiles WHERE is_mentor = true AND user_id != auth.uid() LIMIT 1) as mentor_id,
  (SELECT id FROM public.subjects LIMIT 1) as subject_id,
  'Test Session Request',
  'This is a test request to verify the system works',
  NOW() + INTERVAL '3 hours' as requested_time,
  60 as duration,
  'pending' as status
WHERE auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.profiles WHERE is_mentor = true AND user_id != auth.uid());

-- Create a test approved session (will be visible in upcoming sessions)
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
)
SELECT 
  (SELECT user_id FROM public.profiles WHERE is_mentor = true LIMIT 1) as teacher_id,
  auth.uid() as student_id,
  (SELECT id FROM public.subjects LIMIT 1) as subject_id,
  'Approved Test Session',
  'This session should appear in upcoming sessions',
  NOW() + INTERVAL '2 hours' as scheduled_time,
  60 as duration,
  'scheduled' as status,
  'room-test-' || substr(md5(random()::text), 1, 8) as video_room_id,
  true as mentor_approved
WHERE auth.uid() IS NOT NULL;

-- ============================================
-- STEP 8: Verify Test Data Was Created
-- ============================================

-- Check your pending requests (as student)
SELECT 
  sr.*,
  p.username as mentor_name
FROM public.session_requests sr
LEFT JOIN public.profiles p ON p.user_id = sr.mentor_id
WHERE sr.student_id = auth.uid()
ORDER BY sr.created_at DESC;

-- Check your upcoming sessions (as student or teacher)
SELECT 
  s.*,
  CASE 
    WHEN s.teacher_id = auth.uid() THEN 'You are the teacher'
    ELSE p1.username || ' (teacher)'
  END as teacher_info,
  CASE 
    WHEN s.student_id = auth.uid() THEN 'You are the student'
    ELSE p2.username || ' (student)'
  END as student_info
FROM public.sessions s
LEFT JOIN public.profiles p1 ON p1.user_id = s.teacher_id
LEFT JOIN public.profiles p2 ON p2.user_id = s.student_id
WHERE (s.teacher_id = auth.uid() OR s.student_id = auth.uid())
  AND s.scheduled_time >= NOW()
ORDER BY s.scheduled_time;

-- ============================================
-- SUCCESS CHECK
-- ============================================

-- If this returns data, everything is working!
SELECT 
  'Sessions Table' as check_item,
  COUNT(*) as count
FROM public.sessions
WHERE scheduled_time >= NOW()
UNION ALL
SELECT 
  'Session Requests' as check_item,
  COUNT(*) as count
FROM public.session_requests
WHERE status = 'pending'
UNION ALL
SELECT 
  'Mentors Available' as check_item,
  COUNT(*) as count
FROM public.profiles
WHERE is_mentor = true OR total_sessions_taught >= 1;
