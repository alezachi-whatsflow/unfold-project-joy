
-- Add CPF/CNPJ and email to tenants for license holder validation
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email TEXT;

-- Create unique indexes for deduplication logic
-- Email is not unique because 2 licenses can share email (then validate by CNPJ/CPF)
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_cpf_cnpj ON tenants(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;
