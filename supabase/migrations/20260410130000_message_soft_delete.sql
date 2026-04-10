-- Soft delete: preserve content, track who deleted
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS deleted_by UUID;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS deleted_by_name TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_deleted ON whatsapp_messages(is_deleted) WHERE is_deleted = true;
