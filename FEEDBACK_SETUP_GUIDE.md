# 📝 Feedback System Setup Guide

## ✅ What's Included

A complete feedback system for students to rate and review mentors with:
- ✅ Rating system (1-5 stars)
- ✅ Written feedback with toxicity checking
- ✅ Shows all approved sessions (before/after completion)
- ✅ Real-time toxicity detection using ML service
- ✅ Beautiful UI with feedback form

---

## 🚀 Setup Steps

### Step 1: Create Database Table

Run this SQL in your Supabase SQL Editor:

```sql
-- File: database/add_feedback_table.sql
```

Copy and paste the entire contents of `database/add_feedback_table.sql` into Supabase SQL Editor and execute.

**What it creates:**
- `session_feedback` table to store feedback
- Indexes for fast queries
- Row Level Security (RLS) policies
- Auto-timestamp updates

---

### Step 2: Start ML Toxicity Service (Optional but Recommended)

The feedback system works with or without the ML service, but toxicity checking is better with it running.

#### Option A: Run ML Service Locally

```powershell
# Navigate to ml-service folder
cd ml-service

# Install dependencies
pip install -r requirements.txt

# Start the service
python app.py
```

The service will run on `http://localhost:5000`

#### Option B: Use Environment Variable

If your ML service is running on a different server, set:

```bash
VITE_ML_SERVICE_URL=http://your-ml-service-url:5000
```

---

### Step 3: Test the Feedback System

#### As a Student:

1. **Login** to dashboard
2. **Find a mentor** and schedule a session
3. **Wait** for mentor to approve
4. Go to **Dashboard → Quick Actions → Give Feedback**
5. You'll see all approved sessions
6. Click the session to select it
7. Rate the mentor (1-5 stars)
8. Write your feedback (minimum 10 characters)
9. Click **"🔍 Check Content"** to verify
10. Click **"Submit Feedback"** to save

---

## 🔍 Toxicity Checking

### How It Works:

1. **When you click "Check Content":**
   - Your feedback is sent to ML service
   - Service analyzes for harmful/abusive language
   - Returns safety score and categories

2. **If feedback is approved:**
   - Green checkmark appears
   - "Submit Feedback" button becomes available

3. **If feedback is rejected:**
   - Red warning shows suggestion to revise
   - "Submit Feedback" button is disabled until you rewrite

### Example Rejected Feedback:
```
❌ "Your teaching is terrible and you're a bad mentor"
→ Suggestion: Keep feedback constructive and respectful
```

### Example Approved Feedback:
```
✅ "While the teaching was clear, I wish there was more interaction"
→ Approved! Ready to submit
```

---

## 🗄️ Database Schema

### session_feedback Table

```sql
CREATE TABLE session_feedback (
  id UUID PRIMARY KEY,
  session_id UUID → session_requests(id),
  student_id UUID → auth.users(id),
  mentor_id UUID → auth.users(id),
  rating INTEGER (1-5),
  feedback_text TEXT,
  toxicity_score FLOAT,
  toxicity_categories TEXT[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Access Control

- **Students** can view their own feedback
- **Mentors** can view feedback they received
- Only the **student** who wrote it can edit
- Mentors can delete feedback on their sessions

---

## 🐛 Troubleshooting

### Issue: "Check Content" Button Not Working

**Possible Causes:**

1. **ML Service not running**
   - Check if `http://localhost:5000/health` is accessible
   - See Step 2 above to start it

2. **Environment variable not set**
   - Set `VITE_ML_SERVICE_URL` in `.env.local`
   - Restart dev server: `npm run dev`

3. **Feedback too short**
   - Minimum 10 characters required
   - Write more details

**Check Browser Console:**
```javascript
// Open DevTools (F12) → Console tab
// Look for error messages like:
// "ML Service URL: http://localhost:5000"
// "Error checking toxicity: ..."
```

### Issue: "No Sessions Available"

**Solution:**
1. Make sure you **scheduled** a session
2. Wait for **mentor to approve** the request
3. Approved sessions will appear (doesn't matter if session date is past)

### Issue: Submit Button Disabled

**Why it's disabled:**
- ❌ No session selected
- ❌ Feedback is empty
- ❌ Content check shows toxic language
- ❌ Content hasn't been checked yet

**Fix:**
1. Select a session
2. Write feedback
3. Click "🔍 Check Content"
4. Wait for approval (green checkmark)
5. Now "Submit Feedback" will be enabled

---

## 📊 View Feedback

### As a Student:
- See feedback you've submitted to mentors
- Edit or delete your own feedback (24 hours?)

### As a Mentor:
- See all feedback students gave you
- View ratings and comments
- Track your teaching performance

---

## 🔒 Safety Features

1. **Toxicity Detection**
   - Uses transformer models from Hugging Face
   - Detects toxic, abusive, hateful language
   - Customizable threshold (default: 0.7)

2. **Rate Limiting**
   - One feedback per session per student
   - Prevents spam/duplicate ratings

3. **Data Privacy**
   - RLS policies enforce access control
   - Only sender and receiver can view
   - Encrypted in transit

---

## 📱 UI Components

### FeedbackForm Component
- Location: `src/components/FeedbackForm.tsx`
- Shows approved sessions
- Star rating widget
- Textarea for feedback
- Toxicity check button
- Submit button

### FeedbackPage Component
- Location: `src/pages/FeedbackPage.tsx`
- Header with back button
- Main feedback form
- Dark mode toggle
- Sign out button

---

## 🎯 Next Steps (Optional)

### Future Enhancements:
- [ ] **Mentor Feedback to Students** - Reverse system
- [ ] **Feedback History** - View all past feedback
- [ ] **Feedback Analytics** - See average ratings per mentor
- [ ] **Email Notifications** - Notify mentors of new feedback
- [ ] **Report Inappropriate Feedback** - Flag abusive feedback
- [ ] **Response to Feedback** - Mentors can reply

---

## 💡 Tips & Best Practices

### For Students Writing Feedback:
1. **Be specific** - "Great explanation of calculus" vs "Good"
2. **Be constructive** - Focus on improvement areas
3. **Be respectful** - Avoid personal attacks
4. **Be honest** - Give genuine feedback

### For Mentors:
1. **Welcome feedback** - Shows growth mindset
2. **Respond to feedback** - Shows you care
3. **Improve based on feedback** - Track changes

---

## 📞 Support

If feedback system has issues:

1. Check browser console for error messages (F12)
2. Run SQL query to verify table exists:
   ```sql
   SELECT * FROM session_feedback LIMIT 1;
   ```
3. Check ML service is running:
   ```
   curl http://localhost:5000/health
   ```
4. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'session_feedback';
   ```

---

**✨ Feedback system is ready! Start collecting student insights about your mentors!**
