# Email Reminder System - Complete Setup Guide

## ✅ What's Already Done

1. ✅ Database functions created (`send_session_reminders()`, `delete_completed_sessions()`)
2. ✅ Edge function deployed (`send-email-reminder`)
3. ✅ Resend API key configured (`re_8vg4pBGs_pUvSmqw94wZw9omWbUwCKuZR`)
4. ✅ Email reminder window: **10 minutes** before session starts
5. ✅ Auto-delete completed sessions enabled

---

## 📋 EXACT STEPS TO COMPLETE SETUP

### Step 1: Set Up Automated Cron Job (Choose ONE option)

#### **Option A: Using cron-job.org (Recommended - Free & Easy)**

1. Go to https://cron-job.org/en/ and sign up for free account

2. Click **"Create cronjob"**

3. Configure the cronjob:
   - **Title**: `Email Reminders - Peer Pivot`
   - **Address**: `https://gphmcbniijsoplnfifgx.supabase.co/functions/v1/send-email-reminder`
   - **Request Method**: `POST`
   - **Schedule**: Choose "Every 10 minutes"
     - Pattern: `*/10 * * * *`
   - **Headers**: Add these headers:
     ```
     Authorization: Bearer YOUR_SUPABASE_ANON_KEY
     Content-Type: application/json
     ```
   - **Body**: 
     ```json
     {
       "action": "check_and_send_reminders"
     }
     ```

4. Click **Save** and **Enable** the cronjob

5. **Get your Supabase Anon Key**:
   ```powershell
   supabase status
   ```
   Look for `anon key` in the output, or get it from: https://supabase.com/dashboard/project/gphmcbniijsoplnfifgx/settings/api

---

#### **Option B: Using EasyCron (Alternative)**

1. Go to https://www.easycron.com and create free account

2. Click **"Create Cron Job"**

3. Configure:
   - **URL**: `https://gphmcbniijsoplnfifgx.supabase.co/functions/v1/send-email-reminder`
   - **Cron Expression**: `*/10 * * * *` (every 10 minutes)
   - **HTTP Method**: POST
   - **HTTP Headers**:
     ```
     Authorization: Bearer YOUR_SUPABASE_ANON_KEY
     Content-Type: application/json
     ```
   - **POST Data**:
     ```json
     {"action":"check_and_send_reminders"}
     ```

4. Save and enable the cron job

---

#### **Option C: Using GitHub Actions (For developers)**

1. Create `.github/workflows/email-reminders.yml` in your repository:

```yaml
name: Send Email Reminders

on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST \
            https://gphmcbniijsoplnfifgx.supabase.co/functions/v1/send-email-reminder \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"action":"check_and_send_reminders"}'
```

2. Add `SUPABASE_ANON_KEY` to your GitHub repository secrets

---

### Step 2: Set Up Auto-Delete for Completed Sessions

Add another cronjob (same platforms as above):

- **Title**: `Delete Completed Sessions - Peer Pivot`
- **URL**: Create a new edge function OR add to existing one
- **Schedule**: Every 10 minutes (`*/10 * * * *`)
- **Purpose**: Cleans up sessions after they finish

**Quick Setup**: Run this in your terminal:

```powershell
# Create a simple edge function to call delete_completed_sessions
mkdir supabase/functions/cleanup-sessions
echo 'import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )
  
  const { data, error } = await supabase.rpc("delete_completed_sessions")
  
  return new Response(JSON.stringify({ success: !error }), {
    headers: { "Content-Type": "application/json" }
  })
})' > supabase/functions/cleanup-sessions/index.ts

# Deploy it
supabase functions deploy cleanup-sessions
```

Then add this cronjob to your cron service:
- **URL**: `https://gphmcbniijsoplnfifgx.supabase.co/functions/v1/cleanup-sessions`
- **Schedule**: `*/10 * * * *`

---

## 🧪 Testing the Email System

### Test 1: Create a session 10 minutes from now

```sql
-- Run this in Supabase SQL Editor
UPDATE sessions 
SET scheduled_time = NOW() + INTERVAL '8 minutes'
WHERE id = '3ed1ed3f-9776-4272-9de0-a68aaf7a6f8f';
```

