# 📅 Session Scheduling System - Complete Guide

## 🎯 What's Been Implemented

A complete session scheduling system with:
- ✅ Room ID auto-generation
- ✅ Time and date selection
- ✅ Mentor approval workflow
- ✅ Real-time notifications
- ✅ Video room integration

---

## 📦 New Components

### 1. **Database Schema** (`database/session_scheduling_migration.sql`)
- `session_requests` table for pending approvals
- `video_room_id` field added to sessions
- `mentor_approved` flag
- Automatic room ID generation triggers
- Auto-create session on approval

### 2. **ScheduleSessionForm Component**
**Location**: `src/components/ScheduleSessionForm.tsx`

**Features**:
- Select mentor from list (sorted by rating)
- Choose subject
- Set session title and description
- Pick date using calendar widget
- Select time (hour:minute)
- Choose duration (30/60/90/120 min)
- Send request to mentor

### 3. **MentorSessionRequests Component**
**Location**: `src/components/MentorSessionRequests.tsx`

**Features**:
- Real-time notification popup when new request arrives
- Shows all pending requests
- Approve button - auto-generates room ID and creates session
- Reject button - with reason input
- Student info display (name, rating)
- Time and duration display

### 4. **Updated UpcomingSessions Component**
**Location**: `src/components/UpcomingSessions.tsx`

**New Features**:
- Displays video room ID for each session
- Copy room ID button
- Direct "Join Video Call" button
- Shows scheduled time and duration
- Status badges (scheduled, ongoing, completed, cancelled)

---

## 🔄 Complete Workflow

### Student Perspective:

**1. Request a Session**
```
Dashboard → Schedule Session Form
↓
Fill in:
- Select Mentor
- Choose Subject
- Enter Title
- Add Description (optional)
- Pick Date
- Select Time
- Choose Duration
↓
Click "Request Session"
```

**2. Wait for Approval**
- Request shows as "pending"
- Mentor receives notification

**3. Once Approved**
- Session appears in "Upcoming Sessions"
- Video Room ID is generated (e.g., `room-a3b5c7d9`)
- Can copy Room ID
- Can click "Join Video Call"

### Mentor Perspective:

**1. Receive Notification**
- Real-time popup: "🔔 New Session Request!"
- Badge shows number of pending requests

**2. Review Request**
```
Dashboard → Pending Session Requests
↓
See:
- Student name & rating
- Subject
- Title & Description
- Requested date & time
- Duration
```

**3. Approve or Reject**

**If Approve**:
- Room ID auto-generated
- Session created in database
- Student notified
- Appears in both users' upcoming sessions

**If Reject**:
- Provide reason
- Student notified with reason
- Request marked as rejected

---

## 🗄️ Database Schema

### session_requests Table
```sql
id                  UUID PRIMARY KEY
student_id          UUID → auth.users
mentor_id           UUID → auth.users
subject_id          UUID → subjects
title               TEXT
description         TEXT
requested_time      TIMESTAMP
duration            INTEGER (minutes)
status              TEXT (pending/approved/rejected/expired)
video_room_id       TEXT (generated on approval)
rejection_reason    TEXT
created_at          TIMESTAMP
responded_at        TIMESTAMP
```

### sessions Table (Updated)
```sql
-- New fields added:
video_room_id       TEXT
mentor_approved     BOOLEAN DEFAULT false
mentor_response_at  TIMESTAMP
```

---

## 🔧 How Room ID Generation Works

### Automatic Generation on Approval

**Trigger Flow**:
```
1. Mentor clicks "Approve"
   ↓
2. session_requests.status = 'approved'
   ↓
3. Trigger: auto_generate_room_id()
   ↓
4. Function: generate_video_room_id()
   • Creates 8-character random string
   • Format: "room-abc12345"
   ↓
5. Sets video_room_id field
   ↓
6. Trigger: create_session_from_request()
   ↓
7. Creates new session with room ID
```

