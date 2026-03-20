# Whatsflow Finance — Arquitetura Multi-Tenant 3 Níveis + WhiteLabel
## Prompts Faseados para o Antigravity

> **Plataforma:** Antigravity (substituiu o Lovable)  
> **Instruções:** Copie cada fase individualmente. Teste e valide antes de avançar.  
> **Ambiente:** Há dois servidores — Produção e Desenvolvimento. Cada fase deve funcionar em ambos.

---

## Visão Geral da Hierarquia

```
┌─────────────────────────────────────────────────────────────────┐
│  NÍVEL 0 — WHATSFLOW GOD ADMIN                                  │
│  Portal de gestão total. Controla tudo em todos os níveis.      │
│  Vê: WhiteLabels + Clientes Diretos + Clientes de WhiteLabels   │
└────────────────────┬────────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
┌─────────▼──────────┐  ┌───────▼────────────┐
│  WHITELABEL        │  │  CLIENTE DIRETO     │
│  (ex: SendHit)     │  │  WHATSFLOW          │
│  Controla apenas   │  │  (usa branding      │
│  seus clientes.    │  │  Whatsflow)         │
│  Branding próprio. │  └────────────────────┘
└─────────┬──────────┘
          │  herda branding da WL
┌─────────▼──────────┐
│  CLIENTE DA WL     │
│  (ex: RadAdvogados)│
│  Usa branding da   │
│  SendHit           │
└────────────────────┘

AMBIENTES:
  [PRODUÇÃO]     — servidor principal, dados reais
  [DESENVOLVIMENTO] — servidor de testes (Whatsflow Edtech)
                     correções/atualizações testadas aqui primeiro
```

---

## Hierarquia de Roles (RBAC Completo)

| Role | Nível | Escopo | O que controla |
|------|-------|--------|----------------|
| `god_admin` | 0 — Whatsflow | Global | Tudo: WLs, clientes diretos, clientes de WLs, ambientes, audit |
| `god_support` | 0 — Whatsflow | Leitura global | Visualização e suporte técnico em qualquer conta |
| `wl_admin` | 1 — WhiteLabel | Seus clientes | Cria/gerencia clientes da sua WL, licenças, branding |
| `wl_support` | 1 — WhiteLabel | Seus clientes (leitura) | Suporte técnico aos clientes da WL |
| `admin` | 2 — Cliente | Sua conta | Usuários, conexões WA, CRM, pipeline, configurações |
| `gestor` | 2 — Cliente | Sua conta | Relatórios, leads, cobranças, sem configurações |
| `financeiro` | 2 — Cliente | Módulos financeiros | Cobranças, receitas, despesas, fiscal |
| `consultor` | 2 — Cliente | Leitura + clientes | CRM, intelligence, relatórios |
| `representante` | 2 — Cliente | Entrada de dados | Clientes, comissões, inserir dados |

---

## Modelo de Licenciamento (Produtos Whatsflow)

> Aplicado na criação de contas de clientes diretos e clientes de WhiteLabels.

### Planos Base (Recorrente Mensal)

| Plano | Preço | Inclui |
|-------|-------|--------|
| **Solo Pro** | R$ 259/mês | 1 Dispositivo Web + 1 Meta (bônus) + 1 Atendente |
| **Profissional** | R$ 359/mês | 1 Dispositivo Web + 1 Meta (bônus) + 3 Atendentes |

**Regra:** ao ter 1+ Dispositivo Web, ganha 1 Dispositivo Meta gratuitamente.

### Add-ons (Recorrente Mensal)

**Dispositivos Web WhatsApp**
| Tier | Qtd | Preço/un |
|------|-----|----------|
| Tier 1 | 1–5 | R$ 150/un |
| Tier 2 | 6–20 | R$ 125/un |
| Tier 3 | 21–50 | R$ 100/un |

**Dispositivos Meta Business Manager**
| Tier | Qtd | Preço/un |
|------|-----|----------|
| Tier 1 | 1–5 | R$ 100/un |
| Tier 2 | 6–20 | R$ 80/un |
| Tier 3 | 21–50 | R$ 60/un |

**Atendentes Extras**
| Tier | Qtd | Preço/un |
|------|-----|----------|
| Tier 1 | 1–5 | R$ 80/un |
| Tier 2 | 6–10 | R$ 75/un |
| Tier 3 | 11–20 | R$ 70/un |
| Tier 4 | 21–50 | R$ 60/un |

**Módulo I.A.:** R$ 350/mês fixo — até 5 agentes

### Facilite Whatsflow (Suporte Dedicado)

| Plano | Horas/mês | Horas/semana | Preço |
|-------|-----------|--------------|-------|
| Básico | 8h | 2h | R$ 250/mês |
| Intermediário | 20h | 5h | R$ 700/mês |
| Avançado | 40h | 10h | R$ 1.500/mês |

### Serviço Único
| Serviço | Preço |
|---------|-------|
| Implantação Starter | R$ 2.000 (único) |

---

---

# FASE 1 — Fundação: Banco de Dados 3 Níveis + RLS

> **Objetivo:** Criar a estrutura de banco de dados que suporta os 3 níveis hierárquicos, ambientes separados e isolamento total de dados.  
> **Teste:** God Admin vê todos os dados. WL vê apenas seus clientes. Cliente vê apenas a si mesmo.  
> **Plataforma:** Antigravity + Supabase

---