Wait 8 minutes, then check:
1. Your email inbox for reminder emails
2. `user_events` table for logged events:
   ```sql
   SELECT * FROM user_events WHERE event_type = 'email_reminder_sent' ORDER BY created_at DESC LIMIT 5;
   ```

### Test 2: Manually trigger the reminder function

```sql
-- Run immediately in Supabase SQL Editor
SELECT send_session_reminders();
```

Check if events were logged (means sessions found within 10 min window)

### Test 3: Test auto-delete

```sql
-- Create a session in the past
UPDATE sessions 
SET scheduled_time = NOW() - INTERVAL '2 hours'
WHERE id = '3ed1ed3f-9776-4272-9de0-a68aaf7a6f8f';

-- Run delete function
SELECT delete_completed_sessions();

-- Check if session was deleted
SELECT * FROM sessions WHERE id = '3ed1ed3f-9776-4272-9de0-a68aaf7a6f8f';
```

---

## 📧 Email Content

Users will receive beautiful HTML emails with:
- **Subject**: `Reminder: Your session starts in 10 minutes!`
- **Body includes**:
  - Session subject (e.g., "Mathematics")
  - Start time and duration
  - Room ID (e.g., `room-4d7672d1`)
  - **Big green "Join Session" button** linking to: `https://your-domain.com/video-room/room-4d7672d1`

---

## 🔧 Troubleshooting

### No emails being sent?

1. **Check cron job is running**:
   - Log into your cron service
   - Verify the job is enabled
   - Check execution logs

2. **Check Supabase logs**:
   ```powershell
   supabase functions logs send-email-reminder
   ```

3. **Verify Resend API key**:
   ```powershell
   supabase secrets list
   ```
   Should show `RESEND_API_KEY`

4. **Test edge function manually**:
   ```powershell
   curl -X POST https://gphmcbniijsoplnfifgx.supabase.co/functions/v1/send-email-reminder `
     -H "Authorization: Bearer YOUR_ANON_KEY" `
     -H "Content-Type: application/json" `
     -d '{"action":"test"}'
   ```

### Sessions not being deleted?

1. **Check if sessions exist**:
   ```sql
   SELECT COUNT(*) FROM sessions 
   WHERE scheduled_time + (duration_minutes || ' minutes')::INTERVAL < NOW();
   ```

2. **Manually run cleanup**:
   ```sql
   SELECT delete_completed_sessions();
   ```

---

## ⚙️ Configuration

### Change reminder timing

Currently: **10 minutes** before session

To change, update `email_reminders.sql`:
```sql
-- Change INTERVAL '10 minutes' to your desired time
WHERE s.scheduled_time <= NOW() + INTERVAL '30 minutes'  -- 30 min example
```

Then re-run in Supabase SQL Editor.

### Change cron frequency

- **More frequent** (every 5 min): `*/5 * * * *`
- **Less frequent** (every 30 min): `*/30 * * * *`
- **Hourly**: `0 * * * *`

---

## 📊 Monitoring

### Check reminder logs
```sql
SELECT 
  ue.created_at,
  p.username,
  ue.metadata->>'subject' as subject,
  ue.metadata->>'room_id' as room_id
FROM user_events ue
JOIN profiles p ON p.user_id = ue.user_id
WHERE event_type = 'email_reminder_sent'
ORDER BY created_at DESC
LIMIT 20;
```

### Check deleted sessions count
```sql
-- This will show you how many would be deleted
SELECT COUNT(*) as sessions_to_delete
FROM sessions 
WHERE scheduled_time + (duration_minutes || ' minutes')::INTERVAL < NOW()
  AND status = 'scheduled';
```

---

## 🎯 Summary

**What happens automatically:**

1. ⏰ **Every 10 minutes**: Cron job checks for upcoming sessions
2. 📧 **10 minutes before session**: Both student and mentor receive email reminders
3. 🗑️ **After session ends**: Session is automatically deleted from database
4. 📝 **All activity logged**: Check `user_events` table for audit trail

**Next Steps:**
1. Set up cron job on cron-job.org (5 minutes to do)
2. Test with a session scheduled 10 minutes from now
3. Monitor `user_events` table to see reminders being sent

---

## 🆘 Need Help?

If emails aren't working after setup:
1. Check Resend dashboard: https://resend.com/emails
2. View Supabase function logs
3. Verify cron job is hitting the endpoint every 10 minutes
