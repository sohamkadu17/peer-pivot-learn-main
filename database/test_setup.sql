-- Quick Setup Script for Testing Session Scheduling
-- Run this in Supabase SQL Editor after running the main migration

-- 1. Add sample subjects (if not already present)
INSERT INTO public.subjects (name, description) 
VALUES 
  ('Mathematics', 'Algebra, Calculus, Geometry, Statistics'),
  ('Computer Science', 'Programming, Algorithms, Data Structures'),
  ('Physics', 'Mechanics, Thermodynamics, Electromagnetism'),
  ('Chemistry', 'Organic, Inorganic, Physical Chemistry'),
  ('English', 'Literature, Grammar, Writing, Communication'),
  ('Biology', 'Genetics, Ecology, Human Biology'),
  ('History', 'World History, Modern History'),
  ('Economics', 'Microeconomics, Macroeconomics')
ON CONFLICT DO NOTHING;

-- 2. Check if subjects were added
SELECT id, name FROM public.subjects ORDER BY name;

-- 3. Make yourself a mentor (REPLACE 'YOUR_USER_ID' with your actual user ID)
-- To find your user ID, run: SELECT id, email FROM auth.users;

UPDATE public.profiles 
SET 
  total_sessions_taught = 5,
  rating = 4.8,
  username = 'Test Mentor'
WHERE user_id = 'YOUR_USER_ID';

-- Or if you want to make a specific user a mentor by email:
UPDATE public.profiles 
SET 
  total_sessions_taught = 5,
  rating = 4.8,
  username = 'Test Mentor'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 4. Verify mentor was created
SELECT 
  p.user_id, 
  p.username, 
  p.total_sessions_taught, 
  p.rating,
  u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.total_sessions_taught >= 1;

-- 5. Check if session_requests table exists
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'session_requests'
ORDER BY ordinal_position;

-- 6. Check if sessions table has video_room_id column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
AND column_name IN ('video_room_id', 'mentor_approved', 'mentor_response_at');

-- 7. Check if triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_auto_generate_room_id', 'trigger_create_session_from_request');

-- 8. Check if functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('generate_video_room_id', 'auto_generate_room_id', 'create_session_from_request');

-- 9. Enable Realtime for tables (run these one by one)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 10. Test room ID generation manually
SELECT generate_video_room_id();
SELECT generate_video_room_id();
SELECT generate_video_room_id();

-- Should return something like: room-a3b5c7d9

-- 11. Create a test session request (REPLACE USER IDs)
-- First get your user IDs:
SELECT id, email FROM auth.users LIMIT 5;

-- Then insert (replace the UUIDs with actual ones from above)
INSERT INTO public.session_requests (
  student_id,
  mentor_id,
  subject_id,
  title,
  description,
  requested_time,
  duration,
  status
) VALUES (
  'STUDENT_USER_ID',  -- Replace with actual student user ID
  'MENTOR_USER_ID',   -- Replace with actual mentor user ID
  (SELECT id FROM public.subjects WHERE name = 'Mathematics' LIMIT 1),
  'Help with Calculus',
  'Need help understanding derivatives and integrals',
  NOW() + INTERVAL '1 day',  -- Tomorrow
  60,
  'pending'
);

-- 12. Check if the request was created
SELECT 
  sr.id,
  sr.title,
  sr.status,
  sr.requested_time,
  sr.video_room_id,
  s.name as subject_name,
  p1.username as student_name,
  p2.username as mentor_name
FROM public.session_requests sr
LEFT JOIN public.subjects s ON s.id = sr.subject_id
LEFT JOIN public.profiles p1 ON p1.user_id = sr.student_id
LEFT JOIN public.profiles p2 ON p2.user_id = sr.mentor_id
ORDER BY sr.created_at DESC;

-- 13. Test approval (this should trigger room ID generation)
UPDATE public.session_requests
SET status = 'approved'
WHERE id = (SELECT id FROM public.session_requests WHERE status = 'pending' LIMIT 1);

-- 14. Check if room ID was generated and session was created
SELECT 
  sr.id as request_id,
  sr.title,
  sr.video_room_id as request_room_id,
  s.id as session_id,
  s.video_room_id as session_room_id,
  s.status as session_status
FROM public.session_requests sr
LEFT JOIN public.sessions s ON s.video_room_id = sr.video_room_id
WHERE sr.status = 'approved'
ORDER BY sr.responded_at DESC
LIMIT 5;

-- 15. View all upcoming sessions
SELECT 
  s.id,
  s.title,
  s.scheduled_time,
  s.duration,
  s.status,
  s.video_room_id,
  subj.name as subject_name,
  p1.username as teacher_name,
  p2.username as student_name
FROM public.sessions s
LEFT JOIN public.subjects subj ON subj.id = s.subject_id
LEFT JOIN public.profiles p1 ON p1.user_id = s.teacher_id
LEFT JOIN public.profiles p2 ON p2.user_id = s.student_id
WHERE s.scheduled_time >= NOW()
ORDER BY s.scheduled_time;

-- TROUBLESHOOTING QUERIES

-- If sessions aren't showing up, check RLS policies:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('sessions', 'session_requests')
ORDER BY tablename, policyname;

-- Check if user has proper permissions:
SELECT 
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'authenticated'
AND table_name IN ('sessions', 'session_requests', 'profiles', 'subjects');

-- Reset test data if needed:
DELETE FROM public.session_requests WHERE status IN ('pending', 'rejected');
DELETE FROM public.sessions WHERE status = 'scheduled' AND scheduled_time > NOW();
