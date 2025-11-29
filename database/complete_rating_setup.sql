-- ============================================
-- COMPLETE RATING SYSTEM SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Make feedback_text nullable (you already did this, but including for completeness)
ALTER TABLE public.session_feedback
ALTER COLUMN feedback_text DROP NOT NULL;

-- Step 2: Create function to update mentor rating automatically
-- This calculates the average rating from ALL feedback (bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_mentor_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  feedback_count INTEGER;
BEGIN
  -- Calculate average rating for the mentor from ALL feedback
  -- This runs with SECURITY DEFINER, so it bypasses RLS
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, feedback_count
  FROM public.session_feedback
  WHERE mentor_id = NEW.mentor_id;
  
  -- Only update if we have at least one feedback
  IF feedback_count > 0 THEN
    -- Update the mentor's profile with the new average rating
    UPDATE public.profiles
    SET rating = ROUND(avg_rating::numeric, 2)
    WHERE user_id = NEW.mentor_id;
    
    RAISE NOTICE 'Updated mentor % rating to % (from % feedback)', NEW.mentor_id, avg_rating, feedback_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to automatically update rating when feedback is inserted/updated
DROP TRIGGER IF EXISTS trigger_update_mentor_rating ON public.session_feedback;

CREATE TRIGGER trigger_update_mentor_rating
  AFTER INSERT OR UPDATE OF rating ON public.session_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mentor_rating();

-- Step 4: Update existing mentors' ratings based on current feedback
-- This will calculate ratings for all mentors who already have feedback
DO $$
DECLARE
  mentor_record RECORD;
  avg_rating DECIMAL(3,2);
  feedback_count INTEGER;
BEGIN
  FOR mentor_record IN 
    SELECT DISTINCT mentor_id FROM public.session_feedback
  LOOP
    SELECT 
      COALESCE(AVG(rating), 0),
      COUNT(*)
    INTO avg_rating, feedback_count
    FROM public.session_feedback
    WHERE mentor_id = mentor_record.mentor_id;
    
    IF feedback_count > 0 THEN
      UPDATE public.profiles
      SET rating = ROUND(avg_rating::numeric, 2)
      WHERE user_id = mentor_record.mentor_id;
      
      RAISE NOTICE 'Updated existing rating for mentor % to %', mentor_record.mentor_id, avg_rating;
    END IF;
  END LOOP;
END $$;

-- Step 5: Verify the setup
SELECT 
  'Setup Complete!' as status,
  (SELECT COUNT(*) FROM public.session_feedback) as total_feedback,
  (SELECT COUNT(DISTINCT mentor_id) FROM public.session_feedback) as mentors_with_feedback,
  (SELECT COUNT(*) FROM public.profiles WHERE rating > 0) as mentors_with_ratings;

