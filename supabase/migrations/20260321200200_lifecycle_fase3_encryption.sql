-- =====================================================================
-- LIFECYCLE FASE 3 — Regra 2: Criptografia Automática após 6 Meses
-- Arquivos com 6+ meses são enfileirados para criptografia AES-256
-- =====================================================================

-- =====================================================================
-- 1. Campos de controle de criptografia nas tabelas de mensagens
-- =====================================================================

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS file_encrypted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS file_encrypted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS encryption_key_id UUID;

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS file_encrypted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS file_encrypted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS encryption_key_id UUID;

-- Índice para o job de identificação (só arquivos de mídia não criptografados)
CREATE INDEX IF NOT EXISTS idx_chat_messages_encrypt_queue
  ON public.chat_messages(file_encrypted, created_at)
  WHERE content_type IN ('image', 'audio', 'video', 'document');

-- =====================================================================
-- 2. Função: queue_files_for_encryption
-- Identifica arquivos com 6+ meses e enfileira para criptografia
-- =====================================================================

CREATE OR REPLACE FUNCTION public.queue_files_for_encryption()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queued INT := 0;
  v_cutoff TIMESTAMPTZ := NOW() - INTERVAL '6 months';
BEGIN
  -- Enfileirar arquivos de chat_messages
  WITH to_encrypt AS (
    SELECT
      cm.id AS message_id,
      cm.tenant_id,
      COALESCE(
        cm.metadata->>'storage_path',
        'media/' || cm.tenant_id::TEXT || '/' || cm.id::TEXT
      ) AS storage_path
    FROM public.chat_messages cm
    WHERE cm.content_type IN ('image', 'audio', 'video', 'document')
      AND (cm.file_encrypted = false OR cm.file_encrypted IS NULL)
      AND cm.created_at < v_cutoff
      AND cm.tenant_id IS NOT NULL
      -- Não duplicar na fila
      AND NOT EXISTS (
        SELECT 1 FROM public.data_lifecycle_queue dlq
        WHERE dlq.target_id = cm.id
          AND dlq.operation_type = 'encrypt_file'
          AND dlq.status IN ('pending', 'processing')
      )
    LIMIT 1000
  )
  INSERT INTO public.data_lifecycle_queue (
    tenant_id, operation_type, target_table, target_id,
    storage_path, status, scheduled_for
  )
  SELECT
    tenant_id, 'encrypt_file', 'chat_messages', message_id,
    storage_path, 'pending', NOW()
  FROM to_encrypt;

  GET DIAGNOSTICS v_queued = ROW_COUNT;

  -- Log da operação
  INSERT INTO public.data_lifecycle_audit (
    operation_type, operation_status,
    records_affected, triggered_by, metadata
  ) VALUES (
    'queue_files_for_encryption', 'completed',
    v_queued, 'pg_cron',
    jsonb_build_object('cutoff_date', v_cutoff, 'files_queued', v_queued)
  );

  RETURN jsonb_build_object('files_queued', v_queued, 'cutoff', v_cutoff);
END;
$$;

REVOKE ALL ON FUNCTION public.queue_files_for_encryption FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_files_for_encryption TO service_role;

-- =====================================================================
-- 3. pg_cron jobs para criptografia automática
-- =====================================================================

-- Job 1: 02:00 BRT — identificar novos arquivos para criptografar
SELECT cron.schedule(
  'queue-files-for-encryption',
  '0 5 * * *',
  $$ SELECT public.queue_files_for_encryption(); $$
) ON CONFLICT (jobname) DO UPDATE SET schedule = '0 5 * * *';

-- Job 2: 03:00 BRT — processar fila via Edge Function
SELECT cron.schedule(
  'process-file-encryption',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/encrypt-old-files',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
) ON CONFLICT (jobname) DO UPDATE SET schedule = '0 6 * * *';