```
Vou construir o Whatsflow Finance com arquitetura multi-tenant de 3 níveis:
  Nível 0: Whatsflow God Admin (controla tudo)
  Nível 1: WhiteLabel (ex: SendHit) — controla seus clientes
  Nível 2: Cliente Final — direto Whatsflow ou cliente de WhiteLabel

Também há dois ambientes: Produção e Desenvolvimento.
A conta de desenvolvimento é "Whatsflow Edtech" (servidor de testes).
Use Supabase como backend.

FASE 1: Configure a fundação do banco de dados.

═══════════════════════════════════════
1. TABELA PRINCIPAL — accounts
═══════════════════════════════════════

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,

  -- Tipo de conta na hierarquia
  account_type TEXT NOT NULL,
  -- Valores: 'god_admin' | 'whitelabel' | 'direct_client' | 'wl_client'

  -- Hierarquia
  -- direct_client e god_admin: parent_id = NULL
  -- wl_client: parent_id = id da conta whitelabel pai
  parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  -- Para wl_client: aponta diretamente para a WL (redundante para queries rápidas)
  whitelabel_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  -- Ambiente
  environment TEXT DEFAULT 'production',
  -- Valores: 'production' | 'development'
  -- Conta 'Whatsflow Edtech' usa environment='development'

  -- Status
  status TEXT DEFAULT 'active',
  -- Valores: 'active' | 'suspended' | 'cancelled' | 'trial'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Índices essenciais
CREATE INDEX ON accounts(account_type);
CREATE INDEX ON accounts(parent_id);
CREATE INDEX ON accounts(whitelabel_id);
CREATE INDEX ON accounts(environment);
CREATE INDEX ON accounts(status);

═══════════════════════════════════════
2. TABELA — whitelabel_branding
(branding de cada WhiteLabel — herdado por todos os seus clientes)
═══════════════════════════════════════

CREATE TABLE whitelabel_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- account_id deve ser de uma conta com account_type='whitelabel'

  -- Identidade Visual
  app_name TEXT NOT NULL,               -- Nome que aparece no produto (ex: "SendHit Pro")
  logo_url TEXT,                        -- URL do logo principal
  logo_dark_url TEXT,                   -- Logo para fundo escuro
  favicon_url TEXT,                     -- Favicon

  -- Paleta de cores (hex sem #)
  primary_color TEXT DEFAULT '25D366',
  secondary_color TEXT DEFAULT '1E293B',
  accent_color TEXT DEFAULT '3B82F6',
  background_color TEXT DEFAULT '0F172A',

  -- Domínio personalizado da WhiteLabel
  custom_domain TEXT UNIQUE,            -- ex: app.sendhit.com.br
  support_whatsapp TEXT,                -- número WhatsApp do suporte da WL
  support_email TEXT,

  -- Textos customizáveis
  login_headline TEXT,                  -- Texto na tela de login
  footer_text TEXT,                     -- Rodapé do app

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

═══════════════════════════════════════
3. TABELA — licenses
═══════════════════════════════════════

CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Plano e Status
  plan TEXT DEFAULT 'custom',
  status TEXT DEFAULT 'active', -- Ex: Em Dia, Inadimplente, etc.

  -- Limites (mapeados do CSV e sistema)
  limit_devices_web INT DEFAULT 1,    -- DISP. NÃO OFICIAL
  limit_devices_meta INT DEFAULT 0,   -- DISP. OFICIAL
  limit_attendants INT DEFAULT 1,     -- ATENDENTES

  -- Add-ons Financeiros
  has_ai_module BOOLEAN DEFAULT false,
  ai_agents_limit INT DEFAULT 0,
  facilite_plan TEXT DEFAULT 'none',

  -- Billing (mapeados do CSV)
  checkout_provider TEXT,             -- CHECKOUT
  payment_type TEXT,                  -- TIPO PAGAMENTO
  payment_method TEXT,                -- CONDIÇÃO (Ex: Boleto ou PIX)
  payment_status TEXT,                -- CONDIÇÃO (Ex: Em Dia, Em Aberto)
  monthly_value DECIMAL(10,2),        -- VALOR COBRANÇA
  additional_value DECIMAL(10,2) DEFAULT 0, -- ADCIONAL
  revenue DECIMAL(10,2) DEFAULT 0,          -- RECEITA
  
  -- Controle de Datas
  valid_until TIMESTAMPTZ,            -- VENCIMENTO
  activated_at TIMESTAMPTZ,           -- ATIVAÇÃO
  canceled_at TIMESTAMPTZ,            -- CANCELADO
  blocked_at TIMESTAMPTZ,             -- BLOQUEIO
  unblocked_at TIMESTAMPTZ,           -- DESBLOQUEIO

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON licenses(account_id);

═══════════════════════════════════════
4. TABELA — profiles
═══════════════════════════════════════

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Role determina nível de acesso
  role TEXT NOT NULL,
  -- Roles nível 0 (Whatsflow): 'god_admin' | 'god_support'
  -- Roles nível 1 (WhiteLabel): 'wl_admin' | 'wl_support'
  -- Roles nível 2 (Cliente): 'admin' | 'gestor' | 'financeiro' | 'consultor' | 'representante'

  full_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON profiles(account_id);
CREATE INDEX ON profiles(role);

═══════════════════════════════════════
5. TABELA — audit_logs
═══════════════════════════════════════

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,                        -- quem executou
  actor_role TEXT,                      -- role do executor
  actor_account_id UUID,                -- conta do executor
  target_account_id UUID,               -- conta afetada (NULL = ação global)
  action TEXT NOT NULL,                 -- ex: 'impersonation_start', 'license_updated'
  resource TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  environment TEXT DEFAULT 'production',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON audit_logs(target_account_id, created_at DESC);
CREATE INDEX ON audit_logs(actor_id, created_at DESC);
CREATE INDEX ON audit_logs(environment);

═══════════════════════════════════════
6. ROW LEVEL SECURITY
═══════════════════════════════════════

-- Ativar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelabel_branding ENABLE ROW LEVEL SECURITY;

-- POLICY: Usuário de nível cliente (direct_client / wl_client)
-- Vê apenas dados da sua própria conta
CREATE POLICY client_isolation ON profiles
  FOR ALL USING (
    account_id = (auth.jwt()->>'account_id')::UUID
    AND (auth.jwt()->>'role') IN ('admin','gestor','financeiro','consultor','representante')
  );

-- POLICY: Admin de WhiteLabel
-- Vê dados da sua conta + dados de todas as contas onde whitelabel_id = sua conta
CREATE POLICY wl_admin_access ON profiles
  FOR ALL USING (
    (auth.jwt()->>'role') IN ('wl_admin', 'wl_support')
    AND (
      account_id = (auth.jwt()->>'account_id')::UUID
      OR account_id IN (
        SELECT id FROM accounts
        WHERE whitelabel_id = (auth.jwt()->>'account_id')::UUID
      )
    )
  );

-- POLICY: God Admin (Whatsflow)
-- Usa service_role key — bypassa todo RLS
-- NUNCA expor service_role key no frontend — apenas em Edge Functions

-- Custom claims obrigatórios no JWT (via Supabase Auth hook):
-- { "account_id": "uuid", "role": "admin", "account_type": "wl_client", "whitelabel_id": "uuid" }

═══════════════════════════════════════
7. FUNÇÃO AUXILIAR — get_effective_branding
(retorna branding aplicável a uma conta)
═══════════════════════════════════════

CREATE OR REPLACE FUNCTION get_effective_branding(p_account_id UUID)
RETURNS TABLE (
  app_name TEXT, logo_url TEXT, logo_dark_url TEXT, favicon_url TEXT,
  primary_color TEXT, secondary_color TEXT, accent_color TEXT,
  background_color TEXT, custom_domain TEXT, support_whatsapp TEXT,
  support_email TEXT, login_headline TEXT
) AS $$
DECLARE
  v_account accounts%ROWTYPE;
  v_wl_id UUID;
BEGIN
  SELECT * INTO v_account FROM accounts WHERE id = p_account_id;

  -- Se é wl_client: usa branding da sua WhiteLabel
  IF v_account.account_type = 'wl_client' THEN
    v_wl_id := v_account.whitelabel_id;
  -- Se é whitelabel: usa seu próprio branding
  ELSIF v_account.account_type = 'whitelabel' THEN
    v_wl_id := p_account_id;
  -- Se é direct_client ou god_admin: retorna NULL (usa branding padrão Whatsflow)
  ELSE
    RETURN;
  END IF;

  RETURN QUERY
    SELECT wb.app_name, wb.logo_url, wb.logo_dark_url, wb.favicon_url,
           wb.primary_color, wb.secondary_color, wb.accent_color,
           wb.background_color, wb.custom_domain, wb.support_whatsapp,
           wb.support_email, wb.login_headline
    FROM whitelabel_branding wb
    WHERE wb.account_id = v_wl_id;
END;
$$ LANGUAGE plpgsql STABLE;

═══════════════════════════════════════
8. SEED DE DADOS INICIAIS
═══════════════════════════════════════

-- Conta God Admin (Whatsflow)
INSERT INTO accounts (name, slug, account_type, environment)
VALUES ('Whatsflow', 'whatsflow', 'god_admin', 'production');

-- Conta de Desenvolvimento
INSERT INTO accounts (name, slug, account_type, environment)
VALUES ('Whatsflow Edtech', 'whatsflow-edtech', 'god_admin', 'development');

-- WhiteLabel de exemplo: SendHit
INSERT INTO accounts (name, slug, account_type, environment)
VALUES ('SendHit', 'sendhit', 'whitelabel', 'production');

-- Cliente da SendHit: RadAdvogados
INSERT INTO accounts (name, slug, email, account_type, whitelabel_id, parent_id, environment)
VALUES ('RadAdvogados', 'rad-advogados', 'leonardo@radadvogados.com.br', 'wl_client',
  (SELECT id FROM accounts WHERE slug='sendhit'),
  (SELECT id FROM accounts WHERE slug='sendhit'),
  'production');

-- Licença da RadAdvogados
INSERT INTO licenses (account_id, plan, limit_devices_meta, limit_devices_web, limit_attendants, monthly_value)
VALUES (
  (SELECT id FROM accounts WHERE slug='rad-advogados'),
  'profissional', 1, 4, 48, 3074.00
);

-- Branding da SendHit
INSERT INTO whitelabel_branding (account_id, app_name, primary_color, accent_color)
VALUES (
  (SELECT id FROM accounts WHERE slug='sendhit'),
  'SendHit Pro', '0EA5E9', '6366F1'
);

-- TESTE OBRIGATÓRIO:
-- Query como wl_admin da SendHit: deve retornar RadAdvogados
-- Query como admin da RadAdvogados: NÃO deve retornar dados da SendHit
-- Query como god_admin: retorna todos
```

