# Migration Application Instructions

## Problem
The migration file `20251204000000_add_feedback_and_resources.sql` needs to be applied to the remote Supabase database to create the `session_feedback` and `shared_resources` tables.

## Solution Options

### Option 1: Supabase Dashboard SQL Editor (RECOMMENDED - Easiest)

1. **Open the SQL Editor:**
   Go to: https://supabase.com/dashboard/project/gphmcbniijsoplnfifgx/sql/new

2. **Copy the migration SQL:**
   - Open file: `supabase/migrations/20251204000000_add_feedback_and_resources.sql`
   - Copy all the contents

3. **Paste and Run:**
   - Paste the SQL into the editor
   - Click "Run" button
   - Wait for confirmation message

4. **Verify:**
   - Go to Table Editor: https://supabase.com/dashboard/project/gphmcbniijsoplnfifgx/editor
   - Check that `session_feedback` and `shared_resources` tables exist

### Option 2: Using Supabase CLI with Access Token

1. **Get your Supabase Access Token:**
   - Go to: https://supabase.com/dashboard/account/tokens
   - Create a new access token
   - Copy the token

2. **Set the environment variable:**
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "your_token_here"
   ```

3. **Run the migration script:**
   ```powershell
   node apply-migration.js
   ```

### Option 3: Manual Table Creation (If SQL file doesn't work)

Run these commands one by one in the SQL Editor:

```sql
-- Create session_feedback table
CREATE TABLE IF NOT EXISTS public.session_feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.session_requests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    toxicity_score DECIMAL(3,2) DEFAULT 0.0,
    toxicity_categories JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(session_id, student_id)
);

-- Create shared_resources table
CREATE TABLE IF NOT EXISTS public.shared_resources (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.session_requests(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'link', 'video', 'image', 'code', 'other')),
    resource_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;
```

Then run the RLS policies and indexes from the migration file.

## After Migration is Applied

1. **Verify tables exist:**
   - Check the Table Editor in Supabase Dashboard
   - Should see `session_feedback` and `shared_resources` tables

2. **Update TypeScript types:**
   ```powershell
   supabase gen types typescript --linked > src/integrations/supabase/types.ts
   ```

3. **Create Storage Bucket for file uploads:**
   - Go to: https://supabase.com/dashboard/project/gphmcbniijsoplnfifgx/storage/buckets
   - Create a new bucket named `session-resources`
   - Set it to **Public** access
   - Add policy for authenticated users to upload

4. **Test the components:**
   - Try submitting feedback (should no longer error)
   - Try sharing a resource
   - Try screen sharing
   - Try the whiteboard

## Status Check
After running the migration, you can verify it worked by running:
```powershell
# Check if tables exist
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwaG1jYm5paWpzb3BsbmZpZmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMTkxMzYsImV4cCI6MjA3MTc5NTEzNn0.8u2DuL_Ykmm26Tm429Ih_H0U_HELL-LY614BUzBlkE4"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwaG1jYm5paWpzb3BsbmZpZmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMTkxMzYsImV4cCI6MjA3MTc5NTEzNn0.8u2DuL_Ykmm26Tm429Ih_H0U_HELL-LY614BUzBlkE4"
}

Invoke-RestMethod -Uri "https://gphmcbniijsoplnfifgx.supabase.co/rest/v1/session_feedback?select=id&limit=1" -Headers $headers
Invoke-RestMethod -Uri "https://gphmcbniijsoplnfifgx.supabase.co/rest/v1/shared_resources?select=id&limit=1" -Headers $headers
```

If both commands return `[]` (empty array) without errors, the tables exist!
