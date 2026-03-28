-- Add new columns to whatsapp_groups for community management
ALTER TABLE public.whatsapp_groups
  ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 250,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open', -- open, closed
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Group members tracking
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  jid TEXT,
  name TEXT,
  is_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  invited_by TEXT,
  UNIQUE(group_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_tenant ON group_members(tenant_id);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_members' AND policyname = 'Tenant isolation on group_members') THEN
    CREATE POLICY "Tenant isolation on group_members"
      ON public.group_members FOR ALL TO authenticated
      USING (tenant_id IN (SELECT get_my_tenant_ids()))
      WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));
  END IF;
END $$;

GRANT ALL ON TABLE public.group_members TO authenticated;
