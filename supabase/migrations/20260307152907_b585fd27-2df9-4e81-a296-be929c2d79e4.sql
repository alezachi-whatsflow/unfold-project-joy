
-- Add attachment columns to asaas_expenses
ALTER TABLE public.asaas_expenses 
  ADD COLUMN IF NOT EXISTS attachment_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attachment_name text DEFAULT NULL;

-- Create storage bucket for expense attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-attachments', 'expense-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to expense attachments bucket
CREATE POLICY "Allow public read expense attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-attachments');

CREATE POLICY "Allow public insert expense attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'expense-attachments');

CREATE POLICY "Allow public delete expense attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'expense-attachments');
