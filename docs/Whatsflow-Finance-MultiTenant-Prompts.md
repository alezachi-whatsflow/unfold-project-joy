# Whatsflow Finance — Arquitetura Multi-Tenant
## Prompts Faseados para o Lovable

> **Instruções:** Copie cada fase individualmente no Lovable. Teste e valide antes de avançar para a próxima fase.

---

## Índice

| # | Fase | Conteúdo |
|---|------|----------|
| 01 | [Fase 1](#fase-1) | Fundação Multi-Tenant + Supabase (Banco + RLS) |
| 02 | [Fase 2](#fase-2) | Auth + Portal SuperAdmin + Onboarding |
| 03 | [Fase 3](#fase-3) | CRM, Leads, Conexões WhatsApp por Tenant |
| 04 | [Fase 4](#fase-4) | Módulo Conversas |
| 05 | [Fase 5](#fase-5) | Billing, Licenças e Gestão de Planos |
| 06 | [Fase 6](#fase-6) | Dashboard Analytics & Relatórios |

---

## Contexto Geral da Arquitetura

**Stack escolhida:** Pool Model (tenant_id) + Supabase Row Level Security  
**Referências:** Salesforce, HubSpot, Intercom, Twilio, AWS SaaS Factory  
**Isolamento:** Cada tenant vê apenas seus próprios dados — garantido em nível de banco  
**SuperAdmin:** Acessa todos os tenants via `service_role key` (nunca exposta no frontend)  
**LGPD:** Toda ação SuperAdmin em conta alheia gera registro obrigatório em `audit_logs`

---

## Modelo de Licenciamento Whatsflow

> O modelo de licenças segue exatamente a estrutura de produtos já existente na Whatsflow.

### Planos Base (Recorrente Mensal)

| Plano | Preço | Inclui |
|-------|-------|--------|
| **Solo Pro** | R$ 259/mês | 1 Dispositivo Web + 1 Meta (bônus) + 1 Atendente |
| **Profissional** | R$ 359/mês | 1 Dispositivo Web + 1 Meta (bônus) + 3 Atendentes |

**Regra especial:** ao ter 1+ Dispositivo Web, o cliente ganha 1 Dispositivo Meta gratuitamente.

---

### Add-ons (Adicionais Pagos — Recorrente Mensal)

#### Dispositivos API Web WhatsApp

| Tier | Quantidade | Preço/unidade |
|------|------------|---------------|
| Tier 1 | 1–5 dispositivos | R$ 150,00/un |
| Tier 2 | 6–20 dispositivos | R$ 125,00/un |
| Tier 3 | 21–50 dispositivos | R$ 100,00/un |

#### Dispositivos API Business Manager Meta

| Tier | Quantidade | Preço/unidade |
|------|------------|---------------|
| Tier 1 | 1–5 dispositivos | R$ 100,00/un |
| Tier 2 | 6–20 dispositivos | R$ 80,00/un |
| Tier 3 | 21–50 dispositivos | R$ 60,00/un |

#### Atendentes Extras

| Tier | Quantidade | Preço/unidade |
|------|------------|---------------|
| Tier 1 | 1–5 atendentes | R$ 80,00/un |
| Tier 2 | 6–10 atendentes | R$ 75,00/un |
| Tier 3 | 11–20 atendentes | R$ 70,00/un |
| Tier 4 | 21–50 atendentes | R$ 60,00/un |

#### Módulo I.A.

- **Preço fixo:** R$ 350,00/mês
- **Inclui:** Até 5 Agentes de I.A.

---

### Facilite Whatsflow (Suporte Dedicado — Recorrente Mensal)

Profissional dedicado para gerenciar a conta Whatsflow do cliente.

| Plano | Horas Mensais | Horas Semanais | Preço |
|-------|---------------|----------------|-------|
| **Facilite Básico** | 8h/mês | 2h/semana | R$ 250/mês |
| **Facilite Intermediário** | 20h/mês | 5h/semana | R$ 700/mês |
| **Facilite Avançado** | 40h/mês | 10h/semana | R$ 1.500/mês |

---

### Serviço Único

| Serviço | Preço | Prazo |
|---------|-------|-------|
| **Implantação Starter** | R$ 2.000 (único) | Até 15 dias úteis |

---

## Hierarquia de Acesso (RBAC)

| Role | Escopo | Permissões |
|------|--------|------------|
| `superadmin` | Todos os tenants | CRUD completo, impersonation, billing, audit logs |
| `whatsflow_support` | Tenant específico (leitura) | Visualizar dados, suporte técnico |
| `admin` | Seu tenant | Usuários, conexões WA, CRM, pipeline |
| `manager` | Seu tenant — áreas definidas | Relatórios, leads, conversas |
| `agent` | Conversas atribuídas | Atender, registrar contatos |
| `viewer` | Leitura apenas | Dashboards, sem edição |

---

---

# FASE 1

> **Objetivo:** Criar a estrutura de banco de dados multi-tenant no Supabase com Row Level Security. Nenhuma tela nesta fase — apenas a fundação do backend.  
> **Teste:** Criar 2 tenants e verificar que cada um só enxerga seus próprios dados.

---

```
Vou construir o Whatsflow Finance, um SaaS B2B multi-tenant onde cada cliente
(tenant) tem seus próprios dados completamente isolados. A Whatsflow (SuperAdmin)
gerencia todas as contas com acesso total. Use Supabase como backend.

FASE 1: Configure a fundação multi-tenant no Supabase.

═══════════════════════════════════════
1. TABELAS CORE (todas com tenant_id UUID NOT NULL)
═══════════════════════════════════════

tenants:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name TEXT NOT NULL
  slug TEXT UNIQUE NOT NULL              -- ex: empresa-alpha
  plan TEXT DEFAULT 'solo_pro'          -- solo_pro | profissional
  status TEXT DEFAULT 'active'          -- active | suspended | cancelled
  license_key TEXT UNIQUE
  valid_until TIMESTAMPTZ
  created_at TIMESTAMPTZ DEFAULT NOW()
  metadata JSONB DEFAULT '{}'

licenses:
  id UUID PRIMARY KEY
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
  plan TEXT NOT NULL                    -- solo_pro | profissional
  -- Plano base incluso
  base_devices_web INT DEFAULT 1
  base_devices_meta INT DEFAULT 1       -- bônus automático ao ter 1 Web
  base_attendants INT DEFAULT 1         -- solo_pro=1 | profissional=3
  -- Add-ons contratados
  extra_devices_web INT DEFAULT 0
  extra_devices_meta INT DEFAULT 0
  extra_attendants INT DEFAULT 0
  has_ai_module BOOLEAN DEFAULT false   -- Módulo I.A. R$350/mês
  ai_agents_limit INT DEFAULT 0         -- máximo 5 quando has_ai_module=true
  -- Facilite Whatsflow
  facilite_plan TEXT DEFAULT 'none'     -- none | basico | intermediario | avancado
  facilite_monthly_hours INT DEFAULT 0
  -- Serviço único
  has_implantacao_starter BOOLEAN DEFAULT false
  -- Totais calculados (triggers)
  total_devices_web INT GENERATED ALWAYS AS (base_devices_web + extra_devices_web) STORED
  total_devices_meta INT GENERATED ALWAYS AS (base_devices_meta + extra_devices_meta) STORED
  total_attendants INT GENERATED ALWAYS AS (base_attendants + extra_attendants) STORED
  -- Billing
  monthly_value DECIMAL(10,2)           -- MRR calculado desta licença
  billing_cycle TEXT DEFAULT 'monthly'  -- monthly | annual
  valid_until TIMESTAMPTZ
  created_at TIMESTAMPTZ DEFAULT NOW()

profiles:
  id UUID PRIMARY KEY REFERENCES auth.users(id)
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
  role TEXT NOT NULL                    -- superadmin|admin|manager|agent|viewer
  full_name TEXT
  avatar_url TEXT
  is_active BOOLEAN DEFAULT true
  created_at TIMESTAMPTZ DEFAULT NOW()

audit_logs:
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  actor_id UUID
  actor_role TEXT
  tenant_id UUID                        -- NULL quando ação global do SuperAdmin
  action TEXT NOT NULL
  resource TEXT
  resource_id UUID
  metadata JSONB
  ip_address TEXT
  created_at TIMESTAMPTZ DEFAULT NOW()

═══════════════════════════════════════
2. ROW LEVEL SECURITY
═══════════════════════════════════════

-- Ativar RLS em TODAS as tabelas exceto tenants e audit_logs
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Policy padrão: usuário vê apenas dados do seu tenant
CREATE POLICY tenant_isolation ON profiles
  USING (tenant_id = (auth.jwt()->>'tenant_id')::UUID);

CREATE POLICY tenant_isolation ON licenses
  USING (tenant_id = (auth.jwt()->>'tenant_id')::UUID);

-- SuperAdmin (role=superadmin no JWT) acessa via service_role key → bypassa RLS
-- NUNCA expor service_role key no frontend — apenas em Edge Functions

-- Custom claim no JWT via Supabase Auth hook:
-- { "tenant_id": "uuid", "role": "admin" }

═══════════════════════════════════════
3. INDEXES PARA PERFORMANCE
═══════════════════════════════════════

CREATE INDEX ON profiles(tenant_id);
CREATE INDEX ON licenses(tenant_id);
CREATE INDEX ON audit_logs(tenant_id, created_at DESC);
-- Todos os índices compostos: (tenant_id, id)

═══════════════════════════════════════
4. FUNCTIONS
═══════════════════════════════════════

-- Retorna tenant_id do JWT atual
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
  SELECT (auth.jwt()->>'tenant_id')::UUID;
$$ LANGUAGE sql STABLE;

-- Verifica se o usuário atual é SuperAdmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT (auth.jwt()->>'role') = 'superadmin';
$$ LANGUAGE sql STABLE;

-- Registra ação no audit_log
CREATE OR REPLACE FUNCTION log_audit(
  p_action TEXT,
  p_resource TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
  INSERT INTO audit_logs (actor_id, actor_role, tenant_id, action, resource, resource_id, metadata)
  VALUES (
    auth.uid(),
    auth.jwt()->>'role',
    (auth.jwt()->>'tenant_id')::UUID,
    p_action, p_resource, p_resource_id, p_metadata
  );
$$ LANGUAGE sql;

═══════════════════════════════════════
5. SEED DE TESTE
═══════════════════════════════════════

-- Tenant A: Empresa Alpha — Plano Profissional
-- Tenant B: Empresa Beta — Plano Solo Pro
-- Verificar: query como Tenant A NÃO retorna dados do Tenant B
```

---

---

# FASE 2

> **Objetivo:** Sistema de autenticação com detecção de role + Portal SuperAdmin completo da Whatsflow.  
> **Teste:** Login superadmin vê todos os tenants. Login como tenant vê apenas o próprio.

---

```
Continuando o Whatsflow Finance multi-tenant. A fundação Supabase já existe.
Agora implemente autenticação e o portal SuperAdmin da Whatsflow.

TEMA VISUAL: Dark theme.
  background: #0F172A
  surface: #1E293B
  primary: #25D366 (verde WhatsApp)
  accent: #3B82F6
  font: Inter

═══════════════════════════════════════
FASE 2A — AUTENTICAÇÃO
═══════════════════════════════════════

Tela de login única com email/senha.

Após login, verificar role no JWT:
  role=superadmin  →  redirecionar para /superadmin
  role=admin/manager/agent/viewer  →  redirecionar para /app/{tenant_slug}

Proteção de rotas:
  /superadmin  →  exige role=superadmin (redireciona se não tiver)
  /app/{slug}  →  exige tenant_id compatível com o slug

Token refresh automático + logout com limpeza total de sessão.

═══════════════════════════════════════
FASE 2B — PORTAL SUPERADMIN (/superadmin)
═══════════════════════════════════════

Header:
  Logo Whatsflow + badge "SUPERADMIN" + nome do usuário logado

Sidebar (colapsável):
  - Dashboard Global
  - Tenants
  - Licenças
  - Audit Log
  - Feature Flags
  - Configurações

─────────────────────────────────────
DASHBOARD GLOBAL
─────────────────────────────────────
Cards de métricas:
  - Total Tenants Ativos
  - MRR Total (soma de licenses.monthly_value de todos os tenants ativos)
  - Tenants vencendo em 30 dias
  - Tenants com Módulo I.A. ativo
  - Novos tenants nos últimos 30 dias

─────────────────────────────────────
PÁGINA TENANTS
─────────────────────────────────────
Tabela com colunas:
  Nome | Slug | Plano | Status | Validade | Facilite | Ações

Filtros: status, plano, Facilite, vencimento
Busca: por nome ou slug

Botão [+ Novo Tenant] → Modal de criação:
  Dados da empresa: nome, slug (auto-gerado, editável)
  Plano base: Solo Pro (R$259) ou Profissional (R$359)
  Add-ons:
    Extra Dispositivos Web (com seletor de tier automático)
    Extra Dispositivos Meta (com seletor de tier automático)
    Extra Atendentes (com seletor de tier automático)
    Módulo I.A. (checkbox — R$350/mês fixo, até 5 agentes)
  Facilite Whatsflow:
    Nenhum | Básico (R$250, 8h) | Intermediário (R$700, 20h) | Avançado (R$1.500, 40h)
  Implantação Starter: checkbox (R$2.000 único)
  Validade da licença: campo de data
  Dados do admin: nome completo + email
  Preview do MRR calculado em tempo real antes de salvar

Ao criar: gerar license_key única, criar tenant + license, criar profile admin, registrar em audit_logs.

Ações por tenant (menu de contexto):
  - Visualizar detalhes
  - Editar licença
  - Suspender / Reativar
  - Acessar como Admin (Impersonation)

─────────────────────────────────────
IMPERSONATION
─────────────────────────────────────
Botão "Acessar como Admin" no portal SuperAdmin:
  Gera token temporário de 1 hora para o tenant selecionado
  Redireciona para /app/{slug}
  Exibe banner fixo no topo: "⚠️ MODO SUPORTE ATIVO — Você está acessando como Admin do Tenant X"
  Botão no banner: [Encerrar Sessão de Suporte]
  Toda ação durante impersonation registrada em audit_logs com actor_role=superadmin_impersonating

─────────────────────────────────────
PÁGINA AUDIT LOG
─────────────────────────────────────
Tabela cronológica de todas as ações SuperAdmin em tenants.
Colunas: Data/Hora | Ator | Role | Tenant | Ação | Recurso | IP
Filtros: tenant, tipo de ação, período
Export: CSV
```

---

---

# FASE 3

> **Objetivo:** Módulos CRM, Leads/Pipeline e Conexões WhatsApp isolados por tenant.  
> **Teste:** Contato criado no Tenant A não aparece no Tenant B. Limite de dispositivos respeitado.

---

```
Continuando Whatsflow Finance multi-tenant. Auth e SuperAdmin já funcionam.
Agora construa os módulos CRM, Leads e WhatsApp para o portal do TENANT.

═══════════════════════════════════════
PORTAL TENANT (/app/{slug}) — LAYOUT
═══════════════════════════════════════

Sidebar colapsável, dark theme, logo do tenant no topo.
Menu:
  - Dashboard
  - Conversas (badge com não-lidas)
  - CRM / Contatos
  - Pipeline / Leads
  - WhatsApp Connections
  - Relatórios
  - Assinatura / Licença
  - Configurações
  - Perfil / Logout

═══════════════════════════════════════
MÓDULO CRM — tabela crm_contacts
═══════════════════════════════════════

Campos:
  tenant_id, name, phone (formato BR), email, company,
  tags TEXT[], stage (lead/prospect/customer/churned),
  owner_id (FK profiles), source (whatsapp/manual/import),
  notes TEXT, created_at

Tela CRM:
  Lista com busca, filtro por stage/tag/owner, ordenação por criação/nome
  Perfil do contato: histórico de conversas, leads vinculados, notas, tags
  Importação CSV (campo obrigatório: phone)
  Tags coloridas personalizáveis por tenant

RBAC CRM:
  viewer: somente leitura
  agent: cria e edita contatos próprios
  manager: acessa todos os contatos do tenant
  admin: tudo + gerencia tags, importação

═══════════════════════════════════════
MÓDULO LEADS / PIPELINE — tabela leads
═══════════════════════════════════════

Campos:
  tenant_id, contact_id, pipeline_id, title, stage,
  value DECIMAL, owner_id, priority (low/medium/high/urgent),
  expected_close_date, lost_reason, created_at, updated_at

Tela Pipeline — Kanban:
  Colunas personalizáveis com drag & drop de cards
  Card: nome do contato, valor formatado (R$), avatar do owner, dias no stage
  Múltiplos pipelines por tenant
  Filtros: owner, prioridade, valor, data
  Totalizador por coluna: quantidade de leads + soma de valores em R$

═══════════════════════════════════════
MÓDULO WHATSAPP CONNECTIONS — tabela whatsapp_connections
═══════════════════════════════════════

Campos:
  tenant_id, display_name, phone_number, type (web/meta),
  waba_id, phone_number_id, access_token (encrypted via pgcrypto),
  webhook_verify_token, status (connected/disconnected/pending),
  meta_business_id, quality_rating, created_at

Tela WhatsApp Connections:
  Lista de conexões com status visual (verde=conectado, vermelho=erro, amarelo=pendente)
  Exibir: tipo (Web ou Meta), número, nome da conexão, qualidade
  Separar visualmente conexões Web e Meta com ícones distintos

Botão [+ Adicionar Conexão] — Wizard 3 passos:
  Passo 1: Tipo (Web API ou Meta Business Manager), nome da conexão, número
  Passo 2: Instruções para obter token da Meta Business Suite
  Passo 3: URL de webhook gerada automaticamente para configurar na Meta

VALIDAÇÃO DE LIMITES (contra licenses):
  Dispositivos Web: (contagem atual) < (base_devices_web + extra_devices_web)
  Dispositivos Meta: (contagem atual) < (base_devices_meta + extra_devices_meta)
  Atendentes: (users com role=agent) < total_attendants
  Módulo I.A.: bloquear acesso se has_ai_module=false
  Se limite atingido → exibir modal: "Limite do seu plano atingido. Fale com a Whatsflow para expandir."
    Botão no modal: [Falar com Whatsflow] (abre WhatsApp da Whatsflow)
```

---

---

# FASE 4

> **Objetivo:** Centro de mensagens WhatsApp isolado por tenant com Realtime.  
> **Teste:** Webhook chegando para Tenant A aparece apenas no Tenant A em tempo real.

---

```
Continuando Whatsflow Finance. CRM, Leads e WA Connections funcionam.
Agora construa o módulo central de CONVERSAS.

═══════════════════════════════════════
TABELAS ADICIONAIS
═══════════════════════════════════════

conversations:
  tenant_id, contact_id, wa_connection_id (qual número/conexão recebeu),
  owner_id (agente responsável), status (open/pending/resolved/archived),
  channel (whatsapp/manual), unread_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ, tags TEXT[], priority,
  sla_deadline TIMESTAMPTZ, created_at

messages:
  tenant_id, conversation_id, direction (inbound/outbound),
  content TEXT, content_type (text/image/audio/video/document/template),
  media_url TEXT, status (sent/delivered/read/failed),
  sender_id UUID (agente ou NULL se inbound),
  wa_message_id TEXT UNIQUE, timestamp TIMESTAMPTZ

═══════════════════════════════════════
LAYOUT CONVERSAS — 3 colunas (estilo WhatsApp Web)
═══════════════════════════════════════

Coluna 1 — Lista de Conversas (~280px):
  Filtros: Todas | Abertas | Pendentes | Minhas
  Busca por nome ou telefone
  Card por conversa: avatar, nome do contato, preview última mensagem,
    hora, badge de não-lidas, ícone da conexão WA usada
  Ordenação: mais recentes primeiro

Coluna 2 — Janela de Chat (flex):
  Header: nome do contato, telefone, status da conversa,
    qual conexão WA, botões: [Transferir] [Resolver] [Arquivar]
  Mensagens: bolhas — inbound à esquerda (cinza), outbound à direita (verde)
  Status da mensagem: enviado ✓ / entregue ✓✓ / lido ✓✓ (azul) / falhou ✗
  Notas internas: balões amarelos visíveis apenas para agentes (não enviadas ao contato)
  Input: texto livre, emoji, anexos, quick replies, templates aprovados na Meta
  Indicador de digitação em tempo real

Coluna 3 — Detalhes do Contato (~300px):
  Foto, nome, telefone, empresa, tags
  Leads vinculados ao contato (cards clicáveis)
  Histórico de atendimentos anteriores
  Botão: [Adicionar ao CRM] se contato ainda não cadastrado
  Botão: [Criar Lead] vinculado a este contato

═══════════════════════════════════════
FUNCIONALIDADES
═══════════════════════════════════════

Transferência entre agentes:
  Modal de transferência com seleção de agente + nota opcional
  Registra em audit_logs da conversa

Templates Meta:
  Listar templates aprovados da conta Meta do tenant (via API)
  Botão de seleção com preview antes de enviar

SLA:
  Quando sla_deadline definido, exibir contador regressivo no card da conversa
  Alerta visual (vermelho pulsante) quando menos de 1h restante

Realtime (Supabase Realtime):
  Atualizações de mensagens e conversas sem refresh de página
  Badge de não-lidas no menu lateral atualizado em tempo real

Webhook Handler:
  Endpoint: POST /api/webhooks/whatsapp/{tenant_id}/{connection_id}
  Ao receber evento Meta:
    1. Validar assinatura HMAC
    2. Verificar tenant_id e connection_id no Supabase (service_role)
    3. Buscar ou criar conversa para o remetente
    4. Inserir message com direction=inbound
    5. Incrementar unread_count na conversa
    6. Disparar notificação Supabase Realtime para o tenant

═══════════════════════════════════════
RBAC CONVERSAS
═══════════════════════════════════════

  viewer: somente visualiza
  agent: atende conversas próprias, pode resolver as suas
  manager: visualiza todas, transfere, configura SLA
  admin: tudo + quick replies, templates, configuração de webhooks
```

---

---

# FASE 5

> **Objetivo:** Gestão de licenças baseada nos produtos reais da Whatsflow, administrada exclusivamente pelo SuperAdmin.  
> **Teste:** Licença vencida → banner de aviso. Suspensão pelo SuperAdmin → acesso bloqueado para o tenant.

---

```
Continuando Whatsflow Finance. Conversas funcionando.
Agora implemente o módulo de Billing e Licenças.

CONTEXTO IMPORTANTE:
  A Whatsflow (SuperAdmin) é a única que cria e gerencia licenças.
  Os tenants NÃO fazem self-service de upgrade.
  Solicitações de expansão chegam via WhatsApp ou email para a Whatsflow.
  A cobrança financeira ocorre externamente (transferência, boleto, Stripe).
  Este módulo controla o STATUS e os LIMITES — não processa pagamentos.

O modelo de licenciamento segue os produtos oficiais da Whatsflow:
  - Planos Base: Solo Pro (R$259) e Profissional (R$359)
  - Add-ons com tiers de preço por volume (Web, Meta, Atendentes)
  - Módulo I.A.: R$350/mês fixo (até 5 agentes)
  - Facilite: Básico R$250 | Intermediário R$700 | Avançado R$1.500
  - Implantação Starter: R$2.000 (único)

═══════════════════════════════════════
TABELAS ADICIONAIS
═══════════════════════════════════════

license_history:
  tenant_id, changed_by (superadmin_id), previous_plan, new_plan,
  changes JSONB (o que mudou: add-ons, facilite, validade), reason TEXT, created_at

notifications:
  tenant_id, type (license_expiring/limit_reached/suspended/upgrade_requested),
  title TEXT, message TEXT, read_at TIMESTAMPTZ, action_url TEXT, created_at

═══════════════════════════════════════
NO PORTAL SUPERADMIN — PÁGINA LICENÇAS
═══════════════════════════════════════

Dashboard de Licenças:
  Cards: Ativas | Vencendo em 7 dias | Vencendo em 30 dias | Suspensas | Canceladas
  Gráfico: distribuição por plano (Solo Pro vs Profissional) — pie chart
  Gráfico: MRR por mês dos últimos 12 meses — bar chart
  Tabela: top tenants por MRR (nome, plano, add-ons ativos, MRR, validade)

Ações em licença individual:
  Renovar: estender valid_until por N meses + registrar em license_history
  Editar plano base: mudar entre Solo Pro e Profissional
  Ajustar add-ons:
    Extra Dispositivos Web (campo numérico + cálculo automático por tier)
    Extra Dispositivos Meta (campo numérico + cálculo automático por tier)
    Extra Atendentes (campo numérico + cálculo automático por tier)
    Módulo I.A.: toggle on/off
  Ajustar Facilite: none | Básico | Intermediário | Avançado
  Implantação Starter: registrar como cobrada (one-time)
  Preview do novo MRR calculado em tempo real antes de salvar
  Suspender: status=suspended, bloqueia acesso mas mantém dados
  Reativar: status=active
  Cancelar: inicia período de graça de 90 dias → status=cancelled

Cálculo de MRR por tenant (lógica):
  base = Solo Pro R$259 ou Profissional R$359
  web_extra = qty × tier_price (Tier1=150, Tier2=125, Tier3=100)
  meta_extra = qty × tier_price (Tier1=100, Tier2=80, Tier3=60)
  attendants_extra = qty × tier_price (Tier1=80, Tier2=75, Tier3=70, Tier4=60)
  ai = R$350 se has_ai_module=true
  facilite = 0|250|700|1500 conforme plano
  MRR = base + web_extra + meta_extra + attendants_extra + ai + facilite

═══════════════════════════════════════
NO PORTAL TENANT — PÁGINA ASSINATURA
═══════════════════════════════════════

Exibir (somente leitura para o tenant):
  Plano atual: Solo Pro ou Profissional
  Validade: data de vencimento com countdown
  Uso atual vs limites:
    Usuários: X de Y atendentes
    Dispositivos Web: X de Y
    Dispositivos Meta: X de Y
    Módulo I.A.: ativo (X agentes) ou inativo
    Facilite: plano ativo (X horas/mês)
  Features incluídas: checklist visual

Alertas:
  Banner amarelo quando faltam 30 dias para vencer
  Banner vermelho quando faltam 7 dias para vencer
  Banner vermelho crítico quando status=suspended
  Alerta de limite: ao atingir 80% de qualquer recurso

Botão principal: [Falar com Whatsflow para Expandir]
  Abre WhatsApp da Whatsflow com mensagem pré-formatada:
  "Olá! Sou [nome] do [tenant_name]. Preciso expandir minha licença: [recurso que atingiu limite]."

═══════════════════════════════════════
GUARDS DE LICENÇA (middleware global)
═══════════════════════════════════════

Validar em toda ação crítica antes de executar:
  Criar usuário agent: profiles_count < total_attendants
  Criar conexão WA Web: wa_web_count < total_devices_web
  Criar conexão WA Meta: wa_meta_count < total_devices_meta
  Acessar módulo I.A.: has_ai_module=true
  Licença vencida (valid_until < NOW()): redirecionar para /app/{slug}/assinatura
  Status=suspended: exibir página de suspensão com contato da Whatsflow

═══════════════════════════════════════
SISTEMA DE NOTIFICAÇÕES AUTOMÁTICAS
═══════════════════════════════════════

Supabase Edge Function (cron — todo dia 00:00 BRT):
  Verificar licenças vencendo em 30, 15, 7, 3, 1 dia
  Criar registro em notifications para o tenant
  Enviar email de aviso via Resend (template com dados do tenant)

Sino de notificações no header do portal tenant:
  Badge com contador de não-lidas
  Dropdown com lista de notificações, mais recentes primeiro
  Marcar como lida ao clicar
```

---

---

# FASE 6

> **Objetivo:** Analytics e relatórios por tenant + visão global aprimorada para o SuperAdmin.  
> **Teste:** Dashboard com 100+ conversas carrega em menos de 2 segundos (views materializadas).

---

```
Última fase do Whatsflow Finance. Todos os módulos anteriores funcionam.
Agora implemente Analytics e Relatórios.

═══════════════════════════════════════
DASHBOARD TENANT — página inicial /app/{slug}
═══════════════════════════════════════

Row 1 — KPIs (4 cards):
  Conversas Abertas agora
  Tempo Médio de Resposta (últimas 24h)
  Taxa de Resolução (% resolvidas / total, últimos 7 dias)
  Valor Total em Pipeline (soma de leads.value com status ativo)

Row 2 — Gráficos principais:
  Volume de mensagens por dia — últimos 30 dias (area chart)
  Conversas por agente — últimas 2 semanas (bar chart horizontal)
  Distribuição de leads por stage — funil (funnel chart)

Row 3 — Tabelas analíticas:
  Top 5 contatos mais ativos (últimos 30 dias)
  Leads perdidos no mês (com coluna de motivo da perda)
  SLA em risco: conversas vencendo nas próximas 2h

Row 4 — Feed de atividade recente:
  Últimas 10 ações da equipe (conversa resolvida, lead movido, contato criado, etc.)
  Com avatar do agente e timestamp relativo

Filtros globais do dashboard:
  Período: hoje | 7d | 30d | 90d | personalizado
  Agente: todos ou individual
  Conexão WA: todas ou específica

═══════════════════════════════════════
PÁGINA RELATÓRIOS
═══════════════════════════════════════

Relatório de Atendimento:
  Total de conversas: abertas, resolvidas, arquivadas
  Tempo médio de resposta e tempo médio de resolução
  Performance por agente: tabela comparativa com ranking
  Heatmap de volume: dia da semana × hora do dia

Relatório de Pipeline:
  Leads criados, ganhos e perdidos por período
  Taxa de conversão por stage (funil percentual)
  Valor total ganho e perdido em R$
  Motivos de perda mais frequentes (top 5)

Relatório de Contatos CRM:
  Novos contatos por período e por source (WhatsApp/manual/import)
  Distribuição por tag e por stage do CRM

Export CSV disponível em todos os relatórios.

═══════════════════════════════════════
SUPERADMIN — DASHBOARD GLOBAL (atualizar)
═══════════════════════════════════════

Adicionar ao dashboard SuperAdmin existente:

Gráfico MRR — últimos 12 meses (line chart):
  Linha total + linhas empilhadas por componente:
  Base (Solo Pro + Profissional) | Add-ons | Facilite | I.A.

Top 10 tenants por MRR (tabela):
  Nome | Plano | MRR | Add-ons ativos | Vencimento | Status

Mapa de saúde dos tenants (tabela de monitoramento):
  Colunas: Nome | Conversas abertas | WA Connections ativas | Última atividade | Alertas
  Alertas: webhook com erro, conexão WA desconectada, licença vencendo

═══════════════════════════════════════
VIEWS MATERIALIZADAS — PERFORMANCE
═══════════════════════════════════════

Criar no Supabase para métricas que exigem agregação pesada:

CREATE MATERIALIZED VIEW daily_conversation_stats AS
  SELECT tenant_id, DATE(created_at) as date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status='resolved') as resolved,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_resolution_seconds
  FROM conversations
  GROUP BY tenant_id, DATE(created_at);

CREATE UNIQUE INDEX ON daily_conversation_stats(tenant_id, date);

CREATE MATERIALIZED VIEW agent_performance_stats AS
  SELECT tenant_id, owner_id,
    COUNT(*) as conversations_handled,
    AVG(unread_count) as avg_response_quality
  FROM conversations
  WHERE status='resolved'
  GROUP BY tenant_id, owner_id;

CREATE MATERIALIZED VIEW pipeline_summary AS
  SELECT tenant_id, stage,
    COUNT(*) as leads_count,
    SUM(value) as total_value
  FROM leads
  GROUP BY tenant_id, stage;

-- Atualizar automaticamente a cada 1 hora via Edge Function scheduled:
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_conversation_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY pipeline_summary;
```

---

---

## Checklist de Testes por Fase

| Fase | Teste | Critério de Sucesso |
|------|-------|---------------------|
| Fase 1 | Criar 2 tenants, inserir dados em ambos, query como Tenant A | Tenant A NÃO vê dados do Tenant B |
| Fase 1 | Acesso via service_role key | Retorna dados de todos os tenants |
| Fase 2 | Login superadmin → acessar /superadmin | Dashboard global carrega com lista de tenants |
| Fase 2 | Login tenant → tentar acessar /superadmin | Redirecionado para /app/{slug} |
| Fase 2 | Criar novo tenant com add-ons pelo SuperAdmin | MRR calculado corretamente no preview |
| Fase 3 | Criar contato CRM como agente do Tenant A | Contato visível apenas no Tenant A |
| Fase 3 | Adicionar conexão WA além do limite contratado | Bloqueado com modal de upgrade |
| Fase 4 | Simular webhook Meta chegando para Tenant A | Mensagem aparece apenas no Tenant A em tempo real |
| Fase 5 | SuperAdmin ajustar add-ons (ex: +5 Web Tier 2) | MRR recalculado corretamente (5 × R$125 = R$625) |
| Fase 5 | Licença vencer (simular data passada) | Banner de aviso + redirect para /assinatura |
| Fase 5 | SuperAdmin suspender tenant | Tenant recebe página de suspensão, sem acesso aos módulos |
| Fase 6 | Dashboard tenant com 100+ conversas | Carrega em menos de 2 segundos |
| Fase 6 | MRR global SuperAdmin bate com soma dos tenants | Valor idêntico nos dois contextos |

---

## Regras de Segurança — Nunca Violar

1. `service_role key` NUNCA vai ao frontend — apenas Edge Functions no servidor
2. Sempre incluir `tenant_id` em todas as queries, mesmo com RLS ativo (dupla proteção)
3. Toda ação SuperAdmin em tenant alheio registrada em `audit_logs` (LGPD)
4. `access_token` das conexões WhatsApp criptografado em repouso (`pgcrypto`)
5. Impersonation: sempre exibir banner visível durante toda a sessão de suporte
6. Limites de licença validados no backend (Edge Function) — nunca apenas no frontend
7. Isolamento de dados testado em cada nova fase antes de avançar

---

*Whatsflow Finance — Arquitetura Multi-Tenant | whatsflow.com.br*