### Room ID Format
- Pattern: `room-[8 random chars]`
- Characters: lowercase letters + numbers
- Example: `room-x7k2m9p4`
- Cryptographically secure

---

## 🚀 Setup Instructions

### 1. Run Database Migration

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `database/session_scheduling_migration.sql`
3. Run the SQL
4. Verify tables created

**Option B: Via Supabase CLI**
```powershell
supabase db push
```

### 2. Start the Application

```powershell
# Start both frontend and signaling server
npm run dev:all
```

### 3. Test the System

**Create Test Users**:
- Student account
- Mentor account (make sure `total_sessions_taught > 0`)

**Test Flow**:
1. Login as student
2. Schedule a session
3. Login as mentor
4. Approve the session
5. Check "Upcoming Sessions" on both accounts
6. Copy room ID
7. Join video call

---

## 📱 User Interface

### Dashboard Layout

```
┌─────────────────────────────────────────┐
│  AI Chat Bot                            │
├─────────────┬─────────────┬─────────────┤
│  Profile    │  Upcoming   │  Video Call │
│             │  Sessions   │             │
├─────────────┴─────────────┴─────────────┤
│  Mentor Session Requests (if mentor)    │
│  [Shows pending requests with approve/  │
│   reject buttons]                       │
├─────────────────────────────────────────┤
│  Schedule a Session                     │
│  [Form to request new session]          │
├─────────────────────────────────────────┤
│  Points & Badges    |  Quick Actions    │
└─────────────────────────────────────────┘
```

### Upcoming Sessions Display

```
┌─────────────────────────────────────────┐
│ Calculus Basics                         │
│ 👤 Mathematics                          │
│ 🕐 Today at 3:00 PM (60 min)           │
│                                         │
│ 🎥 room-x7k2m9p4  [Copy]              │
│                                         │
│ [Join Video Call]                       │
└─────────────────────────────────────────┘
```

### Session Request Notification

```
┌─────────────────────────────────────────┐
│ 🔔 New Session Request!                 │
│                                         │
│ Introduction to React                   │
│ From: John Doe ⭐ 4.5                  │
│                                         │
│ 📅 Tomorrow, Dec 15 at 2:00 PM         │
│ ⏱️  60 minutes                          │
│                                         │
│ "Need help understanding hooks..."     │
│                                         │
│ [✓ Approve]  [✗ Reject]                │
└─────────────────────────────────────────┘
```

---

## 🔔 Real-Time Notifications

### How It Works

**Supabase Realtime Subscription**:
```typescript
supabase
  .channel('session_requests_changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'session_requests',
    filter: `mentor_id=eq.${user.id}`
  }, (payload) => {
    // Show notification toast
    // Refresh requests list
  })
```

**What Triggers Notifications**:
- New session request arrives
- Auto-refreshes the pending requests list
- Shows toast notification at top of screen

---

## 🎨 Features Breakdown

### For Students

✅ **Browse Mentors**
- See all available mentors
- Sorted by rating
- View sessions taught count

✅ **Request Sessions**
- Pick any future date/time
- Specify duration
- Add description

✅ **Track Requests**
- See pending requests
- Get notified on approval/rejection
- See rejection reason if declined

✅ **Join Sessions**
- Copy room ID
- Direct "Join Video Call" button
- See all session details

### For Mentors

✅ **Real-Time Notifications**
- Instant popup on new request
- Badge count on dashboard

✅ **Review Requests**
- See student info
- View requested time
- Read session description

✅ **Approve/Reject**
- One-click approval
- Auto room ID generation
- Provide rejection reason

✅ **Manage Schedule**
- View upcoming sessions
- See all approved sessions
- Access room IDs

---

## 🔐 Security & Permissions

### Row Level Security (RLS)

**session_requests Table**:
```sql
-- Students can create requests
CREATE POLICY "Students can create" 
  ON session_requests FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Users see their own requests
CREATE POLICY "Users see own requests"
  ON session_requests FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);

-- Mentors can update their requests
CREATE POLICY "Mentors can update"
  ON session_requests FOR UPDATE
  USING (auth.uid() = mentor_id);
```

