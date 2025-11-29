# 📋 Complete Rating System Setup Instructions

## ✅ What You've Already Done

You've successfully run:
1. ✅ Made `feedback_text` nullable
2. ✅ Created `update_leaderboard_cache_after_feedback()` function
3. ✅ Created trigger for leaderboard cache updates

## 🎯 What You Need to Do Now

### Step 1: Run the Rating Update Function

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click on **SQL Editor** in the left sidebar

2. **Open the Complete Setup File**
   - Open the file: `database/complete_rating_setup.sql`
   - Copy ALL the SQL code from that file

3. **Paste and Run in SQL Editor**
   - Paste the entire SQL code into the SQL Editor
   - Click **Run** (or press Ctrl+Enter)
   - Wait for it to complete

4. **Verify Success**
   - You should see a message: "Setup Complete!"
   - Check the results - it should show:
     - Total feedback count
     - Mentors with feedback
     - Mentors with ratings

### Step 2: Test the System

1. **Submit Feedback**
   - Go to your app
   - Submit feedback for a mentor with a rating (1-5 stars)
   - Check the browser console for logs

2. **Check Database**
   - Go to Supabase → Table Editor → `profiles`
   - Find the mentor you rated
   - Check if their `rating` column has been updated

3. **Check Frontend**
   - Go to **Find Mentor** page
   - You should see stars and ratings next to mentor names
   - Go to **Leaderboard** → **Top Rated Mentors** tab
   - Mentors should appear with their ratings

### Step 3: Verify Everything Works

**Check in Supabase SQL Editor:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_mentor_rating';

-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'update_mentor_rating';

-- Check current ratings
SELECT 
  p.user_id,
  p.username,
  p.rating,
  COUNT(sf.id) as feedback_count
FROM profiles p
LEFT JOIN session_feedback sf ON sf.mentor_id = p.user_id
WHERE p.is_mentor = true OR p.rating > 0
GROUP BY p.user_id, p.username, p.rating
ORDER BY p.rating DESC NULLS LAST;
```

## 🔍 Troubleshooting

### If ratings still show 0.0:

1. **Check if trigger is working:**
   ```sql
   -- Manually trigger the function for a mentor
   SELECT update_mentor_rating();
   ```

2. **Check if feedback exists:**
   ```sql
   SELECT * FROM session_feedback LIMIT 5;
   ```

3. **Manually update a mentor's rating:**
   ```sql
   -- Replace 'MENTOR_USER_ID' with actual mentor user_id
   UPDATE profiles 
   SET rating = (
     SELECT AVG(rating) 
     FROM session_feedback 
     WHERE mentor_id = 'MENTOR_USER_ID'
   )
   WHERE user_id = 'MENTOR_USER_ID';
   ```

4. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'session_feedback';
   ```

## 📝 Summary

After running `complete_rating_setup.sql`:
- ✅ Ratings will automatically update when feedback is submitted
- ✅ Existing feedback will be calculated and ratings updated
- ✅ The trigger runs server-side, bypassing RLS issues
- ✅ Ratings will appear in FindMentor, Leaderboard, and ScheduleSessionForm

## 🚀 Next Steps

1. Run the SQL setup file
2. Submit test feedback
3. Refresh pages to see updated ratings
4. Check leaderboard for "Top Rated Mentors"

