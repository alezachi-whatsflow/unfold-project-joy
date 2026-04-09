-- Add encrypted API key, wallet_id, and account_status to asaas_connections
ALTER TABLE asaas_connections ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;
ALTER TABLE asaas_connections ADD COLUMN IF NOT EXISTS wallet_id TEXT;
ALTER TABLE asaas_connections ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'unknown';
