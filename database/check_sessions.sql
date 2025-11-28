-- Quick check to see if sessions exist and what data they have
-- Run this in Supabase SQL Editor

-- Check if sessions table has the required columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;

-- Check all sessions
SELECT 
  id,
  title,
  scheduled_time,
  duration,
  status,
  video_room_id,
  teacher_id,
  student_id,
  subject_id,
  created_at
FROM public.sessions
ORDER BY created_at DESC
LIMIT 10;

-- Check session_requests
SELECT 
  id,
  title,
  requested_time,
  duration,
  status,
  video_room_id,
  mentor_id,
  student_id,
  subject_id,
  created_at
FROM public.session_requests
ORDER BY created_at DESC
LIMIT 10;

-- Check if you have any approved requests that should have created sessions
SELECT 
  sr.id as request_id,
  sr.title,
  sr.status as request_status,
  sr.video_room_id as request_room_id,
  s.id as session_id,
  s.video_room_id as session_room_id,
  s.status as session_status
FROM public.session_requests sr
LEFT JOIN public.sessions s ON s.video_room_id = sr.video_room_id
WHERE sr.status = 'approved'
ORDER BY sr.responded_at DESC;

-- Check upcoming sessions for current user
-- Replace 'YOUR_USER_ID' with your actual user ID
SELECT 
  s.*
FROM public.sessions s
WHERE (s.teacher_id = 'YOUR_USER_ID' OR s.student_id = 'YOUR_USER_ID')
  AND s.scheduled_time >= NOW()
ORDER BY s.scheduled_time;

-- Get your user ID
SELECT id, email FROM auth.users LIMIT 5;
