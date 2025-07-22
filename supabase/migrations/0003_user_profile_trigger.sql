-- =====================================================
-- PBLab User Profile Trigger Migration
-- =====================================================
-- Purpose: Create function and trigger to automatically copy new auth.users to public.users
-- This ensures seamless user profile creation for magic link authentication
-- Special considerations: Handles role assignment and prevents duplicate inserts
-- =====================================================

-- Function to handle new user registration
-- This will be called automatically when a new user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user into public.users table
  -- Default role is 'student' unless explicitly set in user metadata
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'::user_role),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically call handle_new_user() when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated; 