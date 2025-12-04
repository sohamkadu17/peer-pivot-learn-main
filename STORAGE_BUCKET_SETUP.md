# Resource Upload Fix - Supabase Storage Bucket Setup

## Problem
File uploads in Resource Sharing are failing with "Please upload a file" error, even though files are selected and uploaded.

## Root Cause
The Supabase storage bucket `session-resources` doesn't exist yet, causing `getPublicUrl()` to return an invalid URL.

## Solution
Create the storage bucket with proper permissions.

## Steps to Fix

### 1. Create Storage Bucket via Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/gphmcbniijsoplnfifgx)
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Configure the bucket:
   - **Name:** `session-resources`
   - **Public bucket:** ☑️ **YES** (checked)
   - **File size limit:** 10 MB (optional, for file size restrictions)
   - **Allowed MIME types:** Leave empty for all types, or specify:
     - `image/*`
     - `video/*`
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.*`
     - `text/*`
     - `application/zip`

5. Click **Create bucket**

### 2. Set Row Level Security (RLS) Policies

After creating the bucket, set up RLS policies:

#### Policy 1: Allow authenticated users to upload files
```sql
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'session-resources');
```

#### Policy 2: Allow everyone to read files (public access)
```sql
CREATE POLICY "Anyone can read files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'session-resources');
```

#### Policy 3: Allow users to delete their own files
```sql
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'session-resources' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. Verify Setup

To verify the bucket is working:

1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to the **Console** tab
4. Try uploading a file in Resource Sharing
5. Check the console for: `File uploaded successfully. Public URL: https://...`
6. If you see a valid URL, the bucket is working!

### Alternative: Create Bucket via Supabase CLI

If you prefer using the CLI:

```bash
# Navigate to project directory
cd "c:\SOHAM\peer-pivot-learn-main (4)\peer-pivot-learn-main"

# Create the bucket
supabase storage create-bucket session-resources --public

# Add RLS policies
supabase sql execute --query "
CREATE POLICY 'Authenticated users can upload files'
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'session-resources');

CREATE POLICY 'Anyone can read files'
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'session-resources');

CREATE POLICY 'Users can delete their own files'
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'session-resources' AND auth.uid()::text = (storage.foldername(name))[1]);
"
```

## Testing After Fix

1. Open the app and log in
2. Navigate to Resource Sharing (from Dashboard → Resource Sharing)
3. Select a session from the dropdown
4. Choose resource type (e.g., "Document")
5. Click "Choose File" and select a file
6. Wait for green checkmark and success message
7. Enter a title (optional, auto-filled from filename)
8. Enter description (optional)
9. Click "Share Resource"
10. Resource should appear in the list below
11. Try downloading the file to confirm it works

## Expected Console Output

After successful upload, you should see:
```
File uploaded successfully. Public URL: https://gphmcbniijsoplnfifgx.supabase.co/storage/v1/object/public/session-resources/...
```

## Troubleshooting

### If URL is still invalid after bucket creation:
- Clear browser cache and refresh
- Check if bucket name is exactly `session-resources` (case-sensitive)
- Verify bucket is set to "public"
- Check RLS policies are active

### If upload fails with 403 Forbidden:
- User may not be authenticated
- RLS policies may not be correctly set
- Check Supabase logs for details

### If files upload but can't be downloaded:
- Bucket may not be public
- RLS SELECT policy may be missing
- URL structure may be incorrect

## Related Files
- Component: `src/components/ResourceSharing.tsx`
- Upload function: `handleFileUpload` (lines 100-150)
- Validation: `handleShareResource` (checks for `resourceUrl`)