---

---

# FASE 2 — Portal God Admin (Whatsflow)

> **Objetivo:** Painel central da Whatsflow com visão e controle total de todos os níveis.  
> **Teste:** God Admin vê todos os níveis. Impersonation funciona em qualquer conta. Ambientes separados.

---

```
Continuando Whatsflow Finance 3 níveis. Banco de dados pronto.
Agora construa o portal God Admin da Whatsflow.

TEMA VISUAL (padrão Whatsflow):
  background: #0F172A
  surface: #1E293B
  primary: #25D366
  accent: #3B82F6
  font: Inter
  (clients que são WL ou WL_client usarão o branding da WL — não este)

═══════════════════════════════════════
AUTENTICAÇÃO — ROTEAMENTO POR TIPO DE CONTA
═══════════════════════════════════════

Tela de login única em /login.
Após autenticação, ler JWT e rotear:

  role=god_admin ou god_support
    → /god-admin

  role=wl_admin ou wl_support
    → /wl/{account_slug}

  role=admin|gestor|financeiro|consultor|representante
    account_type=direct_client
    → /app/{account_slug}   (com branding Whatsflow)

    account_type=wl_client
    → /app/{account_slug}   (com branding da WhiteLabel)

Rota /app/{slug}: ao carregar, chamar get_effective_branding(account_id)
  Se retornar branding WL → aplicar dinamicamente via CSS variables
  Se retornar NULL → usar branding padrão Whatsflow

═══════════════════════════════════════
PORTAL GOD ADMIN — /god-admin
═══════════════════════════════════════

Header:
  Logo Whatsflow + badge "GOD ADMIN" em vermelho/âmbar + nome do usuário logado
  Seletor de ambiente: [PRODUÇÃO ▼] / [DESENVOLVIMENTO ▼]
    Ao alternar ambiente, todos os dados exibidos filtram pelo environment selecionado

Sidebar:
  - Dashboard Global
  - WhiteLabels
  - Clientes Diretos
  - Licenças
  - Ambientes
  - Audit Log
  - Feature Flags
  - Configurações

─────────────────────────────────────
DASHBOARD GLOBAL
─────────────────────────────────────

Filtro de ambiente (topo): Produção | Desenvolvimento | Ambos

Row 1 — KPIs globais (cards):
  Total de WhiteLabels ativas
  Total de Clientes Diretos
  Total de Clientes de WLs
  Total de Contas Ativas (todos os níveis)
  MRR Global (soma de licenses.monthly_value de todas as contas ativas)
  Contas vencendo em 30 dias

Row 2 — Visão por WhiteLabel:
  Tabela: Nome WL | Clientes | MRR gerado | Status | Última atividade | Ações

Row 3 — Saúde do sistema:
  Conexões WA ativas (total global)
  Contas com erros de webhook
  Licenças vencidas não renovadas

─────────────────────────────────────
PÁGINA WHITELABELS
─────────────────────────────────────

Tabela de WhiteLabels:
  Nome | Slug | Nº de clientes | MRR dos clientes | Status | Ambiente | Ações

Botão [+ Nova WhiteLabel] → Modal de criação:
  Dados: nome, slug, ambiente (produção/desenvolvimento)
  Admin inicial: nome completo + email
  Branding básico: nome do app, cor primária, cor de destaque
  Ao criar: gerar account, profile do wl_admin, inserir branding padrão

Detalhes de uma WhiteLabel (página /god-admin/wl/{slug}):
  Aba Geral: dados da conta, status, datas
  Aba Branding: editar todos os campos de whitelabel_branding com preview ao vivo
  Aba Clientes: lista de todos os clientes desta WL com licenças
  Aba Licenças: resumo de MRR, planos distribuídos
  Aba Audit: logs de ações desta WL e seus clientes

─────────────────────────────────────
PÁGINA CLIENTES DIRETOS
─────────────────────────────────────

Tabela:
  Nome | Slug | Plano | MRR | Status | Vencimento | Facilite | Ações

Botão [+ Novo Cliente Direto] → Modal:
  Dados: nome, slug, ambiente
  Licença: plano base, add-ons com cálculo por tier em tempo real
  Facilite: nenhum | básico | intermediário | avançado
  Implantação Starter: checkbox (R$2.000 único)
  Admin: nome + email
  Preview MRR calculado antes de salvar

─────────────────────────────────────
IMPERSONATION (acesso como qualquer conta)
─────────────────────────────────────

Disponível em qualquer conta da tabela (WL, cliente direto, cliente de WL).
Botão "Acessar como Admin" em cada linha.

Ao clicar:
  Gerar token temporário de 1 hora via Edge Function (service_role)
  Registrar em audit_logs:
    action: 'impersonation_start'
    actor_id: god_admin_id
    target_account_id: conta acessada
    metadata: { razão: 'suporte' }
  Redirecionar para o portal correto da conta (/wl/{slug} ou /app/{slug})
  Exibir banner fixo no TOPO da tela durante toda a sessão:
    "⚠️ SESSÃO DE SUPORTE ATIVA — Acessando como [NomeDaConta] | [Encerrar]"
    Banner na cor âmbar, não pode ser fechado — só encerra via botão
  Ao encerrar: registrar audit_logs action: 'impersonation_end', redirecionar para /god-admin

─────────────────────────────────────
PÁGINA AMBIENTES
─────────────────────────────────────

Dois painéis lado a lado: Produção | Desenvolvimento

Cada painel exibe:
  Contas ativas neste ambiente
  Status dos serviços (banco, webhooks, edge functions)
  Última atualização deployada

Conta especial "Whatsflow Edtech" (environment=development):
  Badge "DEV" em azul/roxo em todas as telas onde aparecer
  Usada para testar correções antes de aplicar em produção
  God Admin pode "promover" uma configuração de dev para produção

─────────────────────────────────────
AUDIT LOG GLOBAL
─────────────────────────────────────

Tabela com TODAS as ações de todos os níveis:
  Data/hora | Ator | Role | Conta do Ator | Conta Afetada | Ação | Ambiente | IP

Filtros: conta, tipo de ação, role, período, ambiente
Export CSV
Destaque visual para ações de impersonation (cor âmbar)
```

