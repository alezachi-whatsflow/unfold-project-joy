-- Delete duplicate whatsapp_leads keeping only the one with assigned_attendant_id or the most recent
DELETE FROM public.whatsapp_leads a
USING public.whatsapp_leads b
WHERE a.chat_id = b.chat_id
  AND a.id < b.id
  AND (a.assigned_attendant_id IS NULL OR b.assigned_attendant_id IS NOT NULL);

-- Add unique constraint on chat_id + instance_name to prevent future duplicates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_leads_chat_id_instance_key'
  ) THEN
    ALTER TABLE public.whatsapp_leads
      ADD CONSTRAINT whatsapp_leads_chat_id_instance_key UNIQUE(chat_id, instance_name);
  END IF;
END $$;
