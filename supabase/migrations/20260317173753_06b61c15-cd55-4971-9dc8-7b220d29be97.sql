
ALTER TABLE public.nexus_users
  ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ;

-- Preencher invite_sent_at para usuários existentes
UPDATE public.nexus_users
SET invite_sent_at = created_at
WHERE invite_sent_at IS NULL AND created_at IS NOT NULL;

-- Preencher invite_accepted_at para usuários que já fizeram login
UPDATE public.nexus_users
SET invite_accepted_at = last_login
WHERE invite_accepted_at IS NULL AND last_login IS NOT NULL;