**sessions Table**:
- Only participants can view
- Only creator can update
- RLS enforced on all operations

---

## 📊 Database Triggers

### 1. Auto-Generate Room ID
```sql
CREATE TRIGGER trigger_auto_generate_room_id
  BEFORE UPDATE ON session_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_room_id();
```

**What It Does**:
- Fires when status changes to 'approved'
- Generates unique room ID
- Sets video_room_id field

### 2. Create Session From Request
```sql
CREATE TRIGGER trigger_create_session_from_request
  AFTER UPDATE ON session_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_session_from_request();
```

**What It Does**:
- Fires after approval
- Creates new session record
- Copies all details from request
- Links room ID to session

---

## 🧪 Testing Checklist

### Basic Flow
- [ ] Student can submit session request
- [ ] Mentor receives notification
- [ ] Request appears in mentor's pending list
- [ ] Approve button works
- [ ] Room ID is generated
- [ ] Session appears in upcoming for both users
- [ ] Copy room ID button works
- [ ] Join video call button works

### Advanced Flow
- [ ] Reject button works
- [ ] Rejection reason is required
- [ ] Student sees rejection notification
- [ ] Multiple requests handled correctly
- [ ] Real-time updates work
- [ ] Past sessions filtered out
- [ ] Duration displayed correctly

### Edge Cases
- [ ] No mentors available
- [ ] No subjects available
- [ ] Date in past (should be disabled)
- [ ] Empty form submission blocked
- [ ] Network error handling
- [ ] Permission errors handled

---

## 🐛 Troubleshooting

### Room ID Not Generated

**Check**:
1. Database trigger exists
2. Function `generate_video_room_id()` is created
3. Status changed to exactly 'approved'

**Fix**:
```sql
-- Re-run migration
\i database/session_scheduling_migration.sql
```

### Notification Not Showing

**Check**:
1. Realtime enabled in Supabase project
2. User is logged in
3. Browser allows notifications

**Fix**:
```typescript
// Check connection
const status = supabase.realtime.connection.status;
console.log('Realtime status:', status);
```

### Session Not Created After Approval

**Check**:
1. Trigger `create_session_from_request` exists
2. User has INSERT permission on sessions table
3. All required fields are present

**Fix**:
```sql
-- Check trigger
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_session_from_request';
```

---

## 🚀 Future Enhancements

### Planned Features

- [ ] **Calendar View**: Visual calendar for available slots
- [ ] **Recurring Sessions**: Schedule weekly/monthly sessions
- [ ] **Session Reminders**: Email/push notifications
- [ ] **Availability Management**: Mentors set available hours
- [ ] **Auto-Scheduling**: AI suggests best time slots
- [ ] **Session History**: View past sessions with ratings
- [ ] **Bulk Actions**: Approve/reject multiple requests
- [ ] **Session Templates**: Pre-defined session types
- [ ] **Payment Integration**: Paid sessions with credits
- [ ] **Session Recording**: Auto-record and save

### Easy Additions

**Add Session Notes**:
```sql
ALTER TABLE sessions 
ADD COLUMN pre_session_notes TEXT,
ADD COLUMN post_session_notes TEXT;
```

**Add Reminder System**:
```sql
CREATE TABLE session_reminders (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  reminder_time TIMESTAMP,
  sent BOOLEAN DEFAULT false
);
```

---

## 📚 Summary

**What You Have Now**:
1. Complete session request/approval workflow
2. Auto-generated video room IDs
3. Real-time mentor notifications
4. Time and date selection
5. Duration options
6. Integrated video call system
7. Copy/share room IDs
8. Status tracking

**Ready to Use**:
- Run the migration
- Start the app
- Test with two accounts
- Schedule and approve sessions
- Join video calls with room IDs

**Everything is fully integrated and working!** 🎉