---

---

# FASE 3 — Portal WhiteLabel

> **Objetivo:** Cada WhiteLabel tem seu painel isolado para gerenciar apenas seus clientes, com branding próprio aplicado.  
> **Teste:** Admin SendHit vê apenas clientes da SendHit. Branding SendHit aplicado corretamente. Não vê clientes diretos Whatsflow.

---

```
Continuando. God Admin funcionando. Agora construa o Portal WhiteLabel.

Exemplo de referência: SendHit é uma WhiteLabel da Whatsflow.
A RadAdvogados é cliente da SendHit.

═══════════════════════════════════════
PORTAL WHITELABEL — /wl/{slug}
═══════════════════════════════════════

Ao carregar /wl/{slug}:
  Carregar whitelabel_branding desta WL
  Aplicar via CSS variables:
    --color-primary: #{primary_color}
    --color-secondary: #{secondary_color}
    --color-accent: #{accent_color}
    --color-background: #{background_color}
  Substituir logo pelo logo_url da WL
  Substituir nome do app pelo app_name da WL

Importante: o portal WL é visualmente o produto da WL, não da Whatsflow.
Não deve aparecer "Whatsflow" em nenhum lugar visível para a WL ou seus clientes
(exceto se o god_admin estiver em sessão de impersonation).

─────────────────────────────────────
LAYOUT — sidebar da WL
─────────────────────────────────────

Header: Logo da WL (app_name) + nome do usuário wl_admin
Sidebar:
  - Dashboard
  - Meus Clientes
  - Licenças
  - Branding (editar visual da WL)
  - Suporte / Audit
  - Configurações

─────────────────────────────────────
DASHBOARD WL
─────────────────────────────────────

Cards:
  Total de clientes ativos
  MRR dos meus clientes (soma das licenças)
  Clientes vencendo em 30 dias
  Clientes com Módulo I.A. ativo
  Novos clientes nos últimos 30 dias

Gráfico: distribuição de planos dos meus clientes (Solo Pro vs Profissional)
Tabela: clientes com alertas (limite atingido, vencendo, suspenso)

─────────────────────────────────────
PÁGINA MEUS CLIENTES
─────────────────────────────────────

Tabela: Nome | Plano | MRR | Status | Vencimento | Ações
Filtros: plano, status, vencimento
Busca por nome ou slug

Botão [+ Novo Cliente] → Modal:
  Dados: nome da empresa, slug
  Licença: plano base + add-ons (com cálculo por tier e preview MRR)
  Facilite: nenhum | básico | intermediário | avançado
  Admin inicial: nome + email
  Ao criar:
    account criada com account_type='wl_client'
    parent_id = conta da WL
    whitelabel_id = conta da WL
    profile do admin criado
    license criada
    Novo cliente herda automaticamente o branding desta WL

Ações por cliente:
  Visualizar detalhes
  Editar licença (add-ons, validade, facilite)
  Suspender / Reativar
  Acessar como Admin (impersonation restrita — wl_admin pode acessar seus clientes)
    Ao entrar: banner "⚠️ SUPORTE ATIVO — Você está em [NomeCliente]"

─────────────────────────────────────
PÁGINA BRANDING
─────────────────────────────────────

Formulário completo de whitelabel_branding com preview ao vivo:

  Seção Identidade:
    Nome do App, Logo (upload), Logo Dark (upload), Favicon (upload)

  Seção Cores (color pickers):
    Cor Primária, Cor Secundária, Cor de Destaque, Background

  Seção Domínio:
    Domínio personalizado (ex: app.sendhit.com.br)
    Instruções de CNAME

  Seção Suporte:
    WhatsApp de suporte, Email de suporte

  Seção Textos:
    Headline da tela de login, Texto do rodapé

  Preview ao vivo: mini-mockup da tela de login e sidebar com o branding aplicado

  Botão [Salvar Branding] → propaga para todos os clientes desta WL em tempo real

─────────────────────────────────────
HERANÇA DE BRANDING NOS CLIENTES DA WL
─────────────────────────────────────

Quando um cliente da WL acessa /app/{slug}:
  Sistema chama get_effective_branding(account_id) → retorna branding da WL pai
  CSS variables aplicadas dinamicamente
  Logo, nome do app e cores da WL aparecem
  Cliente NÃO sabe que é Whatsflow por baixo (a menos que a WL queira)

O cliente da WL NÃO vê:
  Nenhuma referência à Whatsflow
  Nenhuma referência a outras WLs
  Nenhum menu de branding (essa configuração é da WL, não do cliente)
```

