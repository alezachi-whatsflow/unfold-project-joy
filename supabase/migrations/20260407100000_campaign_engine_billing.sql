-- ============================================================================
-- Campaign Engine + Billing System
-- Phase 1: Tables, Billing Rates, Analytical View, RLS
-- ============================================================================

-- 1. Campaigns table (evolves mass_send_batches)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  partner_id        UUID,                                    -- Pzaafi Partner (for billing hierarchy)
  name              TEXT NOT NULL,
  channel           TEXT NOT NULL DEFAULT 'uazapi',          -- 'uazapi' | 'meta' | 'messenger' | 'telegram'
  instance_name     TEXT,
  type              TEXT DEFAULT 'simple',                   -- 'simple' | 'template' | 'advanced'
  status            TEXT NOT NULL DEFAULT 'pending',         -- pending | scheduled | running | paused | completed | failed | cancelled
  message_type      TEXT DEFAULT 'text',                     -- text | hsm | media | document
  message_body      TEXT,
  media_url         TEXT,
  template_id       TEXT,
  template_params   JSONB DEFAULT '{}',
  total_recipients  INTEGER NOT NULL DEFAULT 0,
  sent_count        INTEGER NOT NULL DEFAULT 0,
  delivered_count   INTEGER NOT NULL DEFAULT 0,
  failed_count      INTEGER NOT NULL DEFAULT 0,
  delay_min_ms      INTEGER DEFAULT 5000,                    -- Min delay between messages (ms)
  delay_max_ms      INTEGER DEFAULT 15000,                   -- Max delay between messages (ms)
  scheduled_at      TIMESTAMPTZ,                             -- NULL = immediate, set = scheduled
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_by        UUID,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_tenant_status ON public.campaigns(tenant_id, status);
CREATE INDEX idx_campaigns_partner ON public.campaigns(partner_id);
CREATE INDEX idx_campaigns_scheduled ON public.campaigns(scheduled_at) WHERE status = 'scheduled';

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_tenant_isolation" ON public.campaigns
  FOR ALL TO authenticated
  USING (public.is_nexus_user() OR tenant_id IN (SELECT public.get_authorized_tenant_ids()))
  WITH CHECK (public.is_nexus_user() OR tenant_id IN (SELECT public.get_authorized_tenant_ids()));

-- 2. Campaign Logs (individual message tracking)
CREATE TABLE IF NOT EXISTS public.campaign_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  recipient_phone   TEXT NOT NULL,
  recipient_name    TEXT,
  channel           TEXT NOT NULL DEFAULT 'uazapi',
  provider_msg_id   TEXT,                                    -- WhatsApp/Meta message ID
  status            TEXT NOT NULL DEFAULT 'pending',         -- pending | processing | sent | delivered | read | failed
  fail_reason       TEXT,
  attempt_count     INTEGER DEFAULT 0,
  cost              NUMERIC(10, 6) DEFAULT 0,                -- Exact cost (NUMERIC, not FLOAT)
  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  read_at           TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_logs_campaign ON public.campaign_logs(campaign_id, status);
CREATE INDEX idx_campaign_logs_tenant ON public.campaign_logs(tenant_id, sent_at);
CREATE INDEX idx_campaign_logs_phone ON public.campaign_logs(recipient_phone);
CREATE INDEX idx_campaign_logs_provider ON public.campaign_logs(provider_msg_id) WHERE provider_msg_id IS NOT NULL;
CREATE INDEX idx_campaign_logs_billing ON public.campaign_logs(tenant_id, channel, sent_at) WHERE status IN ('sent', 'delivered', 'read');

ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_logs_tenant_isolation" ON public.campaign_logs
  FOR ALL TO authenticated
  USING (public.is_nexus_user() OR tenant_id IN (SELECT public.get_authorized_tenant_ids()))
  WITH CHECK (public.is_nexus_user() OR tenant_id IN (SELECT public.get_authorized_tenant_ids()));

-- 3. Billing Rates (per partner, per channel)
CREATE TABLE IF NOT EXISTS public.billing_rates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID,                                    -- NULL = global default rate
  tenant_id         UUID,                                    -- NULL = applies to all tenants of partner
  channel           TEXT NOT NULL,                           -- 'uazapi' | 'meta' | 'messenger' | 'telegram'
  cost_per_message  NUMERIC(10, 6) NOT NULL DEFAULT 0.030000, -- R$ per message (NUMERIC for precision)
  effective_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at        DATE,                                    -- NULL = indefinite
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_billing_rates_lookup ON public.billing_rates(channel, effective_date DESC);
CREATE INDEX idx_billing_rates_partner ON public.billing_rates(partner_id, channel);

