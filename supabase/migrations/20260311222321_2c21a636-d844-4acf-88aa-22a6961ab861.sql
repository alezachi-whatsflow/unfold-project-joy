
-- Add updated_at column to whatsapp_messages
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Set existing rows
UPDATE public.whatsapp_messages SET updated_at = created_at WHERE updated_at IS NULL;

-- Create trigger function to auto-update
CREATE OR REPLACE FUNCTION public.set_whatsapp_messages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_whatsapp_messages_updated_at ON public.whatsapp_messages;
CREATE TRIGGER trg_whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_whatsapp_messages_updated_at();