---

---

# FASE 4 — Portal Cliente Final (Direto e de WL)

> **Objetivo:** Portal unificado para clientes diretos Whatsflow e clientes de WhiteLabels. O visual muda conforme o branding herdado. Módulos: CRM, Conversas, Pipeline, WhatsApp.  
> **Teste:** RadAdvogados (cliente SendHit) usa cores/logo SendHit. Cliente direto Whatsflow usa cores Whatsflow. Dados completamente isolados entre clientes.

---

```
Continuando. God Admin e portal WL funcionando.
Agora construa o portal do Cliente Final — usado por direct_client e wl_client.

O portal é o MESMO componente para os dois tipos.
A diferença é o branding: direct_client usa Whatsflow, wl_client usa a WL.
O branding é carregado via get_effective_branding() ao iniciar a sessão.

═══════════════════════════════════════
PORTAL CLIENTE — /app/{slug}
═══════════════════════════════════════

Ao carregar:
  1. Verificar account_type e whitelabel_id no JWT
  2. Chamar get_effective_branding(account_id)
  3. Se retornou branding WL: aplicar CSS variables da WL
  4. Se retornou NULL (direct_client): aplicar CSS variables Whatsflow padrão
  5. Aplicar logo correspondente no header/sidebar
  6. Inicializar o app normalmente

Layout sidebar:
  Logo no topo (da WL ou Whatsflow conforme branding)
  Menu:
    - Dashboard
    - Conversas (badge nao-lidas)
    - CRM / Contatos
    - Pipeline / Leads
    - WhatsApp Connections
    - Relatórios
    - Assinatura / Licença
    - Configurações
  Rodapé: nome do usuário + badge role + dropdown (Perfil, Tema, Sair)

═══════════════════════════════════════
MÓDULOS (todos com account_id no lugar de tenant_id)
═══════════════════════════════════════

TABELAS (substituir tenant_id por account_id em todos os módulos):

crm_contacts:
  account_id, name, phone, email, company, tags TEXT[], stage,
  owner_id, source, notes, created_at

leads:
  account_id, contact_id, pipeline_id, title, stage, value,
  owner_id, priority, expected_close_date, lost_reason, created_at

whatsapp_connections:
  account_id, display_name, phone_number, type (web/meta),
  access_token (encrypted), webhook_verify_token, status,
  meta_business_id, quality_rating, created_at

conversations:
  account_id, contact_id, wa_connection_id, owner_id,
  status, unread_count, last_message_at, tags, created_at

messages:
  account_id, conversation_id, direction, content, content_type,
  status, sender_id, wa_message_id, timestamp

RLS em todas as tabelas:
  account_id = (auth.jwt()->>'account_id')::UUID
  (wl_admin pode ver tudo dos seus clientes via policy separada)

RBAC nos módulos (roles do nível 2):
  admin: acesso total a todos os módulos
  gestor: sem configurações, pode ver tudo mais
  financeiro: cobranças, receitas, despesas, fiscal
  consultor: CRM, relatórios, intelligence (somente leitura em financeiro)
  representante: clientes, comissões, inserir dados

As permissões detalhadas por módulo seguem a matriz já existente
no arquivo prompt-niveis-acesso.md (5 roles com view/create/edit/delete/export).

═══════════════════════════════════════
MÓDULO WHATSAPP CONNECTIONS
═══════════════════════════════════════

Lista das conexões da conta com status visual
Separar: Dispositivos Web | Dispositivos Meta

Botão [+ Adicionar Conexão] — Wizard 3 passos:
  Passo 1: tipo (Web ou Meta), nome, número
  Passo 2: instruções para token Meta
  Passo 3: URL do webhook gerada: /api/webhooks/{account_id}/{connection_id}

Validação de limites (contra licenses.limit_devices_web / limit_devices_meta):
  Se limite atingido → modal:
    "Limite de conexões atingido."
    Se wl_client: "Fale com [app_name da WL] para expandir." + botão WhatsApp da WL
    Se direct_client: "Fale com a Whatsflow para expandir." + botão WhatsApp Whatsflow

═══════════════════════════════════════
MÓDULO CONVERSAS (estilo WhatsApp Web)
═══════════════════════════════════════

3 colunas:
  Lista de conversas | Janela de chat | Detalhes do contato

Realtime via Supabase Realtime — sem reload
Notas internas (visíveis apenas para agentes)
Templates Meta (templates aprovados da conta do cliente)
SLA com countdown visual

Webhook handler: POST /api/webhooks/{account_id}/{connection_id}
  Validar assinatura HMAC
  Verificar account_id e connection_id no Supabase (service_role)
  Criar ou buscar conversa para o remetente
  Inserir mensagem com direction=inbound
  Incrementar unread_count
  Disparar Realtime para a conta

═══════════════════════════════════════
PÁGINA ASSINATURA
═══════════════════════════════════════

Para direct_client e wl_client — somente leitura:
  Plano atual, validade com countdown
  Uso vs limites: Dispositivos Web, Meta, Atendentes, I.A., Facilite
  Alertas de vencimento e 80% de uso

Botão de contato para expandir:
  Se wl_client: [Falar com {app_name da WL}] → WhatsApp da WL (support_whatsapp da branding)
  Se direct_client: [Falar com a Whatsflow] → WhatsApp Whatsflow

Mensagem pré-formatada:
  "Olá! Sou [nome] da empresa [account_name]. Preciso expandir: [recurso no limite]."
```

