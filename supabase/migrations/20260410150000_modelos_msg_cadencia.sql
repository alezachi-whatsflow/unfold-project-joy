-- ============================================================
-- Migration: Modelos de Msg — quick_replies enhancements + cadence tables
-- ============================================================

-- 1. Add new columns to quick_replies
ALTER TABLE quick_replies
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS sector_ids uuid[] DEFAULT '{}';

COMMENT ON COLUMN quick_replies.visibility IS 'all | sector | exclusive';
COMMENT ON COLUMN quick_replies.category IS 'Optional grouping: saudacao, atendimento, vendas, suporte, cobranca, follow-up, encerramento, outro';
COMMENT ON COLUMN quick_replies.sector_ids IS 'When visibility=sector, which department IDs can see this reply';

-- 2. Create message_cadences table
CREATE TABLE IF NOT EXISTS message_cadences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  stop_on_reply boolean NOT NULL DEFAULT true,
  visibility text NOT NULL DEFAULT 'all',
  sector_ids uuid[] DEFAULT '{}',
  usage_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create cadence_steps table
CREATE TABLE IF NOT EXISTS cadence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id uuid NOT NULL REFERENCES message_cadences(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  delay_minutes integer NOT NULL DEFAULT 5,
  body text NOT NULL,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_message_cadences_tenant ON message_cadences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cadence_steps_cadence ON cadence_steps(cadence_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_visibility ON quick_replies(visibility);
CREATE INDEX IF NOT EXISTS idx_quick_replies_category ON quick_replies(category);

-- 5. RLS for message_cadences
ALTER TABLE message_cadences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_cadences" ON message_cadences
  FOR ALL USING (
    tenant_id IN (
      SELECT tp.tenant_id FROM tenant_profiles tp WHERE tp.user_id = auth.uid()
    )
  );

-- 6. RLS for cadence_steps (via cadence → tenant)
ALTER TABLE cadence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_cadence_steps" ON cadence_steps
  FOR ALL USING (
    cadence_id IN (
      SELECT mc.id FROM message_cadences mc
      WHERE mc.tenant_id IN (
        SELECT tp.tenant_id FROM tenant_profiles tp WHERE tp.user_id = auth.uid()
      )
    )
  );

-- 7. Updated_at trigger for message_cadences
CREATE OR REPLACE FUNCTION update_cadence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cadence_updated_at ON message_cadences;
CREATE TRIGGER trg_cadence_updated_at
  BEFORE UPDATE ON message_cadences
  FOR EACH ROW EXECUTE FUNCTION update_cadence_updated_at();
