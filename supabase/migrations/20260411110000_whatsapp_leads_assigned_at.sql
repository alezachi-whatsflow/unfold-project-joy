-- Track when a conversation was assigned to an attendant
-- Used to prioritize recently-attended conversations at the top of "Em atendimento"
ALTER TABLE whatsapp_leads
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_whatsapp_leads_assigned_at
  ON whatsapp_leads(assigned_at DESC NULLS LAST)
  WHERE assigned_attendant_id IS NOT NULL;

COMMENT ON COLUMN whatsapp_leads.assigned_at IS 'Timestamp when attendant clicked Atender — used for priority sorting in inbox';