---

---

# FASE 5 — Gestão de Licenças (God Admin + WL Admin)

> **Objetivo:** God Admin gerencia licenças de todos os clientes (diretos e de WLs). WL Admin gerencia licenças apenas dos seus clientes.  
> **Teste:** God Admin altera licença da RadAdvogados. WL Admin (SendHit) altera licença da RadAdvogados. Nenhum dos dois pode acessar licença de cliente de outra WL.

---

```
Continuando. Portais de todos os níveis funcionando.
Agora implemente gestão de licenças em dois contextos.

CONTEXTO:
  - God Admin: gerencia TODAS as licenças (diretos + WLs + clientes de WLs)
  - WL Admin: gerencia APENAS licenças dos clientes da sua WL
  - Clientes NUNCA fazem self-service de upgrade
  - Cobranças ocorrem externamente (boleto/pix/Stripe)
  - Este módulo controla STATUS e LIMITES

═══════════════════════════════════════
TABELAS ADICIONAIS
═══════════════════════════════════════

license_history:
  account_id, changed_by_id, changed_by_role,
  previous_state JSONB, new_state JSONB,
  reason TEXT, created_at

notifications:
  account_id, type, title, message, read_at, action_url, created_at
  -- type: license_expiring | limit_reached | suspended | upgrade_requested

═══════════════════════════════════════
NO PORTAL GOD ADMIN — PÁGINA LICENÇAS
═══════════════════════════════════════

Dashboard de Licenças (com filtro de ambiente):

  Row 1 — Cards:
    Licenças Ativas | Vencendo 7d | Vencendo 30d | Suspensas | Canceladas

  Row 2 — Distribuição:
    Gráfico: por plano (Solo Pro vs Profissional)
    Gráfico: por origem (clientes diretos vs clientes de WLs)
    Gráfico: MRR por mês — últimos 12 meses

  Row 3 — Tabela completa de licenças:
    Nome conta | Tipo (direto/WL-client) | WL pai | Plano | MRR | Vencimento | Status | Ações

Edição de licença individual (modal ou página):
  Plano base (Solo Pro / Profissional)
  Add-ons com tiers calculados em tempo real:
    Extra Dispositivos Web (Tier1=R$150, Tier2=R$125, Tier3=R$100)
    Extra Dispositivos Meta (Tier1=R$100, Tier2=R$80, Tier3=R$60)
    Extra Atendentes (Tier1=R$80, Tier2=R$75, Tier3=R$70, Tier4=R$60)
    Módulo I.A. toggle (R$350 fixo)
  Facilite: none | básico (R$250) | intermediário (R$700) | avançado (R$1.500)
  Implantação Starter: checkbox (R$2.000 único, one-time)
  Validade: seletor de data + botão "Renovar +1 mês / +3 meses / +12 meses"
  Motivo da alteração: campo texto (obrigatório, gravado no license_history)
  Preview MRR atualizado em tempo real

Ações além de editar:
  Suspender → status=suspended (acesso read-only para cliente)
  Reativar → status=active
  Cancelar → status=cancelled, período de graça 90 dias

═══════════════════════════════════════
NO PORTAL WL ADMIN — PÁGINA LICENÇAS
═══════════════════════════════════════

Mesma interface mas RESTRITA aos clientes desta WL.

RLS: wl_admin só visualiza e edita licenças onde account.whitelabel_id = sua conta.

Dashboard de licenças dos meus clientes:
  Cards: Ativas | Vencendo em 30 dias | Suspensas
  Gráfico: distribuição por plano
  MRR total dos meus clientes

Edição de licença: mesmos campos do God Admin
  Gravar changed_by_role = 'wl_admin' no license_history

Ações: wl_admin pode suspender e reativar seus clientes.
  NÃO pode cancelar (apenas god_admin pode cancelar).

═══════════════════════════════════════
SISTEMA DE NOTIFICAÇÕES E CRON
═══════════════════════════════════════

Edge Function agendada (todo dia 00:00 BRT):
  Para cada licença com valid_until:
    Se vence em 30, 15, 7, 3, 1 dia:
      Criar registro em notifications para a conta cliente
      Enviar email de aviso (via Resend):
        Se wl_client: email com branding da WL (app_name, logo, support_email da WL)
        Se direct_client: email com branding Whatsflow

Sino de notificações no header do portal cliente:
  Badge com contador de não-lidas
  Dropdown cronológico com link para /assinatura

Guards de licença (middleware global):
  Criar usuário: verificar limit_attendants
  Criar conexão WA Web: verificar limit_devices_web
  Criar conexão WA Meta: verificar limit_devices_meta
  Acessar I.A.: verificar has_ai_module=true
  Licença vencida: redirect para /app/{slug}/assinatura
  Status=suspended: exibir página de suspensão com contato (WL ou Whatsflow)
```

