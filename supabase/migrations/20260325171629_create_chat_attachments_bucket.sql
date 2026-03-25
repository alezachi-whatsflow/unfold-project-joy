-- ═══════════════════════════════════════════════════════════════
-- Create dedicated bucket for WhatsApp chat attachments
-- Previously using expense-attachments (wrong bucket)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'video/mp4','video/quicktime',
    'audio/mpeg','audio/ogg','audio/wav','audio/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload
DROP POLICY IF EXISTS "chat_upload" ON storage.objects;
CREATE POLICY "chat_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

-- Public read (needed for WhatsApp media delivery)
DROP POLICY IF EXISTS "chat_read" ON storage.objects;
CREATE POLICY "chat_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'chat-attachments');

-- Authenticated users can delete own files
DROP POLICY IF EXISTS "chat_delete" ON storage.objects;
CREATE POLICY "chat_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments');
