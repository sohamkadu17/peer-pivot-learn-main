# 🔍 Debugging Guide - Data Fetching Issues

## Issues Found and Fixed

### 1. **Real-Time Data Not Updating**
**Problem**: Dashboard wasn't showing live updates when sessions were created/approved.

**Fixed**:
- ✅ Added real-time Supabase subscriptions to `UpcomingSessions`
- ✅ Added real-time subscriptions to `Dashboard` for profile updates
- ✅ `MentorSessionRequests` already had real-time notifications

### 2. **Form Data Validation**
**Problem**: Form submissions weren't properly validated.

**Fixed**:
- ✅ Added user authentication check
- ✅ Added future date validation
- ✅ Added better error messages
- ✅ Fixed mentor query to use `>=1` instead of `>0`

### 3. **Database Column Names**
**Note**: The database has BOTH column name conventions:
- Old: `start_ts`, `end_ts`, `subject` (text)
- New: `scheduled_time`, `duration`, `subject_id` (UUID)

**All components now use**: `scheduled_time`, `teacher_id`, `student_id`, `subject_id`

---

## How to Test the Complete Flow

### Step 1: Check Database Migration
1. Go to Supabase Dashboard → SQL Editor
2. Run this query to check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sessions', 'session_requests', 'profiles', 'subjects');
```

3. Check if `session_requests` table exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'session_requests';
```

### Step 2: Verify Sample Data
1. Check if you have subjects:
```sql
SELECT * FROM subjects LIMIT 5;
```

2. Check if you have mentor profiles:
```sql
SELECT user_id, username, total_sessions_taught, rating 
FROM profiles 
WHERE total_sessions_taught >= 1;
```

### Step 3: Test Form Submission
1. **Login as Student**
2. **Go to Dashboard**
3. **Scroll to "Schedule a Session" form**
4. **Open Browser Console** (F12)
5. **Fill out the form**:
   - Select a mentor
   - Select a subject
   - Enter title
   - Pick a future date
   - Select time
   - Choose duration
6. **Click "Request Session"**
7. **Check Console** for any errors

**Expected Console Output**:
```
Fetching mentors...
Mentors: [{...}]
Fetching subjects...
Subjects: [{...}]
Session request created successfully
```

### Step 4: Test Mentor Notifications
1. **Login as Mentor** (use an account with `total_sessions_taught >= 1`)
2. **Go to Dashboard**
3. **Should see**: "Pending Session Requests" card
4. **When student requests session**: Toast notification appears

### Step 5: Test Approval Flow
1. **As Mentor**: Click "Approve" on a request
2. **Check Database**:
```sql
SELECT * FROM session_requests WHERE status = 'approved';
SELECT * FROM sessions WHERE video_room_id IS NOT NULL;
```

3. **Expected**: 
   - `session_requests.video_room_id` is generated (e.g., `room-abc12345`)
   - New row in `sessions` table with same `video_room_id`

### Step 6: Check Upcoming Sessions
1. **Login as either Student or Mentor**
2. **Go to Dashboard**
3. **"Upcoming Sessions" card should show**:
   - Session title
   - Subject name
   - Date & time
   - Video room ID with copy button
   - "Join Video Call" button

---

## Common Issues & Fixes

### Issue: "No mentors available"
**Cause**: No profiles have `total_sessions_taught >= 1`

**Fix**:
```sql
-- Manually set a user as mentor
UPDATE profiles 
SET total_sessions_taught = 1, rating = 4.5
WHERE user_id = 'YOUR_USER_ID';
```

### Issue: "No subjects available"
**Cause**: Subjects table is empty

**Fix**:
```sql
-- Insert sample subjects
INSERT INTO subjects (name, description) VALUES
('Mathematics', 'Math topics including algebra, calculus, geometry'),
('Computer Science', 'Programming, algorithms, data structures'),
('Physics', 'Mechanics, electricity, thermodynamics'),
('Chemistry', 'Organic, inorganic, physical chemistry'),
('English', 'Literature, grammar, writing');
```

### Issue: "Room ID not generated"
**Cause**: Database trigger not created

**Fix**: Run the complete migration from `database/session_scheduling_migration.sql`

### Issue: "Real-time updates not working"
**Cause**: Realtime not enabled in Supabase

**Fix**:
1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for tables: `sessions`, `session_requests`, `profiles`

---

## Browser Console Debugging

### Check if Supabase is Connected
```javascript
// In browser console
console.log(window.supabase);
```

### Check User Authentication
```javascript
// In browser console
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

### Manually Fetch Sessions
```javascript
// In browser console
const { data, error } = await supabase
  .from('sessions')
  .select('*')
  .gte('scheduled_time', new Date().toISOString());
console.log('Sessions:', data, 'Error:', error);
```

### Check Session Requests
```javascript
// In browser console
const { data, error } = await supabase
  .from('session_requests')
  .select(`
    *,
    student:profiles!session_requests_student_id_fkey(username, rating),
    subject:subjects(name)
  `)
  .eq('status', 'pending');
console.log('Requests:', data, 'Error:', error);
```

---

## Quick Checklist

Before testing, verify:

- [ ] Database migration ran successfully
- [ ] `session_requests` table exists
- [ ] `sessions` table has `video_room_id` column
- [ ] At least one user has `total_sessions_taught >= 1`
- [ ] Subjects table has data
- [ ] Realtime replication is enabled
- [ ] Project is running (`npm run dev:all`)
- [ ] User is logged in
- [ ] Browser console is open for error checking

---

## Expected Behavior

### For Students:
1. See "Schedule a Session" form on dashboard
2. Can select mentor, subject, date, time
3. Submit request successfully
4. See confirmation toast
5. Request appears in mentor's pending list

### For Mentors:
1. See "Pending Session Requests" card (if they have taught sessions)
2. Receive real-time toast notification for new requests
3. Can approve or reject requests
4. Approved requests auto-generate room IDs
5. Approved sessions appear in "Upcoming Sessions"

### For Both:
1. "Upcoming Sessions" shows all scheduled sessions
2. Video room ID is visible
3. Can copy room ID
4. Can click "Join Video Call" to navigate to video page
5. Real-time updates when sessions are created/modified

---

## If Nothing Works

### Nuclear Option: Reset and Start Fresh

1. **Drop all tables**:
```sql
DROP TABLE IF EXISTS session_requests CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP FUNCTION IF EXISTS generate_video_room_id CASCADE;
DROP FUNCTION IF EXISTS auto_generate_room_id CASCADE;
DROP FUNCTION IF EXISTS create_session_from_request CASCADE;
```

2. **Re-run base migration**:
```sql
-- Run: supabase/migrations/20250826145502_*.sql
```

3. **Re-run session scheduling migration**:
```sql
-- Run: database/session_scheduling_migration.sql
```

4. **Insert test data**:
```sql
-- Add subjects
INSERT INTO subjects (name) VALUES ('Mathematics'), ('Physics'), ('Chemistry');

-- Update your profile to be a mentor
UPDATE profiles SET total_sessions_taught = 5, rating = 4.8 WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
```

5. **Enable Realtime**:
   - Supabase Dashboard → Database → Replication
   - Enable for: sessions, session_requests, profiles

6. **Refresh browser and test again**

---

## Success Indicators

✅ Mentors dropdown populates with names
✅ Subjects dropdown shows subjects
✅ Date picker allows future dates
✅ Form submits without errors
✅ Toast notification appears on submit
✅ Mentor sees pending request
✅ Approve button works
✅ Room ID appears in approved session
✅ "Upcoming Sessions" shows the session
✅ Room ID is copyable
✅ "Join Video Call" button navigates correctly