---

---

# FASE 6 — Analytics, Relatórios e Ambiente de Desenvolvimento

> **Objetivo:** Analytics por cliente + visão consolidada por WL + dashboard global God Admin + configuração dos ambientes de desenvolvimento e produção.  
> **Teste:** Dashboard com 100+ conversas < 2s. God Admin alterna entre ambientes e vê dados corretos de cada um.

---

```
Última fase. Todos os portais e licenças funcionando.
Implemente Analytics, Relatórios e Gestão de Ambientes.

═══════════════════════════════════════
DASHBOARD DO CLIENTE — /app/{slug}
═══════════════════════════════════════

Filtros globais: Período (hoje/7d/30d/90d/custom) | Agente | Conexão WA

Row 1 — KPIs:
  Conversas Abertas | Tempo Médio Resposta (24h) | Taxa Resolução (7d) | Valor Pipeline

Row 2 — Gráficos:
  Volume de mensagens por dia (30d) — area chart
  Conversas por agente (2 semanas) — bar horizontal
  Leads por stage — funnel

Row 3 — Tabelas:
  Top 5 contatos ativos | Leads perdidos no mês | SLA em risco (próximas 2h)

Row 4 — Feed de atividade:
  Últimas 10 ações da equipe com avatar + timestamp relativo

═══════════════════════════════════════
PÁGINA RELATÓRIOS DO CLIENTE
═══════════════════════════════════════

Relatório de Atendimento:
  Conversas abertas/resolvidas/arquivadas
  Tempo médio resposta e resolução
  Performance por agente (ranking)
  Heatmap: dia da semana × hora

Relatório de Pipeline:
  Leads criados/ganhos/perdidos
  Taxa de conversão por stage
  Valor ganho/perdido em R$
  Top 5 motivos de perda

Relatório de Contatos:
  Novos por período e source
  Distribuição por tag e stage

Export CSV em todos os relatórios.

═══════════════════════════════════════
DASHBOARD WL ADMIN — ANALYTICS DOS CLIENTES
═══════════════════════════════════════

Visão consolidada de TODOS os clientes da WL:

  MRR total — últimos 12 meses (line chart)
  Top 5 clientes por volume de mensagens
  Clientes mais engajados vs menos ativos
  Distribuição de uso de módulos (% que usa I.A., Facilite, etc.)

Relatório exportável: desempenho por cliente em CSV

═══════════════════════════════════════
DASHBOARD GOD ADMIN — GLOBAL
═══════════════════════════════════════

Seletor de ambiente: Produção | Desenvolvimento | Ambos

MRR Global:
  Gráfico 12 meses com linhas empilhadas:
  Base (planos) | Add-ons Web | Add-ons Meta | Atendentes | I.A. | Facilite

Por WhiteLabel:
  Tabela: WL | Nº clientes | MRR | Crescimento MoM

Saúde do sistema:
  Contas com erro de webhook
  Conexões WA desconectadas
  Licenças vencidas não renovadas
  Alertas do ambiente de desenvolvimento

═══════════════════════════════════════
AMBIENTE DE DESENVOLVIMENTO — Whatsflow Edtech
═══════════════════════════════════════

No portal God Admin, página "Ambientes":

Painel DESENVOLVIMENTO (environment='development'):
  Conta "Whatsflow Edtech" sempre listada
  Status dos serviços do servidor de desenvolvimento
  Log de testes realizados
  Botão [+ Nova Conta de Teste] — cria conta com environment='development'
  Dados de desenvolvimento NÃO aparecem nos relatórios de produção

Painel PRODUÇÃO:
  Status dos serviços de produção
  Uptime, latência, conexões ativas

Promoção de configuração:
  No portal dev, God Admin pode marcar uma feature/config como "Pronta para Produção"
  Isso cria um registro de changelog para revisão antes de aplicar

═══════════════════════════════════════
VIEWS MATERIALIZADAS — PERFORMANCE
═══════════════════════════════════════

-- Substituir tenant_id por account_id:

CREATE MATERIALIZED VIEW daily_conversation_stats AS
  SELECT account_id, DATE(created_at) AS date,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status='resolved') AS resolved,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) AS avg_resolution_seconds
  FROM conversations
  GROUP BY account_id, DATE(created_at);

CREATE UNIQUE INDEX ON daily_conversation_stats(account_id, date);

CREATE MATERIALIZED VIEW wl_client_summary AS
  SELECT a.whitelabel_id, a.id AS client_account_id,
    COUNT(c.id) AS total_conversations,
    SUM(l.monthly_value) AS client_mrr
  FROM accounts a
  LEFT JOIN conversations c ON c.account_id = a.id
  LEFT JOIN licenses l ON l.account_id = a.id
  WHERE a.account_type = 'wl_client'
  GROUP BY a.whitelabel_id, a.id;

CREATE UNIQUE INDEX ON wl_client_summary(whitelabel_id, client_account_id);

-- Atualizar a cada 1 hora via Edge Function scheduled.
```

