-- Add signature columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signature_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_text TEXT DEFAULT '';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.signature_enabled IS 'Whether automatic signature is appended to outgoing messages';
COMMENT ON COLUMN public.profiles.signature_text IS 'The signature text appended to messages (max 60 chars)';
