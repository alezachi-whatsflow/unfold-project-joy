
-- Add invitation tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invitation_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS invited_at timestamptz,
ADD COLUMN IF NOT EXISTS invite_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS invited_by uuid;

-- Update existing profiles to 'active' since they already have accounts
UPDATE public.profiles SET invitation_status = 'active' WHERE invitation_status = 'pending' OR invitation_status IS NULL;

-- Create a function to auto-update invitation_status when user confirms email
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When email_confirmed_at changes from null to a value, mark as active
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles 
    SET invitation_status = 'active', 
        invite_accepted_at = now()
    WHERE id = NEW.id 
      AND invitation_status != 'active';
  END IF;
  RETURN NEW;
END;
$$;
