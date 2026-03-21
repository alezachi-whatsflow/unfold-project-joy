-- =====================================================================
-- LIFECYCLE FASE 4 — Regra 3: Exclusão de Tenant com 30 Dias de Graça
-- Soft delete → grace period 30 dias → hard delete automático em cascata
-- =====================================================================

-- =====================================================================
-- 1. Função: soft_delete_tenant
-- Inicia período de graça de 30 dias, bloqueia acesso imediatamente
-- =====================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_tenant(
  p_tenant_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_triggered_by TEXT DEFAULT 'nexus_admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_name TEXT;
  v_tenant_slug TEXT;
  v_deletion_date TIMESTAMPTZ := NOW() + INTERVAL '30 days';
BEGIN
  SELECT name, slug INTO v_tenant_name, v_tenant_slug
  FROM public.tenants
  WHERE id = p_tenant_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % não encontrado ou já excluído', p_tenant_id;
  END IF;

  -- Soft delete: data de exclusão + agendamento de 30 dias
  UPDATE public.tenants
  SET
    deleted_at = NOW(),
    deletion_scheduled_for = v_deletion_date,
    deletion_reason = p_reason
  WHERE id = p_tenant_id;

  -- Bloquear acesso: desativar profiles vinculados às licenças do tenant
  UPDATE public.profiles
  SET is_active = false
  WHERE license_id IN (
    SELECT id FROM public.licenses WHERE tenant_id = p_tenant_id
  );

  -- Remover item anterior da fila se houver (re-soft-delete)
  DELETE FROM public.data_lifecycle_queue
  WHERE target_id = p_tenant_id
    AND operation_type = 'delete_tenant'
    AND status = 'pending';

  -- Enfileirar exclusão permanente para daqui 30 dias
  INSERT INTO public.data_lifecycle_queue (
    tenant_id, operation_type, target_table, target_id,
    status, scheduled_for, metadata
  ) VALUES (
    p_tenant_id, 'delete_tenant', 'tenants', p_tenant_id,
    'pending', v_deletion_date,
    jsonb_build_object(
      'reason', p_reason,
      'triggered_by', p_triggered_by,
      'tenant_name', v_tenant_name,
      'tenant_slug', v_tenant_slug
    )
  );

  -- Registrar no nexus_audit_logs
  INSERT INTO public.nexus_audit_logs (
    actor_role, action, target_entity, new_value, justification
  ) VALUES (
    'pg_lifecycle',
    'tenant_soft_deleted',
    'tenant',
    jsonb_build_object(
      'tenant_id', p_tenant_id,
      'tenant_name', v_tenant_name,
      'tenant_slug', v_tenant_slug,
      'deletion_scheduled_for', v_deletion_date
    ),
    p_reason
  );

  -- Registrar no lifecycle audit
  INSERT INTO public.data_lifecycle_audit (
    tenant_id, tenant_name, tenant_slug,
    operation_type, operation_status,
    triggered_by, metadata
  ) VALUES (
    p_tenant_id, v_tenant_name, v_tenant_slug,
    'soft_delete_tenant', 'completed',
    p_triggered_by,
    jsonb_build_object(
      'reason', p_reason,
      'deletion_scheduled_for', v_deletion_date
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'tenant_name', v_tenant_name,
    'deleted_at', NOW(),
    'permanent_deletion_at', v_deletion_date,
    'message', 'Tenant bloqueado. Exclusão permanente agendada para 30 dias.'
  );
END;
$$;

-- =====================================================================
-- 2. Função: cancel_tenant_deletion
-- Cancela o período de graça (restaura acesso)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.cancel_tenant_deletion(
  p_tenant_id UUID,
  p_triggered_by TEXT DEFAULT 'nexus_admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_name TEXT;
BEGIN
  SELECT name INTO v_tenant_name
  FROM public.tenants
  WHERE id = p_tenant_id AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % não está em período de exclusão', p_tenant_id;
  END IF;

  -- Verificar que a exclusão ainda não foi executada
  IF NOT EXISTS (
    SELECT 1 FROM public.data_lifecycle_queue
    WHERE target_id = p_tenant_id
      AND operation_type = 'delete_tenant'
      AND status = 'pending'
      AND scheduled_for > NOW()
  ) THEN
    RAISE EXCEPTION 'Exclusão de % já foi executada ou não pode ser cancelada', p_tenant_id;
  END IF;

  -- Restaurar tenant
  UPDATE public.tenants
  SET deleted_at = NULL, deletion_scheduled_for = NULL, deletion_reason = NULL
  WHERE id = p_tenant_id;

  -- Reativar profiles
  UPDATE public.profiles
  SET is_active = true
  WHERE license_id IN (
    SELECT id FROM public.licenses WHERE tenant_id = p_tenant_id
  );

  -- Remover da fila
  DELETE FROM public.data_lifecycle_queue
  WHERE target_id = p_tenant_id AND operation_type = 'delete_tenant' AND status = 'pending';

  -- Audit log
  INSERT INTO public.nexus_audit_logs (actor_role, action, target_entity, new_value)
  VALUES (
    'pg_lifecycle', 'tenant_deletion_cancelled', 'tenant',
    jsonb_build_object('tenant_id', p_tenant_id, 'tenant_name', v_tenant_name)
  );

  RETURN jsonb_build_object('success', true, 'tenant_name', v_tenant_name);
END;
$$;

-- =====================================================================
-- 3. Função: hard_delete_tenant
-- Exclusão permanente em cascata — chamada pelo pg_cron após 30 dias
-- ORDEM: storage → mensagens → conversas → CRM → financeiro → profiles → tenant
-- =====================================================================

CREATE OR REPLACE FUNCTION public.hard_delete_tenant(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ := NOW();
  v_tenant_name TEXT;
  v_tenant_slug TEXT;
  v_counters JSONB := '{}';
  v_count BIGINT;
BEGIN
  -- Snapshot do tenant antes de deletar
  SELECT name, slug INTO v_tenant_name, v_tenant_slug
  FROM public.tenants WHERE id = p_tenant_id;

  IF v_tenant_name IS NULL THEN
    RAISE EXCEPTION 'Tenant % não encontrado', p_tenant_id;
  END IF;

  -- ── 1. Mensagens de chat ──────────────────────────────────────────────────
  DELETE FROM public.chat_messages
  WHERE conversation_id IN (
    SELECT id FROM public.conversations WHERE tenant_id = p_tenant_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counters := v_counters || jsonb_build_object('chat_messages', v_count);

  -- ── 2. Mensagens WhatsApp (UaZAPI) ────────────────────────────────────────
  DELETE FROM public.whatsapp_messages
  WHERE instance_name IN (
    SELECT session_id FROM public.whatsapp_instances WHERE tenant_id = p_tenant_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counters := v_counters || jsonb_build_object('whatsapp_messages', v_count);

  -- ── 3. Message logs ───────────────────────────────────────────────────────
  DELETE FROM public.message_logs WHERE tenant_id = p_tenant_id;

  -- ── 4. Conversas ──────────────────────────────────────────────────────────
  DELETE FROM public.conversations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counters := v_counters || jsonb_build_object('conversations', v_count);

  -- ── 5. Leads e contatos WhatsApp ──────────────────────────────────────────
  DELETE FROM public.whatsapp_leads
  WHERE instance_name IN (
    SELECT session_id FROM public.whatsapp_instances WHERE tenant_id = p_tenant_id
  );
  DELETE FROM public.whatsapp_contacts
  WHERE instance_name IN (
    SELECT session_id FROM public.whatsapp_instances WHERE tenant_id = p_tenant_id
  );

  -- ── 6. Instâncias e conexões WhatsApp ─────────────────────────────────────
  DELETE FROM public.whatsapp_instances WHERE tenant_id = p_tenant_id;
  DELETE FROM public.whatsapp_connections WHERE tenant_id = p_tenant_id;
  DELETE FROM public.meta_connections WHERE tenant_id = p_tenant_id;

  -- Campanhas (se a coluna tenant_id existir)
  BEGIN
    DELETE FROM public.whatsapp_campaigns
    WHERE instance_name IN (
      SELECT session_id FROM public.whatsapp_instances WHERE tenant_id = p_tenant_id
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- ── 7. CRM e Vendas ───────────────────────────────────────────────────────
  BEGIN
    DELETE FROM public.negocios WHERE tenant_id = p_tenant_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_counters := v_counters || jsonb_build_object('negocios', v_count);
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  BEGIN DELETE FROM public.crm_contacts WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.activities WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.tasks WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- ── 8. Financeiro ─────────────────────────────────────────────────────────
  BEGIN DELETE FROM public.asaas_payments WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.asaas_customers WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.asaas_expenses WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.asaas_connections WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.dunning_executions WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- ── 9. Digital Intelligence / IA ─────────────────────────────────────────
  BEGIN DELETE FROM public.digital_analyses WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.web_scraps WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.prospect_campaigns WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.audit_evaluations WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN DELETE FROM public.knowledge_base WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- ── 10. Notificações e exports ────────────────────────────────────────────
  BEGIN DELETE FROM public.notifications WHERE tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- ── 11. Chave de criptografia ─────────────────────────────────────────────
  DELETE FROM public.tenant_encryption_keys WHERE tenant_id = p_tenant_id;

  -- ── 12. Perfis de usuários ────────────────────────────────────────────────
  DELETE FROM public.profiles
  WHERE license_id IN (SELECT id FROM public.licenses WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counters := v_counters || jsonb_build_object('profiles', v_count);

  -- ── 13. Licenças ──────────────────────────────────────────────────────────
  DELETE FROM public.licenses WHERE tenant_id = p_tenant_id;

  -- ── 14. Tenant (último) ───────────────────────────────────────────────────
  DELETE FROM public.tenants WHERE id = p_tenant_id;

  -- ── 15. Enfileirar exclusão do Storage ────────────────────────────────────
  INSERT INTO public.data_lifecycle_queue (
    tenant_id, operation_type, storage_path,
    status, scheduled_for, metadata
  ) VALUES (
    NULL,
    'delete_tenant_storage',
    p_tenant_id::TEXT,
    'pending',
    NOW(),
    jsonb_build_object('tenant_name', v_tenant_name, 'tenant_slug', v_tenant_slug)
  );

  -- ── 16. Log imutável ──────────────────────────────────────────────────────
  INSERT INTO public.data_lifecycle_audit (
    tenant_id, tenant_name, tenant_slug,
    operation_type, operation_status,
    records_affected, triggered_by,
    execution_duration_ms, metadata
  ) VALUES (
    NULL, v_tenant_name, v_tenant_slug,
    'hard_delete_tenant', 'completed',
    COALESCE((v_counters->>'chat_messages')::BIGINT, 0) +
    COALESCE((v_counters->>'conversations')::BIGINT, 0),
    'pg_cron',
    EXTRACT(MILLISECONDS FROM NOW() - v_start)::INT,
    v_counters
  );

  RETURN jsonb_build_object(
    'success', true,
    'tenant_name', v_tenant_name,
    'duration_ms', EXTRACT(MILLISECONDS FROM NOW() - v_start),
    'deleted', v_counters
  );

EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.data_lifecycle_audit (
    tenant_name, operation_type, operation_status,
    error_details, triggered_by
  ) VALUES (
    v_tenant_name, 'hard_delete_tenant', 'failed', SQLERRM, 'pg_cron'
  );
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.hard_delete_tenant FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hard_delete_tenant TO service_role;

-- =====================================================================
-- 4. pg_cron: executar exclusões agendadas diariamente às 01:00 BRT
-- =====================================================================

SELECT cron.schedule(
  'process-tenant-deletions',
  '0 4 * * *',
  $$
  DO $$
  DECLARE
    v_item RECORD;
  BEGIN
    FOR v_item IN
      SELECT * FROM public.data_lifecycle_queue
      WHERE operation_type = 'delete_tenant'
        AND status = 'pending'
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
    LOOP
      UPDATE public.data_lifecycle_queue
      SET status = 'processing', started_at = NOW()
      WHERE id = v_item.id;

      BEGIN
        PERFORM public.hard_delete_tenant(v_item.target_id);
        UPDATE public.data_lifecycle_queue
        SET status = 'completed', completed_at = NOW()
        WHERE id = v_item.id;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.data_lifecycle_queue
        SET status = 'failed', error_message = SQLERRM, attempts = attempts + 1
        WHERE id = v_item.id;
      END;
    END LOOP;
  END;
  $$ LANGUAGE plpgsql;
  $$
) ON CONFLICT (jobname) DO UPDATE SET schedule = '0 4 * * *';

-- =====================================================================
-- 5. pg_cron: limpeza do histórico do pg_cron (todo domingo 00:00 BRT)
-- =====================================================================

SELECT cron.schedule(
  'cleanup-cron-history',
  '0 3 * * 0',
  $$
  DELETE FROM cron.job_run_details
  WHERE end_time < NOW() - INTERVAL '30 days';
  $$
) ON CONFLICT (jobname) DO UPDATE SET schedule = '0 3 * * 0';
