-- ═══════════════════════════════════════════════════════════════
-- GROUP MANAGEMENT — Phase 1: Visual Kanban + Shared Inbox
-- Tables: whatsapp_groups, group_kanban_columns, group_attributions
-- All with Strict_Tenant_Isolation RLS
-- ═══════════════════════════════════════════════════════════════

-- 1. whatsapp_groups — group metadata synced from uazapi/Meta
CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  jid TEXT NOT NULL,                     -- 123456789-1234567890@g.us
  name TEXT,                              -- Group subject
  description TEXT,
  invite_link TEXT,
  profile_pic_url TEXT,
  participant_count INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,         -- Are we admin of this group?
  kanban_column_id UUID,                  -- Current kanban column
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sla_deadline TIMESTAMPTZ,               -- SLA expiry for response
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, jid)
);

CREATE INDEX IF NOT EXISTS idx_groups_tenant ON whatsapp_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_groups_kanban ON whatsapp_groups(kanban_column_id);
CREATE INDEX IF NOT EXISTS idx_groups_assigned ON whatsapp_groups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_groups_jid ON whatsapp_groups(jid);

-- 2. group_kanban_columns — customizable columns per tenant
CREATE TABLE IF NOT EXISTS public.group_kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,       -- auto-assign new groups here
  sla_minutes INTEGER,                    -- optional SLA for this column
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kanban_cols_tenant ON group_kanban_columns(tenant_id);

-- 3. group_attributions — shared inbox: who handles which group
CREATE TABLE IF NOT EXISTS public.group_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',           -- active, paused, completed
  notes TEXT,
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_attributions_tenant ON group_attributions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attributions_group ON group_attributions(group_id);
CREATE INDEX IF NOT EXISTS idx_attributions_user ON group_attributions(user_id);

-- 4. FK: whatsapp_groups.kanban_column_id → group_kanban_columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_groups_kanban_column') THEN
    ALTER TABLE whatsapp_groups
      ADD CONSTRAINT fk_groups_kanban_column
      FOREIGN KEY (kanban_column_id) REFERENCES group_kanban_columns(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Enable RLS on all 3 tables
ALTER TABLE whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_attributions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_groups' AND policyname = 'Strict_Tenant_Isolation') THEN
    CREATE POLICY "Strict_Tenant_Isolation" ON public.whatsapp_groups FOR ALL
      USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
      WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_kanban_columns' AND policyname = 'Strict_Tenant_Isolation') THEN
    CREATE POLICY "Strict_Tenant_Isolation" ON public.group_kanban_columns FOR ALL
      USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
      WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_attributions' AND policyname = 'Strict_Tenant_Isolation') THEN
    CREATE POLICY "Strict_Tenant_Isolation" ON public.group_attributions FOR ALL
      USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
      WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));
  END IF;
END $$;

-- 6. Enable Realtime for live Kanban updates
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_groups;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_attributions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Seed default kanban columns (will be created per-tenant on first use)
-- Tenants will get these defaults via the frontend hook
