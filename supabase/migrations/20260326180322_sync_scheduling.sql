-- Sync scheduling: manual or automatic sync operations
CREATE TABLE IF NOT EXISTS public.sync_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  target_tenant_ids UUID[] DEFAULT '{}',
  target_all BOOLEAN DEFAULT false,
  schedule_type TEXT NOT NULL DEFAULT 'manual',  -- manual, once, recurring
  scheduled_for TIMESTAMPTZ,                      -- when to execute (once)
  cron_expression TEXT,                            -- for recurring (e.g., "0 3 * * 1" = Mon 3AM)
  recurrence TEXT,                                 -- daily, weekly, monthly, custom
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  next_run_at TIMESTAMPTZ,
  total_runs INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sync_schedules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sync_schedules' AND policyname = 'nexus_manage_schedules') THEN
    CREATE POLICY "nexus_manage_schedules" ON public.sync_schedules FOR ALL USING (is_nexus_user()) WITH CHECK (is_nexus_user());
  END IF;
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_schedules TO anon, authenticated;