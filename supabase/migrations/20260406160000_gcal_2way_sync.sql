-- ============================================================================
-- Google Calendar 2-Way Sync
-- 1. Add user_id to google_calendar_configs (per-user connections)
-- 2. Create activity_gcal_sync mapping table
-- 3. Add sync preferences columns
-- ============================================================================

-- 1. Add user_id to google_calendar_configs for per-user isolation
ALTER TABLE public.google_calendar_configs
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS sync_to_google BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sync_from_google BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS selected_calendar_id TEXT DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS selected_calendar_name TEXT,
  ADD COLUMN IF NOT EXISTS push_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS push_resource_id TEXT,
  ADD COLUMN IF NOT EXISTS push_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_token TEXT;

-- Drop old unique constraint and create new one including user_id
ALTER TABLE public.google_calendar_configs
  DROP CONSTRAINT IF EXISTS google_calendar_configs_tenant_id_google_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gcal_configs_user_email
  ON public.google_calendar_configs(user_id, google_email)
  WHERE user_id IS NOT NULL;

-- Keep tenant-level fallback for backwards compat
CREATE UNIQUE INDEX IF NOT EXISTS idx_gcal_configs_tenant_email
  ON public.google_calendar_configs(tenant_id, google_email)
  WHERE user_id IS NULL;

-- Update RLS to include user-level isolation
DROP POLICY IF EXISTS "google_calendar_configs_tenant_isolation" ON public.google_calendar_configs;
DROP POLICY IF EXISTS "Strict_Tenant_Isolation" ON public.google_calendar_configs;

CREATE POLICY "gcal_user_tenant_isolation" ON public.google_calendar_configs
  FOR ALL TO authenticated
  USING (
    public.is_nexus_user()
    OR (user_id = auth.uid())
    OR (user_id IS NULL AND tenant_id IN (SELECT public.get_authorized_tenant_ids()))
  )
  WITH CHECK (
    public.is_nexus_user()
    OR (user_id = auth.uid())
    OR (user_id IS NULL AND tenant_id IN (SELECT public.get_authorized_tenant_ids()))
  );

-- 2. Activity-to-Google Calendar event mapping
CREATE TABLE IF NOT EXISTS public.activity_gcal_sync (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id     UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  gcal_event_id   TEXT NOT NULL,
  gcal_config_id  UUID NOT NULL REFERENCES public.google_calendar_configs(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,
  user_id         UUID NOT NULL,
  calendar_id     TEXT DEFAULT 'primary',
  event_link      TEXT,
  meet_link       TEXT,
  sync_direction  TEXT DEFAULT 'whatsflow_to_google',  -- 'whatsflow_to_google' | 'google_to_whatsflow' | 'bidirectional'
  last_synced_at  TIMESTAMPTZ DEFAULT now(),
  etag            TEXT,                                 -- Google Calendar ETag for conflict detection
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_gcal_sync_activity ON public.activity_gcal_sync(activity_id, gcal_config_id);
CREATE INDEX idx_gcal_sync_event ON public.activity_gcal_sync(gcal_event_id);
CREATE INDEX idx_gcal_sync_user ON public.activity_gcal_sync(user_id, tenant_id);

ALTER TABLE public.activity_gcal_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gcal_sync_user_isolation" ON public.activity_gcal_sync
  FOR ALL TO authenticated
  USING (
    public.is_nexus_user()
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.is_nexus_user()
    OR user_id = auth.uid()
  );

-- 3. Add gcal_event_id to activities table for quick lookup
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS gcal_event_id TEXT,
  ADD COLUMN IF NOT EXISTS gcal_synced BOOLEAN DEFAULT false;

-- Enable Realtime on sync table
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_gcal_sync;

COMMENT ON TABLE public.activity_gcal_sync IS 'Maps Whatsflow activities to Google Calendar events for 2-way sync';
