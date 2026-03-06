CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whitelabel text NOT NULL DEFAULT '',
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  cpf_cnpj text DEFAULT '',
  status text NOT NULL DEFAULT 'Ativo',
  data_ativacao text NOT NULL DEFAULT '',
  data_cancelado text,
  data_bloqueio text,
  data_desbloqueio text,
  data_vencimento text,
  dispositivos_oficial integer NOT NULL DEFAULT 0,
  dispositivos_nao_oficial integer NOT NULL DEFAULT 0,
  atendentes integer NOT NULL DEFAULT 0,
  adicional integer NOT NULL DEFAULT 0,
  checkout text NOT NULL DEFAULT '',
  receita text NOT NULL DEFAULT '',
  tipo_pagamento text NOT NULL DEFAULT '',
  condicao text NOT NULL DEFAULT '',
  valor_ultima_cobranca numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to customers" ON public.customers
  FOR ALL USING (true) WITH CHECK (true);