
CREATE TABLE public.asaas_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  description text NOT NULL,
  value numeric NOT NULL,
  date date NOT NULL,
  category text DEFAULT 'Serviço',
  client_name text DEFAULT '',
  billing_type text DEFAULT 'PIX',
  installments text DEFAULT 'À vista',
  installment_number integer DEFAULT 1,
  installment_total integer DEFAULT 1,
  status text DEFAULT 'PENDING',
  source text DEFAULT 'manual',
  asaas_payment_id text,
  payment_date date,
  due_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.asaas_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on asaas_revenue" ON public.asaas_revenue FOR SELECT USING (true);
CREATE POLICY "Allow public insert on asaas_revenue" ON public.asaas_revenue FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on asaas_revenue" ON public.asaas_revenue FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on asaas_revenue" ON public.asaas_revenue FOR DELETE USING (true);
