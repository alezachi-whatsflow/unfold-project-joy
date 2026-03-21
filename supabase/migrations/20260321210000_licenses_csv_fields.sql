-- Adiciona colunas faltantes na tabela licenses para cobrir todos os campos do CSV operacional
ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS cancelled_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unblocked_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checkout_url        TEXT,
  ADD COLUMN IF NOT EXISTS payment_type        TEXT DEFAULT 'boleto',
  ADD COLUMN IF NOT EXISTS payment_condition   TEXT DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS has_ia_auditor      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_ia_copiloto     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_ia_closer       BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN licenses.cancelled_at      IS 'Data de cancelamento da licença';
COMMENT ON COLUMN licenses.blocked_at        IS 'Data do último bloqueio';
COMMENT ON COLUMN licenses.unblocked_at      IS 'Data do último desbloqueio';
COMMENT ON COLUMN licenses.checkout_url      IS 'Link de checkout/assinatura do cliente';
COMMENT ON COLUMN licenses.payment_type      IS 'Forma de pagamento: boleto, pix, cartao, debito';
COMMENT ON COLUMN licenses.payment_condition IS 'Condição: mensal, trimestral, semestral, anual';
COMMENT ON COLUMN licenses.has_ia_auditor    IS 'Add-on: Auditor de Qualidade (+R$99/mês)';
COMMENT ON COLUMN licenses.has_ia_copiloto   IS 'Add-on: Copiloto do Consultor (+R$149/mês)';
COMMENT ON COLUMN licenses.has_ia_closer     IS 'Add-on: Closer Autônomo (+R$199/mês)';
