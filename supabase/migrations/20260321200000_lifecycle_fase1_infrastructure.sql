-- =====================================================================
-- LIFECYCLE FASE 1 — Infraestrutura de Ciclo de Vida de Dados
-- Extensions, tabelas de controle, gerenciamento de chaves
-- =====================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================================
-- 2. Colunas de lifecycle nas tabelas existentes
-- =====================================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT DEFAULT NULL;

ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cascade_deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cascade_deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at
  ON public.tenants(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_deletion_scheduled
  ON public.tenants(deletion_scheduled_for) WHERE deletion_scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_connections_deleted
  ON public.whatsapp_connections(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_instances_deleted
  ON public.whatsapp_instances(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================================================================
-- 3. Tabela: data_lifecycle_queue
-- Fila de operações de ciclo de vida
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.data_lifecycle_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sem FK para sobreviver após exclusão do tenant
  tenant_id UUID,

  operation_type TEXT NOT NULL,
  -- 'encrypt_file'         = criptografar arquivo no storage após 6 meses
  -- 'delete_device_files'  = excluir arquivos de dispositivo removido
  -- 'delete_tenant'        = exclusão completa de tenant após 30 dias
  -- 'delete_tenant_storage'= excluir storage do tenant já deletado

  target_table TEXT,
  target_id UUID,
  storage_path TEXT,
  connection_id UUID,

  status TEXT DEFAULT 'pending',
  -- 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'

  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempts INT DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlq_status_scheduled
  ON public.data_lifecycle_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_dlq_tenant_operation
  ON public.data_lifecycle_queue(tenant_id, operation_type);
CREATE INDEX IF NOT EXISTS idx_dlq_operation_status
  ON public.data_lifecycle_queue(operation_type, status);

ALTER TABLE public.data_lifecycle_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'data_lifecycle_queue' AND policyname = 'service_role_full'
  ) THEN
    CREATE POLICY "service_role_full" ON public.data_lifecycle_queue
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- =====================================================================
-- 4. Tabela: tenant_encryption_keys
-- Uma chave AES-256 por tenant (acesso apenas service_role)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.tenant_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key_material TEXT NOT NULL,  -- hex-encoded AES-256 key (32 bytes = 64 hex chars)
  algorithm TEXT DEFAULT 'aes256-gcm',
  key_created_at TIMESTAMPTZ DEFAULT NOW(),
  last_rotated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.tenant_encryption_keys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenant_encryption_keys' AND policyname = 'service_role_full'
  ) THEN
    CREATE POLICY "service_role_full" ON public.tenant_encryption_keys
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- =====================================================================
-- 5. Tabela: data_lifecycle_audit
-- Log imutável de todas as operações (conformidade LGPD)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.data_lifecycle_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT,

  operation_type TEXT NOT NULL,
  operation_status TEXT NOT NULL,  -- 'completed' | 'failed'

  records_affected BIGINT DEFAULT 0,
  storage_bytes_freed BIGINT DEFAULT 0,
  files_encrypted INT DEFAULT 0,
  files_deleted INT DEFAULT 0,

  triggered_by TEXT DEFAULT 'pg_cron',
  -- 'pg_cron' | 'nexus_admin' | 'webhook' | 'trigger_auto'

  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_duration_ms INT,
  error_details TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_dla_tenant_date
  ON public.data_lifecycle_audit(tenant_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dla_operation_date
  ON public.data_lifecycle_audit(operation_type, executed_at DESC);

ALTER TABLE public.data_lifecycle_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'data_lifecycle_audit' AND policyname = 'insert_service_role'
  ) THEN
    CREATE POLICY "insert_service_role" ON public.data_lifecycle_audit
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'data_lifecycle_audit' AND policyname = 'nexus_select'
  ) THEN
    -- Nexus admins podem visualizar o audit log
    CREATE POLICY "nexus_select" ON public.data_lifecycle_audit
      FOR SELECT USING (true);
  END IF;
END $$;

-- =====================================================================
-- 6. Função: generate_tenant_encryption_key
-- Cria chave AES-256 única por tenant
-- =====================================================================

CREATE OR REPLACE FUNCTION public.generate_tenant_encryption_key(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key TEXT;
  v_existing TEXT;
BEGIN
  -- Retornar chave existente se já houver
  SELECT key_material INTO v_existing
  FROM public.tenant_encryption_keys
  WHERE tenant_id = p_tenant_id AND is_active = true;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Gerar 256 bits (32 bytes) aleatórios
  v_key := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.tenant_encryption_keys (tenant_id, key_material)
  VALUES (p_tenant_id, v_key);

  RETURN v_key;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_tenant_encryption_key FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_tenant_encryption_key TO service_role;

-- =====================================================================
-- 7. Função: get_tenant_decrypted_key
-- Retorna chave do tenant — apenas service_role
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_tenant_decrypted_key(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT key_material INTO v_key
  FROM public.tenant_encryption_keys
  WHERE tenant_id = p_tenant_id AND is_active = true;

  IF v_key IS NULL THEN
    -- Gerar chave on-demand se não existir
    v_key := public.generate_tenant_encryption_key(p_tenant_id);
  END IF;

  RETURN jsonb_build_object('key_material', v_key);
END;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_decrypted_key FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_tenant_decrypted_key FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_decrypted_key TO service_role;
