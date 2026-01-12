-- Fix profiles table RLS to be more secure
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create more restrictive policies
-- Authenticated users can view all profiles (needed for showing names in reservations/issues)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Add missing foreign key relationships for reservations and issues to profiles
-- First add the foreign key from reservations.user_id to profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reservations_user_id_fkey'
  ) THEN
    ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key from issues.reported_by to profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'issues_reported_by_fkey'
  ) THEN
    ALTER TABLE public.issues
    ADD CONSTRAINT issues_reported_by_fkey
    FOREIGN KEY (reported_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;