-- ══════════════════════════════════════════════════════════════════════════
-- Customers: dynamic attributes + document_type + address + OCR support
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Add flexible JSONB column for tenant-specific fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dynamic_attributes JSONB DEFAULT '{}';

-- 2. Add structured address fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bairro TEXT;

-- 3. Document type (CPF, CNPJ, MEI, Passaporte, etc.)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'CNPJ';

-- 4. Additional contact/business fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS razao_social TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS responsavel TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS segmento TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 5. OCR / import metadata
ALTER TABLE customers ADD COLUMN IF NOT EXISTS imported_from TEXT; -- 'ocr', 'csv', 'whatsapp', 'api', 'manual'
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(5,2); -- 0-100% confidence

-- 6. Tenant form configuration (which extra fields to show per tenant)
CREATE TABLE IF NOT EXISTS customer_form_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE customer_form_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strict_Tenant_Isolation_customer_form_configs" ON customer_form_configs
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));

-- 7. Index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_customers_dynamic_attrs ON customers USING gin(dynamic_attributes);
