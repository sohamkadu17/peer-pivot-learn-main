-- Fix function search path
CREATE OR REPLACE FUNCTION calculate_contribution_score(user_profile profiles)
RETURNS integer AS $$
BEGIN
  RETURN COALESCE(user_profile.credits, 0) + 
         (10 * COALESCE(user_profile.total_sessions_taught, 0)) + 
         (5 * COALESCE(
           (SELECT COUNT(*) FROM doubts WHERE student_id = user_profile.user_id AND is_resolved = true), 
           0
         )) +
         (3 * COALESCE(
           (SELECT COUNT(*) FROM resources WHERE uploaded_by = user_profile.user_id),
           0
         ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;