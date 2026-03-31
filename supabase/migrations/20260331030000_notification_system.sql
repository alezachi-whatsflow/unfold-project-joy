-- ============================================================
-- Notification System: upgrade existing notifications table
-- and create notification_preferences table
-- ============================================================

-- Add missing columns to existing notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS link TEXT,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Backfill: map old type → category, read_at → is_read
UPDATE public.notifications SET category = COALESCE(type, 'sistema') WHERE category IS NULL;
UPDATE public.notifications SET is_read = true WHERE read_at IS NOT NULL AND is_read = false;
UPDATE public.notifications SET link = action_url WHERE link IS NULL AND action_url IS NOT NULL;

-- Add check constraint for category
DO $$ BEGIN
  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_category_check
    CHECK (category IN ('mensageria','crm','financeiro','tickets','sla','sistema'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Make category NOT NULL now that backfill is done
ALTER TABLE public.notifications ALTER COLUMN category SET NOT NULL;

-- Make user_id NOT NULL (was nullable before)
UPDATE public.notifications SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;
ALTER TABLE public.notifications ALTER COLUMN user_id SET NOT NULL;

-- Create indexes (IF NOT EXISTS not supported for indexes, use DO block)
DO $$ BEGIN
  CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX idx_notifications_tenant ON notifications(tenant_id, created_at DESC);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Drop old policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view own tenant notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "user_sees_own" ON notifications;
DROP POLICY IF EXISTS "user_updates_own" ON notifications;
DROP POLICY IF EXISTS "system_inserts" ON notifications;

-- Policies scoped by user_id (more restrictive, better for bell)
CREATE POLICY "user_sees_own" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "user_updates_own" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "system_inserts" ON notifications FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;

-- Enable realtime for instant notifications
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Notification preferences per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL,
  mensageria BOOLEAN NOT NULL DEFAULT true,
  crm BOOLEAN NOT NULL DEFAULT true,
  financeiro BOOLEAN NOT NULL DEFAULT true,
  tickets BOOLEAN NOT NULL DEFAULT true,
  sla BOOLEAN NOT NULL DEFAULT true,
  sistema BOOLEAN NOT NULL DEFAULT false,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_prefs" ON notification_preferences;
CREATE POLICY "user_own_prefs" ON notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT ALL ON notification_preferences TO authenticated;
