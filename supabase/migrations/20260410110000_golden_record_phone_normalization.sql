-- ══════════════════════════════════════════════════════════════════════════
-- GOLDEN RECORD: Phone Normalization + Identity Resolution
-- Ensures "5511988887777" and "551188887777" match the same customer.
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Create normalize_br_phone function
CREATE OR REPLACE FUNCTION public.normalize_br_phone(phone_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
  country_code TEXT;
  ddd TEXT;
  number_part TEXT;
  number_len INT;
BEGIN
  IF phone_text IS NULL OR phone_text = '' THEN
    RETURN NULL;
  END IF;

  -- Strip all non-digits
  digits := regexp_replace(phone_text, '[^0-9]', '', 'g');

  -- Remove leading zeros
  digits := ltrim(digits, '0');

  IF length(digits) < 8 THEN
    RETURN digits; -- Too short to normalize
  END IF;

  -- Add country code 55 if missing
  IF NOT digits LIKE '55%' THEN
    -- Could be just DDD+number (11 digits: DDD 2 + number 8-9)
    -- Or just number (8-9 digits)
    IF length(digits) >= 10 AND length(digits) <= 11 THEN
      -- Has DDD: prepend 55
      digits := '55' || digits;
    ELSIF length(digits) >= 8 AND length(digits) <= 9 THEN
      -- No DDD, no country code — can't normalize reliably
      RETURN digits;
    END IF;
  END IF;

  -- Now we expect 55 + DDD(2) + number(8 or 9) = 12 or 13 digits
  IF length(digits) < 12 OR length(digits) > 13 THEN
    RETURN digits; -- Not a standard BR number
  END IF;

  country_code := '55';
  ddd := substring(digits FROM 3 FOR 2);
  number_part := substring(digits FROM 5);
  number_len := length(number_part);

  -- Brazilian mobile rules:
  -- Cellphones (DDD 11-99): 9 digits starting with 9
  -- Landlines: 8 digits starting with 2-5
  IF number_len = 8 THEN
    -- Check if it looks like a cellphone (starts with 6,7,8,9) → add the 9
    IF substring(number_part FROM 1 FOR 1) IN ('6', '7', '8', '9') THEN
      number_part := '9' || number_part;
    END IF;
    -- Landlines (starts with 2,3,4,5) stay 8 digits
  ELSIF number_len = 9 THEN
    -- Already has 9th digit — valid
    NULL;
  END IF;

  RETURN country_code || ddd || number_part;
END;
$$;

-- 2. Add normalized_phone column to customers (generated column)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS normalized_phone TEXT
  GENERATED ALWAYS AS (normalize_br_phone(COALESCE(telefone, phone_lead, phone_company, phone_billing))) STORED;

-- 3. Add asaas_customer_id for linking to Asaas
ALTER TABLE customers ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual';

-- 4. Create unique constraint on (tenant_id, normalized_phone) — prevents duplicates
-- First, fix customers without tenant_id
UPDATE customers SET tenant_id = (
  SELECT id FROM tenants LIMIT 1
) WHERE tenant_id IS NULL;

-- Drop old email-only unique (too restrictive for multi-tenant)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;

-- Create composite unique index (allows same phone across different tenants)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_normalized_phone
  ON customers (tenant_id, normalized_phone)
  WHERE normalized_phone IS NOT NULL AND normalized_phone != '';

-- Also index by email per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_email
  ON customers (tenant_id, email)
  WHERE email IS NOT NULL AND email != '';

-- 5. Add normalized_phone to whatsapp_contacts for fast lookup
ALTER TABLE whatsapp_contacts ADD COLUMN IF NOT EXISTS normalized_phone TEXT
  GENERATED ALWAYS AS (normalize_br_phone(phone)) STORED;

-- 6. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_normalized_phone
  ON whatsapp_contacts (normalized_phone);

-- 7. Backfill telefone from existing phone columns
UPDATE customers SET telefone = COALESCE(phone_lead, phone_company, phone_billing)
WHERE telefone IS NULL AND COALESCE(phone_lead, phone_company, phone_billing) IS NOT NULL;

-- 8. Grant execute on normalize function
GRANT EXECUTE ON FUNCTION public.normalize_br_phone(TEXT) TO authenticated, anon, service_role;
