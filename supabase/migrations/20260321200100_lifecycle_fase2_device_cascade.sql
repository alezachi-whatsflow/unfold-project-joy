-- =====================================================================
-- LIFECYCLE FASE 2 — Regra 1: Exclusão em Cascata ao Remover Dispositivo
-- Quando um dispositivo é excluído, todos os dados vinculados são removidos
-- Suporta: whatsapp_connections (Meta/novo) e whatsapp_instances (UaZAPI/antigo)
-- =====================================================================

-- =====================================================================
-- 1. Função: delete_device_cascade
-- Exclui conversas, mensagens e arquivos do dispositivo
-- =====================================================================

CREATE OR REPLACE FUNCTION public.delete_device_cascade(
  p_device_id UUID,
  p_tenant_id UUID,
  p_device_type TEXT DEFAULT 'connection',  -- 'connection' ou 'instance'
  p_triggered_by TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ := NOW();
  v_messages_deleted BIGINT := 0;
  v_conversations_deleted BIGINT := 0;
  v_files_queued INT := 0;
  v_session_id TEXT;
  v_tenant_name TEXT;
  v_tenant_slug TEXT;
BEGIN
  -- Snapshot do tenant para o log
  SELECT name, slug INTO v_tenant_name, v_tenant_slug
  FROM public.tenants WHERE id = p_tenant_id;

  IF p_device_type = 'connection' THEN
    -- ── whatsapp_connections (Meta API / WhatsApp Web novo) ─────────────────

    -- Verificar que o dispositivo pertence ao tenant
    IF NOT EXISTS (
      SELECT 1 FROM public.whatsapp_connections
      WHERE id = p_device_id AND tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'Dispositivo % não pertence ao tenant %', p_device_id, p_tenant_id;
    END IF;

    -- Enfileirar arquivos para deleção no Storage antes de apagar registros
    INSERT INTO public.data_lifecycle_queue (
      tenant_id, operation_type, connection_id,
      storage_path, status, scheduled_for, metadata
    )
    SELECT DISTINCT
      p_tenant_id,
      'delete_device_files',
      p_device_id,
      'media/' || p_tenant_id::TEXT || '/' || p_device_id::TEXT,
      'pending',
      NOW(),
      jsonb_build_object('triggered_by', p_triggered_by)
    WHERE EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.conversations c ON c.id = cm.conversation_id
      WHERE c.wa_connection_id = p_device_id
        AND cm.content_type IN ('image', 'audio', 'video', 'document')
    );

    GET DIAGNOSTICS v_files_queued = ROW_COUNT;

    -- Deletar mensagens das conversas do dispositivo
    WITH deleted AS (
      DELETE FROM public.chat_messages
      WHERE conversation_id IN (
        SELECT id FROM public.conversations
        WHERE wa_connection_id = p_device_id AND tenant_id = p_tenant_id
      )
      RETURNING id
    )
    SELECT COUNT(*) INTO v_messages_deleted FROM deleted;

    -- Deletar conversas
    WITH deleted AS (
      DELETE FROM public.conversations
      WHERE wa_connection_id = p_device_id AND tenant_id = p_tenant_id
      RETURNING id
    )
    SELECT COUNT(*) INTO v_conversations_deleted FROM deleted;

    -- Soft delete do dispositivo
    UPDATE public.whatsapp_connections
    SET deleted_at = NOW(), cascade_deleted_at = NOW()
    WHERE id = p_device_id AND tenant_id = p_tenant_id;

  ELSIF p_device_type = 'instance' THEN
    -- ── whatsapp_instances (UaZAPI / legado) ────────────────────────────────

    -- Verificar que a instância pertence ao tenant
    IF NOT EXISTS (
      SELECT 1 FROM public.whatsapp_instances
      WHERE id = p_device_id AND tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'Instância % não pertence ao tenant %', p_device_id, p_tenant_id;
    END IF;

    -- Obter session_id (nome da instância para joins)
    SELECT session_id INTO v_session_id
    FROM public.whatsapp_instances
    WHERE id = p_device_id;

    -- Deletar logs de mensagens
    WITH deleted AS (
      DELETE FROM public.message_logs
      WHERE session_id = v_session_id AND tenant_id = p_tenant_id
      RETURNING id
    )
    SELECT COUNT(*) INTO v_messages_deleted FROM deleted;

    -- Deletar whatsapp_messages vinculadas
    DELETE FROM public.whatsapp_messages
    WHERE instance_name = v_session_id;

    -- Deletar leads e contatos da instância
    DELETE FROM public.whatsapp_leads WHERE instance_name = v_session_id;
    DELETE FROM public.whatsapp_contacts WHERE instance_name = v_session_id;

    -- Enfileirar exclusão de storage (pasta da instância)
    INSERT INTO public.data_lifecycle_queue (
      tenant_id, operation_type, connection_id,
      storage_path, status, scheduled_for, metadata
    ) VALUES (
      p_tenant_id,
      'delete_device_files',
      p_device_id,
      'media/' || p_tenant_id::TEXT || '/' || v_session_id,
      'pending',
      NOW(),
      jsonb_build_object('triggered_by', p_triggered_by, 'session_id', v_session_id)
    );

    v_files_queued := 1;

    -- Soft delete da instância
    UPDATE public.whatsapp_instances
    SET deleted_at = NOW(), cascade_deleted_at = NOW()
    WHERE id = p_device_id AND tenant_id = p_tenant_id;

  ELSE
    RAISE EXCEPTION 'device_type inválido: %. Use "connection" ou "instance"', p_device_type;
  END IF;

  -- Registrar no audit log
  INSERT INTO public.data_lifecycle_audit (
    tenant_id, tenant_name, tenant_slug,
    operation_type, operation_status,
    records_affected, files_deleted,
    triggered_by, execution_duration_ms, metadata
  ) VALUES (
    p_tenant_id, v_tenant_name, v_tenant_slug,
    'delete_device_cascade', 'completed',
    v_messages_deleted + v_conversations_deleted,
    v_files_queued,
    p_triggered_by,
    EXTRACT(MILLISECONDS FROM NOW() - v_start)::INT,
    jsonb_build_object(
      'device_id', p_device_id,
      'device_type', p_device_type,
      'messages_deleted', v_messages_deleted,
      'conversations_deleted', v_conversations_deleted,
      'files_queued', v_files_queued
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'device_id', p_device_id,
    'device_type', p_device_type,
    'messages_deleted', v_messages_deleted,
    'conversations_deleted', v_conversations_deleted,
    'files_queued_for_deletion', v_files_queued
  );

EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.data_lifecycle_audit (
    tenant_id, operation_type, operation_status,
    error_details, triggered_by
  ) VALUES (
    p_tenant_id, 'delete_device_cascade', 'failed', SQLERRM, p_triggered_by
  );
  RAISE;
END;
$$;

-- =====================================================================
-- 2. Trigger: capturar soft delete de whatsapp_connections
-- =====================================================================

CREATE OR REPLACE FUNCTION public.trigger_connection_softdelete_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    PERFORM public.delete_device_cascade(
      NEW.id, NEW.tenant_id, 'connection', 'trigger_softdelete'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_connection_softdelete ON public.whatsapp_connections;
CREATE TRIGGER on_connection_softdelete
  AFTER UPDATE ON public.whatsapp_connections
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION public.trigger_connection_softdelete_cascade();

-- 3. Trigger: capturar soft delete de whatsapp_instances
CREATE OR REPLACE FUNCTION public.trigger_instance_softdelete_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    PERFORM public.delete_device_cascade(
      NEW.id, NEW.tenant_id, 'instance', 'trigger_softdelete'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_instance_softdelete ON public.whatsapp_instances;
CREATE TRIGGER on_instance_softdelete
  AFTER UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION public.trigger_instance_softdelete_cascade();

-- =====================================================================
-- 4. pg_cron: processar fila de exclusão de arquivos a cada hora
-- =====================================================================

SELECT cron.schedule(
  'process-device-file-deletions',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM pg_settings WHERE name = 'app.supabase_url'
            UNION ALL SELECT current_setting('app.supabase_url', true) LIMIT 1)
           || '/functions/v1/delete-device-files',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
) ON CONFLICT (jobname) DO UPDATE SET schedule = '0 * * * *';