ALTER TABLE public.billing_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_rates_admin_read" ON public.billing_rates
  FOR SELECT TO authenticated
  USING (public.is_nexus_user() OR partner_id IS NULL OR tenant_id IN (SELECT public.get_authorized_tenant_ids()));

CREATE POLICY "billing_rates_admin_write" ON public.billing_rates
  FOR ALL TO authenticated
  USING (public.is_nexus_user())
  WITH CHECK (public.is_nexus_user());

-- 4. Insert default billing rates
INSERT INTO public.billing_rates (channel, cost_per_message, description) VALUES
  ('uazapi', 0.000000, 'WhatsApp Web (uazapi) — sem custo API'),
  ('meta', 0.030000, 'WhatsApp Cloud API (Meta) — R$ 0,03/msg'),
  ('messenger', 0.000000, 'Facebook Messenger — sem custo API'),
  ('telegram', 0.000000, 'Telegram Bot API — sem custo API');

-- 5. Analytical View: daily_usage_reports
CREATE OR REPLACE VIEW public.daily_usage_reports AS
SELECT
  cl.tenant_id,
  c.partner_id,
  cl.channel,
  DATE(cl.sent_at) AS report_date,
  COUNT(*) FILTER (WHERE cl.status IN ('sent', 'delivered', 'read')) AS successful_sends,
  COUNT(*) FILTER (WHERE cl.status = 'delivered') AS delivered_count,
  COUNT(*) FILTER (WHERE cl.status = 'read') AS read_count,
  COUNT(*) FILTER (WHERE cl.status = 'failed') AS failed_count,
  COUNT(*) AS total_attempts,
  -- Get applicable rate (partner-specific first, then global)
  COALESCE(
    (SELECT br.cost_per_message
     FROM public.billing_rates br
     WHERE br.channel = cl.channel
       AND (br.partner_id = c.partner_id OR br.partner_id IS NULL)
       AND br.effective_date <= DATE(cl.sent_at)
       AND (br.expires_at IS NULL OR br.expires_at >= DATE(cl.sent_at))
     ORDER BY br.partner_id NULLS LAST, br.effective_date DESC
     LIMIT 1),
    0
  ) AS unit_cost,
  -- Total cost = successful sends * unit cost
  COUNT(*) FILTER (WHERE cl.status IN ('sent', 'delivered', 'read')) *
  COALESCE(
    (SELECT br.cost_per_message
     FROM public.billing_rates br
     WHERE br.channel = cl.channel
       AND (br.partner_id = c.partner_id OR br.partner_id IS NULL)
       AND br.effective_date <= DATE(cl.sent_at)
       AND (br.expires_at IS NULL OR br.expires_at >= DATE(cl.sent_at))
     ORDER BY br.partner_id NULLS LAST, br.effective_date DESC
     LIMIT 1),
    0
  ) AS total_cost
FROM public.campaign_logs cl
JOIN public.campaigns c ON c.id = cl.campaign_id
WHERE cl.sent_at IS NOT NULL
GROUP BY cl.tenant_id, c.partner_id, cl.channel, DATE(cl.sent_at);

-- 6. Function: get rate for a specific context
CREATE OR REPLACE FUNCTION public.get_billing_rate(
  p_channel TEXT,
  p_partner_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT cost_per_message
     FROM public.billing_rates
     WHERE channel = p_channel
       AND (partner_id = p_partner_id OR partner_id IS NULL)
       AND effective_date <= p_date
       AND (expires_at IS NULL OR expires_at >= p_date)
     ORDER BY partner_id NULLS LAST, effective_date DESC
     LIMIT 1),
    0
  );
$$;

-- 7. Function: update campaign counters (called by workers)
CREATE OR REPLACE FUNCTION public.campaign_increment_counter(
  p_campaign_id UUID,
  p_field TEXT,  -- 'sent_count' | 'delivered_count' | 'failed_count'
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.campaigns SET %I = %I + $1, updated_at = now() WHERE id = $2',
    p_field, p_field
  ) USING p_amount, p_campaign_id;
END;
$$;

-- 8. Enable Realtime on campaigns (for live progress updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;

COMMENT ON TABLE public.campaigns IS 'Mass messaging campaigns with multi-channel support';
COMMENT ON TABLE public.campaign_logs IS 'Individual message outcomes per campaign recipient';
COMMENT ON TABLE public.billing_rates IS 'Per-channel, per-partner message pricing (NUMERIC precision)';
COMMENT ON VIEW public.daily_usage_reports IS 'Aggregated daily usage with billing calculations';
