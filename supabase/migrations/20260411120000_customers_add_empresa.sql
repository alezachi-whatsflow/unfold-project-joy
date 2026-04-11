-- Add empresa (company name) field to customers table
-- Integrates with inbox lead panel, negocios, and Golden Record
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS empresa text;

COMMENT ON COLUMN customers.empresa IS 'Company/organization name for B2B contacts';

CREATE INDEX IF NOT EXISTS idx_customers_empresa ON customers(empresa) WHERE empresa IS NOT NULL;
