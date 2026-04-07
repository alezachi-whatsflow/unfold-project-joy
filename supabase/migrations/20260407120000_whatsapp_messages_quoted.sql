-- Add quoted_message_id column for reply tracking
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS quoted_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_wa_messages_quoted
  ON public.whatsapp_messages(quoted_message_id)
  WHERE quoted_message_id IS NOT NULL;

COMMENT ON COLUMN public.whatsapp_messages.quoted_message_id
  IS 'Provider message_id of the quoted/replied message (for reply threading)';
