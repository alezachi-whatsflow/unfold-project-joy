-- ═══════════════════════════════════════════════════════════════
-- Facebook Messenger Support — Backend & Database
-- Extends channel_integrations + chat_messages for Messenger
-- ═══════════════════════════════════════════════════════════════

-- 1. Add Messenger-specific fields to channel_integrations
ALTER TABLE channel_integrations
  ADD COLUMN IF NOT EXISTS page_access_token TEXT,
  ADD COLUMN IF NOT EXISTS page_name TEXT,
  ADD COLUMN IF NOT EXISTS message_type TEXT;
-- provider ENUM now: 'WABA' | 'INSTAGRAM' | 'MESSENGER'

-- 2. Add metadata JSONB to chat_messages (was being inserted but column didn't exist)
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp';
-- channel: 'whatsapp' | 'instagram' | 'messenger'

-- 3. Index for channel filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(tenant_id, channel);

-- 4. Update conversations.channel default and add provider
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS provider TEXT;