-- Adiciona telefone ao tenant e configuração de split à licença
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN tenants.phone IS 'Telefone/WhatsApp de contato da empresa';

ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS split_config JSONB DEFAULT NULL;

COMMENT ON COLUMN licenses.split_config IS 'Configuração padrão de split de pagamento (JSON com enabled + recipients)';
