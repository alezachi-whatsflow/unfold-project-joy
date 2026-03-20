-- =========================================================================
-- SCRIPT SUPABASE PARA FASE 5 (Licenças) e FASE 6 (Views de Analytics)
-- Arquitetura MultiTenant 3 Níveis + WhiteLabel (Whatsflow)
-- =========================================================================

-- 1. TABELAS ADICIONAIS FASE 5 (HISTÓRICO DE LICENÇAS E NOTIFICAÇÕES)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.license_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  changed_by_id uuid NOT NULL REFERENCES auth.users(id),
  changed_by_role text NOT NULL CHECK (changed_by_role IN ('god_admin', 'wl_admin', 'system')),
  previous_state jsonb,
  new_state jsonb NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('license_expiring', 'limit_reached', 'suspended', 'upgrade_requested', 'system_alert')),
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  action_url text,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.license_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =========================================================================

-- God Admin: Acesso total ao histórico
CREATE POLICY "God Admin gerencia historical de tudo"
  ON public.license_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = (SELECT account_id FROM public.profiles p WHERE p.id = auth.uid())
      AND a.account_type = 'god_admin'
    )
  );

-- WL Admin: Lê histórico apenas das contas filhas da sua WL
CREATE POLICY "WL Admin ve historico de seus clientes"
  ON public.license_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts pai
      JOIN public.accounts filha ON filha.whitelabel_id = pai.id
      WHERE pai.id = (SELECT account_id FROM public.profiles p WHERE p.id = auth.uid())
      AND pai.account_type = 'whitelabel'
      AND filha.id = license_history.account_id
    )
  );

-- Notificações: Cada tenant vê as suas próprias notificações
CREATE POLICY "Tenants veem proprias notificacoes"
  ON public.notifications
  FOR SELECT TO authenticated
  USING (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  );

-- God Admin vê e cria notificações globais
CREATE POLICY "God admin full access notificacoes"
  ON public.notifications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
      AND a.account_type = 'god_admin'
    )
  );

-- 3. VIEWS MATERIALIZADAS FASE 6 (ANALYTICS DE PERFORMANCE)
-- =========================================================================
-- OBS: Estas views assumem que existe uma tabela `conversations` e `licenses`. 
-- Ajuste os nomes de acordo com seu schema final.

-- DROP MATERIALIZED VIEW IF EXISTS daily_conversation_stats;
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_conversation_stats AS
  SELECT 
    account_id, 
    DATE(created_at) AS date,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status='resolved') AS resolved,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) AS avg_resolution_seconds
  FROM public.conversations
  GROUP BY account_id, DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_conv_stats ON daily_conversation_stats(account_id, date);

-- DROP MATERIALIZED VIEW IF EXISTS wl_client_summary;
CREATE MATERIALIZED VIEW IF NOT EXISTS wl_client_summary AS
  SELECT 
    a.whitelabel_id, 
    a.id AS client_account_id,
    COUNT(c.id) AS total_conversations,
    SUM(l.monthly_value) AS client_mrr
  FROM public.accounts a
  LEFT JOIN public.conversations c ON c.account_id = a.id
  LEFT JOIN public.licenses l ON l.account_id = a.id
  WHERE a.account_type = 'wl_client'
  GROUP BY a.whitelabel_id, a.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wl_client_summary ON wl_client_summary(whitelabel_id, client_account_id);


-- 4. FUNÇÕES SQL AUTOMATIZADAS (CRON JOBS NATIVOS DO SUPABASE)
-- =========================================================================

-- Função para atualizar as Materialized Views (Analytics Phase 6)
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_conversation_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY wl_client_summary;
END;
$$ LANGUAGE plpgsql;


-- Função de Varredura Diária de Licenças Vencendo (Phase 5)
CREATE OR REPLACE FUNCTION check_expiring_licenses_and_notify()
RETURNS void AS $$
DECLARE
  lic_record RECORD;
  dias_restantes INT;
BEGIN
  -- Percorre todas as licenças ativas que possuem valid_until
  FOR lic_record IN 
    SELECT l.account_id, l.valid_until, a.name as account_name 
    FROM public.licenses l
    JOIN public.accounts a ON a.id = l.account_id
    WHERE l.status = 'active' AND l.valid_until IS NOT NULL
  LOOP
    dias_restantes := DATE_PART('day', lic_record.valid_until - NOW());
    
    -- Dispara regras de alerta nos períodos exatos (30, 15, 7, 3, 1 dias)
    IF dias_restantes IN (30, 15, 7, 3, 1) THEN
      INSERT INTO public.notifications (account_id, type, title, message, action_url)
      VALUES (
        lic_record.account_id,
        'license_expiring',
        'Licença Vencendo em ' || dias_restantes || ' dias',
        'Sua licença da conta ' || lic_record.account_name || ' expira em ' || TO_CHAR(lic_record.valid_until, 'DD/MM/YYYY') || '. Acesse /assinatura para renovar.',
        '/app/dashboard/assinatura' -- Ajustar URL caso seja whitelabel
      );
    ELSIF dias_restantes < 0 THEN
       -- Suspende licenças negativas se o status ainda for active (Opcional agressivo)
       -- UPDATE public.licenses SET status = 'suspended' WHERE id = lic_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- CONFIGURAÇÃO PG_CRON (Requer habilitar a extensão pg_cron no Supabase)
-- =========================================================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Atualizar Analytics de hora em hora
-- SELECT cron.schedule('refresh-views-hourly', '0 * * * *', 'SELECT refresh_analytics_views()');

-- Enviar alertas de licença 00:00 todo dia
-- SELECT cron.schedule('notify-expiring-licenses', '0 0 * * *', 'SELECT check_expiring_licenses_and_notify()');
