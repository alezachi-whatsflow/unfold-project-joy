-- ============================================================
-- P1-5: Retention policy for whatsapp_messages
-- Messages older than 6 months get media_url nullified and
-- file queued for encryption/deletion via data lifecycle.
-- Raw payload is trimmed for old messages to save storage.
-- ============================================================

-- 1. Add index for efficient retention queries
CREATE INDEX IF NOT EXISTS idx_wa_messages_retention
  ON public.whatsapp_messages (created_at)
  WHERE media_url IS NOT NULL;

-- 2. Function to trim old message payloads (run via pg_cron if enabled)
CREATE OR REPLACE FUNCTION public.trim_old_message_payloads()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trimmed INT := 0;
  v_media_cleared INT := 0;
  v_cutoff TIMESTAMPTZ := now() - INTERVAL '6 months';
BEGIN
  -- Trim raw_payload to save storage (keep only essential fields)
  UPDATE whatsapp_messages
  SET raw_payload = jsonb_build_object(
    'pushName', raw_payload->'pushName',
    'senderName', raw_payload->'senderName',
    'groupSubject', raw_payload->'groupSubject',
    '_trimmed', true,
    '_trimmed_at', to_jsonb(now()::text)
  )
  WHERE created_at < v_cutoff
    AND raw_payload IS NOT NULL
    AND raw_payload ? '_trimmed' IS NOT TRUE
    AND jsonb_typeof(raw_payload) = 'object';

  GET DIAGNOSTICS v_trimmed = ROW_COUNT;

  -- Queue media files for encryption/archival
  INSERT INTO data_lifecycle_queue (tenant_id, operation_type, target_table, target_id, storage_path, status, scheduled_for)
  SELECT
    NULL, -- tenant_id resolved by lifecycle processor
    'archive_media',
    'whatsapp_messages',
    id,
    media_url,
    'pending',
    now()
  FROM whatsapp_messages
  WHERE created_at < v_cutoff
    AND media_url IS NOT NULL
    AND file_encrypted = false
    AND id NOT IN (SELECT target_id FROM data_lifecycle_queue WHERE target_table = 'whatsapp_messages' AND operation_type = 'archive_media');

  GET DIAGNOSTICS v_media_cleared = ROW_COUNT;

  RETURN jsonb_build_object(
    'trimmed_payloads', v_trimmed,
    'media_queued', v_media_cleared,
    'cutoff', v_cutoff
  );
END;
$$;

-- Restrict to service_role
REVOKE ALL ON FUNCTION public.trim_old_message_payloads FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trim_old_message_payloads TO service_role;

-- 3. Comment for operational awareness
COMMENT ON FUNCTION public.trim_old_message_payloads IS
  'Retention: trims raw_payload and queues media for archival on messages older than 6 months. Run via pg_cron or manual invocation.';