---

---

## Checklist de Testes por Fase

| Fase | Teste | Critério de Sucesso |
|------|-------|---------------------|
| Fase 1 | Query como wl_admin SendHit | Retorna apenas clientes da SendHit |
| Fase 1 | Query como admin RadAdvogados | Retorna apenas dados da RadAdvogados |
| Fase 1 | Query como god_admin (service_role) | Retorna dados de todos os níveis |
| Fase 1 | get_effective_branding(RadAdvogados) | Retorna branding da SendHit |
| Fase 1 | get_effective_branding(ClienteDireto) | Retorna NULL (usa Whatsflow padrão) |
| Fase 2 | Login god_admin → acessar /god-admin | Dashboard global com seletor de ambiente |
| Fase 2 | Login wl_admin → tentar /god-admin | Redirecionado para /wl/{slug} |
| Fase 2 | God Admin impersonation em RadAdvogados | Banner âmbar visível, audit_log criado |
| Fase 3 | Login wl_admin SendHit → portal /wl/sendhit | Branding SendHit aplicado (cores/logo) |
| Fase 3 | WL Admin cria cliente → cliente herda branding | RadAdvogados abre com visual SendHit |
| Fase 3 | WL Admin tenta ver cliente de outra WL | Bloqueado pelo RLS |
| Fase 4 | RadAdvogados faz login | Vê cores/logo SendHit em /app/rad-advogados |
| Fase 4 | Cliente direto Whatsflow faz login | Vê branding Whatsflow padrão |
| Fase 4 | RadAdvogados cria contato CRM | Contato NÃO aparece em outra conta |
| Fase 4 | RadAdvogados atinge limite de conexões WA | Modal exibe "Falar com SendHit" (não Whatsflow) |
| Fase 5 | God Admin altera licença RadAdvogados | MRR recalculado, license_history criado |
| Fase 5 | WL Admin SendHit altera licença RadAdvogados | Funciona. Gravado como changed_by_role=wl_admin |
| Fase 5 | WL Admin tenta cancelar licença | Bloqueado (apenas god_admin pode cancelar) |
| Fase 5 | Licença vence | Email com branding da WL para clientes de WL |
| Fase 6 | God Admin alterna para ambiente desenvolvimento | Dashboard mostra dados da Whatsflow Edtech |
| Fase 6 | Dashboard 100+ conversas | Carrega em menos de 2 segundos |

---

## Regras de Segurança — Nunca Violar

1. `service_role key` NUNCA vai ao frontend — apenas Edge Functions no servidor
2. Toda ação de impersonation registrada em `audit_logs` (LGPD obrigatório)
3. `access_token` das conexões WhatsApp criptografado com `pgcrypto`
4. WL Admin só acessa contas onde `whitelabel_id = sua account_id` (RLS)
5. Branding da WL carregado server-side — cliente não recebe configurações de outras WLs
6. Guards de licença validados no backend (Edge Function), nunca apenas no frontend
7. Ambiente de desenvolvimento completamente isolado dos dados de produção
8. Clientes de WLs NUNCA veem o nome "Whatsflow" (exceto durante impersonation do God Admin)

---

## Referência de Tipos de Conta

| account_type | Quem é | Portal | Branding |
|---|---|---|---|
| `god_admin` | Whatsflow + Edtech | /god-admin | Whatsflow (padrão) |
| `whitelabel` | SendHit, etc. | /wl/{slug} | Próprio da WL |
| `direct_client` | Cliente direto Whatsflow | /app/{slug} | Whatsflow (padrão) |
| `wl_client` | Cliente de uma WL | /app/{slug} | Herdado da WL pai |

---

*Whatsflow Finance — Arquitetura Multi-Tenant 3 Níveis + WhiteLabel | whatsflow.com.br*
