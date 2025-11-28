-- Create test sessions to see on the dashboard
-- Run this in Supabase SQL Editor

-- First, get your user IDs
SELECT id, email, 
  (SELECT username FROM profiles WHERE user_id = auth.users.id) as username
FROM auth.users 
ORDER BY created_at DESC
LIMIT 5;

-- Then replace USER_ID_1 and USER_ID_2 with actual IDs from above
-- Also replace SUBJECT_ID with a real subject ID

-- Get subject IDs
SELECT id, name FROM subjects LIMIT 10;

-- Create a test session (REPLACE THE IDs!)
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
  'TEACHER_USER_ID_HERE',  -- Replace with mentor/teacher user ID
  'STUDENT_USER_ID_HERE',  -- Replace with student user ID
  (SELECT id FROM subjects WHERE name = 'Mathematics' LIMIT 1),
  'Test Calculus Session',
  'Introduction to derivatives and integrals',
  NOW() + INTERVAL '1 hour',  -- 1 hour from now
  60,
  'scheduled',
  'room-test123',
  true
);

-- Create another test session for tomorrow
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
  'TEACHER_USER_ID_HERE',
  'STUDENT_USER_ID_HERE',
  (SELECT id FROM subjects WHERE name = 'Computer Science' LIMIT 1),
  'Web Development Session',
  'Learn React and TypeScript basics',
  NOW() + INTERVAL '1 day',  -- Tomorrow
  90,
  'scheduled',
  'room-abc456',
  true
);

-- Verify sessions were created
SELECT 
  s.id,
  s.title,
  s.scheduled_time,
  s.duration,
  s.status,
  s.video_room_id,
  subj.name as subject,
  p1.username as teacher,
  p2.username as student
FROM public.sessions s
LEFT JOIN subjects subj ON subj.id = s.subject_id
LEFT JOIN profiles p1 ON p1.user_id = s.teacher_id
LEFT JOIN profiles p2 ON p2.user_id = s.student_id
WHERE s.scheduled_time >= NOW()
ORDER BY s.scheduled_time;
