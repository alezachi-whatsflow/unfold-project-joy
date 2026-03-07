
CREATE TABLE public.negocios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  titulo text NOT NULL,
  status text NOT NULL DEFAULT 'prospeccao',
  origem text NOT NULL DEFAULT 'inbound',
  cliente_id uuid NULL,
  cliente_nome text NULL,
  consultor_id uuid NULL,
  consultor_nome text NULL,
  produtos jsonb NOT NULL DEFAULT '[]'::jsonb,
  valor_total numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  desconto_tipo text NOT NULL DEFAULT 'percent',
  valor_liquido numeric NOT NULL DEFAULT 0,
  data_criacao timestamptz NOT NULL DEFAULT now(),
  data_previsao_fechamento date NULL,
  data_fechamento date NULL,
  gerar_nf boolean NOT NULL DEFAULT true,
  nf_emitida_id text NULL,
  gerar_cobranca boolean NOT NULL DEFAULT true,
  cobranca_id text NULL,
  forma_pagamento text NOT NULL DEFAULT 'a_definir',
  condicao_pagamento text NOT NULL DEFAULT 'À vista',
  probabilidade integer NOT NULL DEFAULT 50,
  notas text NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  historico jsonb NOT NULL DEFAULT '[]'::jsonb,
  motivo_perda text NULL,
  motivo_perda_detalhe text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on negocios" ON public.negocios FOR SELECT USING (true);
CREATE POLICY "Allow public insert on negocios" ON public.negocios FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on negocios" ON public.negocios FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on negocios" ON public.negocios FOR DELETE USING (true);
