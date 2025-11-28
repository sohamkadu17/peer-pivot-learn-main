-- Quick Fix: Set is_mentor flag for existing mentor profiles
-- Run this in Supabase SQL Editor if mentors aren't showing in the dropdown

-- Option 1: Set is_mentor for all users with sessions taught
UPDATE public.profiles 
SET is_mentor = true 
WHERE total_sessions_taught >= 1;

-- Option 2: Set is_mentor for specific users by name
UPDATE public.profiles 
SET is_mentor = true 
WHERE username IN ('priyanka kalawadiya', 'Sarthak vilas kasar', 'Sarthak kasar', 'soham Kadu');

-- Option 3: Set is_mentor for all existing profiles (for testing)
UPDATE public.profiles 
SET is_mentor = true;

-- Verify the update
SELECT 
  user_id, 
  username, 
  is_mentor, 
  total_sessions_taught, 
  rating
FROM public.profiles 
WHERE is_mentor = true OR total_sessions_taught >= 1
ORDER BY rating DESC NULLS LAST;

-- Check total count
SELECT COUNT(*) as mentor_count 
FROM public.profiles 
WHERE is_mentor = true OR total_sessions_taught >= 1;
