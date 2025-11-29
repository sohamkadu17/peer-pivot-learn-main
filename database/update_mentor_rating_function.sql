-- Function to automatically update mentor rating when feedback is submitted
-- This bypasses RLS issues by calculating the average server-side

CREATE OR REPLACE FUNCTION public.update_mentor_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
BEGIN
  -- Calculate average rating for the mentor from all feedback
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating
  FROM public.session_feedback
  WHERE mentor_id = NEW.mentor_id;
  
  -- Update the mentor's profile with the new average rating
  UPDATE public.profiles
  SET rating = ROUND(avg_rating::numeric, 2)
  WHERE user_id = NEW.mentor_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update rating when feedback is inserted
DROP TRIGGER IF EXISTS trigger_update_mentor_rating ON public.session_feedback;

CREATE TRIGGER trigger_update_mentor_rating
  AFTER INSERT OR UPDATE ON public.session_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mentor_rating();

-- Also update ratings for existing feedback
DO $$
DECLARE
  mentor_record RECORD;
  avg_rating DECIMAL(3,2);
BEGIN
  FOR mentor_record IN 
    SELECT DISTINCT mentor_id FROM public.session_feedback
  LOOP
    SELECT COALESCE(AVG(rating), 0) INTO avg_rating
    FROM public.session_feedback
    WHERE mentor_id = mentor_record.mentor_id;
    
    UPDATE public.profiles
    SET rating = ROUND(avg_rating::numeric, 2)
    WHERE user_id = mentor_record.mentor_id;
  END LOOP;
END $$;

SELECT 'Mentor rating update function and trigger created successfully!' as status;

