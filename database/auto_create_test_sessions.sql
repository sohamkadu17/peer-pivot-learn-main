-- AUTOMATED: Create test sessions for the logged-in user
-- This automatically uses your user ID

-- Option 1: Create sessions where you are the student
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
  (SELECT user_id FROM profiles WHERE is_mentor = true LIMIT 1) as teacher_id,
  auth.uid() as student_id,
  (SELECT id FROM subjects LIMIT 1) as subject_id,
  'Upcoming Study Session',
  'Test session to verify dashboard display',
  NOW() + INTERVAL '2 hours' as scheduled_time,
  60 as duration,
  'scheduled' as status,
  'room-' || substr(md5(random()::text), 1, 8) as video_room_id,
  true as mentor_approved
WHERE auth.uid() IS NOT NULL;

-- Option 2: Create sessions where you are the teacher (if you're a mentor)
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
  auth.uid() as teacher_id,
  (SELECT id FROM auth.users WHERE id != auth.uid() LIMIT 1) as student_id,
  (SELECT id FROM subjects OFFSET 1 LIMIT 1) as subject_id,
  'Teaching Session Tomorrow',
  'Session where you are the mentor',
  NOW() + INTERVAL '1 day' as scheduled_time,
  90 as duration,
  'scheduled' as status,
  'room-' || substr(md5(random()::text), 1, 8) as video_room_id,
  true as mentor_approved
WHERE auth.uid() IS NOT NULL
  AND (SELECT is_mentor FROM profiles WHERE user_id = auth.uid()) = true;

-- Verify what was created
SELECT 
  s.title,
  s.scheduled_time,
  s.duration,
  s.video_room_id,
  s.status,
  CASE 
    WHEN s.teacher_id = auth.uid() THEN 'You (Teacher)'
    ELSE p1.username
  END as teacher,
  CASE 
    WHEN s.student_id = auth.uid() THEN 'You (Student)'
    ELSE p2.username
  END as student,
  subj.name as subject
FROM public.sessions s
LEFT JOIN profiles p1 ON p1.user_id = s.teacher_id
LEFT JOIN profiles p2 ON p2.user_id = s.student_id
LEFT JOIN subjects subj ON subj.id = s.subject_id
WHERE (s.teacher_id = auth.uid() OR s.student_id = auth.uid())
  AND s.scheduled_time >= NOW()
ORDER BY s.scheduled_time;
