-- ══════════════════════════════════════════════════════════════════
-- SPRINT 1 — Follow-up Tracking + Proposals/Quotes
-- High-Ticket Enterprise: Hastam Automotive Luxury
-- ══════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 1. FOLLOW-UP LOGS                                              │
-- │ Tracks every follow-up action: automatic (webhook-detected)    │
-- │ and manual (cadence steps, scheduled reminders)                │
-- └─────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS follow_up_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,        -- composite key (instance::jid)
  agent_id      UUID REFERENCES auth.users(id),
  agent_name    TEXT,
  customer_phone TEXT,
  customer_name TEXT,

  -- Classification
  follow_up_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (follow_up_type IN ('auto_reengagement', 'cadence_step', 'manual', 'scheduled', 'ai_suggested')),
  channel       TEXT DEFAULT 'whatsapp',

  -- Timing
  scheduled_at  TIMESTAMPTZ,            -- when it was supposed to happen
  executed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),  -- when it actually happened
  response_received_at TIMESTAMPTZ,     -- when customer responded (null = no response yet)

  -- Context
  message_body  TEXT,                   -- first 200 chars of the follow-up message
  cadence_id    UUID REFERENCES message_cadences(id) ON DELETE SET NULL,
  cadence_step  INTEGER,

  -- Outcome
  resulted_in_response BOOLEAN DEFAULT false,
  resulted_in_meeting  BOOLEAN DEFAULT false,
  resulted_in_proposal BOOLEAN DEFAULT false,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_followup_tenant_date ON follow_up_logs(tenant_id, executed_at DESC);
CREATE INDEX idx_followup_agent ON follow_up_logs(agent_id, executed_at DESC);
CREATE INDEX idx_followup_conversation ON follow_up_logs(conversation_id);

ALTER TABLE follow_up_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_follow_ups" ON follow_up_logs
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = auth.uid()));

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 2. PROPOSALS / QUOTES                                          │
-- │ Full lifecycle: draft → sent → viewed → accepted/rejected      │
-- │ Link tracking for open/view detection                          │
-- └─────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS proposals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  negocio_id    UUID REFERENCES negocios(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  agent_id      UUID REFERENCES auth.users(id),
  agent_name    TEXT,

  -- Content
  title         TEXT NOT NULL,
  description   TEXT,
  items         JSONB DEFAULT '[]',     -- [{name, qty, unit_price, total}]
  subtotal      NUMERIC(14,2) DEFAULT 0,
  discount      NUMERIC(14,2) DEFAULT 0,
  discount_type TEXT DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  total_value   NUMERIC(14,2) DEFAULT 0,
  currency      TEXT DEFAULT 'BRL',
  payment_terms TEXT,                   -- "À vista", "12x", custom
  validity_days INTEGER DEFAULT 30,

  -- Status lifecycle
  status        TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised')),

  -- Timestamps
  sent_at       TIMESTAMPTZ,
  viewed_at     TIMESTAMPTZ,
  responded_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,

  -- Delivery
  pdf_url       TEXT,
  tracking_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  sent_via      TEXT DEFAULT 'whatsapp' CHECK (sent_via IN ('whatsapp', 'email', 'link', 'manual')),

  -- Notes
  notes         TEXT,
  rejection_reason TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_tenant_status ON proposals(tenant_id, status);
CREATE INDEX idx_proposals_negocio ON proposals(negocio_id);
CREATE INDEX idx_proposals_agent ON proposals(agent_id);
CREATE INDEX idx_proposals_tracking ON proposals(tracking_token);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_proposals" ON proposals
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = auth.uid()));

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 3. TRANSFER LOGS                                               │
-- │ Track every conversation handoff between agents                │
-- └─────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS transfer_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  from_agent_id   UUID REFERENCES auth.users(id),
  from_agent_name TEXT,
  to_agent_id     UUID REFERENCES auth.users(id),
  to_agent_name   TEXT,
  to_department   TEXT,
  reason          TEXT,
  transfer_type   TEXT DEFAULT 'manual' CHECK (transfer_type IN ('manual', 'auto_overflow', 'auto_sla', 'auto_skill')),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transfer_tenant_date ON transfer_logs(tenant_id, created_at DESC);

ALTER TABLE transfer_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_transfers" ON transfer_logs
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = auth.uid()));

-- ┌─────────────────────────────────────────────────────────────────┐
-- │ 4. LEAD SOURCE at conversation level                           │
-- └─────────────────────────────────────────────────────────────────┘

ALTER TABLE whatsapp_leads
  ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'organic';

COMMENT ON COLUMN whatsapp_leads.lead_source IS 'How the lead found us: organic, click_to_chat, instagram, facebook, website, referral, paid_ad, manual';
