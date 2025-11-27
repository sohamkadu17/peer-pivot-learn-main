-- Fix security issues: Update functions to have secure search_path

-- Update the handle_new_user function to have secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer 
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, college_email, credits)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username', NEW.raw_user_meta_data ->> 'college_email', 100);
  RETURN NEW;
END;
$$;

-- Update the update_updated_at_column function to have secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;