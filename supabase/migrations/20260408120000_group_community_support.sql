-- Group and Community support for unified inbox
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT false;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS parent_group_id TEXT;

ALTER TABLE public.whatsapp_leads ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;
ALTER TABLE public.whatsapp_leads ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT false;
ALTER TABLE public.whatsapp_leads ADD COLUMN IF NOT EXISTS parent_group_id TEXT;
ALTER TABLE public.whatsapp_leads ADD COLUMN IF NOT EXISTS group_subject TEXT;

ALTER TABLE public.whatsapp_groups ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT false;
ALTER TABLE public.whatsapp_groups ADD COLUMN IF NOT EXISTS parent_group_id TEXT;
ALTER TABLE public.whatsapp_groups ADD COLUMN IF NOT EXISTS linked_groups TEXT[];

CREATE INDEX IF NOT EXISTS idx_leads_is_group ON public.whatsapp_leads(is_group) WHERE is_group = true;
