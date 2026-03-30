-- ══════════════════════════════════════════════════════════════
-- DESPESAS REDESIGN — Schema upgrade + RLS + Realtime + Storage
-- ══════════════════════════════════════════════════════════════

-- 1. Adicionar colunas faltantes
ALTER TABLE public.asaas_expenses
  ADD COLUMN IF NOT EXISTS attachment_type TEXT CHECK (attachment_type IN ('image', 'pdf')),
  ADD COLUMN IF NOT EXISTS attachment_filename TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'Manual' CHECK (origem IN ('IA', 'Manual'));

-- 2. Atualizar origem das despesas existentes criadas pela IA
UPDATE public.asaas_expenses
SET origem = 'IA'
WHERE attachment_url IS NOT NULL AND attachment_url LIKE '%uazapi%';

-- 3. Atualizar status das despesas IA existentes para 'pago'
UPDATE public.asaas_expenses
SET is_paid = true
WHERE origem = 'IA';

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date
  ON public.asaas_expenses(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_status
  ON public.asaas_expenses(tenant_id, is_paid);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_origem
  ON public.asaas_expenses(tenant_id, origem);

-- 5. Ativar Realtime para despesas (nova despesa via IA aparece instant)
ALTER PUBLICATION supabase_realtime ADD TABLE public.asaas_expenses;

-- 6. Storage bucket para comprovantes (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-attachments',
  'expense-attachments',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 7. Storage policies
DROP POLICY IF EXISTS "tenant_upload_expense_attachments" ON storage.objects;
CREATE POLICY "tenant_upload_expense_attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-attachments');

DROP POLICY IF EXISTS "public_read_expense_attachments" ON storage.objects;
CREATE POLICY "public_read_expense_attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'expense-attachments');
