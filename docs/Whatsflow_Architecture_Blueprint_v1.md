# Whatsflow Architecture Blueprint v1
> **Fonte da Verdade (Ground Truth)** — Dossiê de Arquitetura Mestre (As-Is)
> Gerado em 2026-03-25 | Varredura completa: Frontend React, Edge Functions Deno, Schema Supabase

---

## 1. TOPOLOGIA E MULTI-TENANCY

### 1.1 Hierarquia: Nexus → WhiteLabel → Tenant

```
Nexus (god_admin) ── acesso total via is_nexus_user()
├── WhiteLabel (account_type: whitelabel)
│   ├── Tenant (account_type: wl_client)
│   └── Tenant (account_type: wl_client)
├── Direct Client (account_type: direct_client)
└── Internal (WHATSFLOW EDTECH LTDA — tenant_id: 00000000-...0001)
```

**Tabelas Estruturais:**

| Tabela | Colunas-Chave | Propósito |
|--------|---------------|-----------|
| `accounts` | id, name, slug(UNIQUE), account_type, parent_id, whitelabel_id | Hierarquia de contas |
| `tenants` | id, name, slug, document | Registro flat de empresas |
| `user_tenants` | user_id(FK), tenant_id(FK), is_owner, UNIQUE(user,tenant) | Mapeamento N:M usuário↔tenant |
| `licenses` | id, account_id, plan, status, parent_license_id, license_type, expires_at | Licença por conta |
| `profiles` | id(FK auth.users), account_id, role, custom_permissions | Perfis com roles |
| `nexus_users` | auth_user_id(UNIQUE), name, email(UNIQUE), is_active, role | Equipe admin interna |
| `whitelabel_branding` | account_id(UNIQUE), app_name, logo_url, primary_color, custom_domain | Identidade visual WL |

**Arquivos de Migração:**
- `supabase/migrations/20260320123126_fase_1_multitenant_3_niveis_wl.sql` — Setup hierarquia 3 níveis
- `supabase/migrations/20260325010406_fix_rls_multitenancy_v2.sql` — RLS v2 strict isolation
- `supabase/migrations/20260323180000_nexus_rls_licenses_tenants.sql` — Policies de acesso Nexus

### 1.2 Funções de Segurança RLS

**`is_nexus_user()`** — Verifica se usuário é admin Nexus ativo:
```sql
CREATE OR REPLACE FUNCTION public.is_nexus_user() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM nexus_users WHERE auth_user_id = auth.uid() AND is_active = true);
$$;
```

**`get_authorized_tenant_ids()`** — Retorna todos os tenant_ids autorizados:
```sql
CREATE OR REPLACE FUNCTION public.get_authorized_tenant_ids() RETURNS SETOF uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN QUERY
  -- Acesso direto (admin, gestor, consultor do tenant)
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  UNION
  -- Sub-tenants via WhiteLabel ownership
  SELECT l_child.tenant_id FROM licenses l_child
  JOIN licenses l_parent ON l_child.parent_license_id = l_parent.id
  JOIN user_tenants ut ON ut.tenant_id = l_parent.tenant_id
  WHERE ut.user_id = auth.uid() AND ut.is_owner = true AND l_parent.license_type = 'whitelabel';
END;
$$;
```

**Padrão de Policy aplicado em 12+ tabelas:**
```sql
CREATE POLICY "Strict_Tenant_Isolation" ON public.{tabela} FOR ALL
USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));
```

Tabelas cobertas: `negocios`, `financial_entries`, `crm_contacts`, `activities`, `asaas_payments`, `asaas_customers`, `asaas_revenue`, `asaas_expenses`, `channel_integrations`, `conversations`, `chat_messages`, `whatsapp_connections`

**Policies especiais:**
```sql
-- Profiles: usuário vê próprio perfil + perfis do mesmo tenant + nexus vê tudo
CREATE POLICY "Profiles_Security" ON public.profiles FOR ALL
USING (id = auth.uid() OR is_nexus_user()
  OR id IN (SELECT user_id FROM user_tenants WHERE tenant_id IN (SELECT get_authorized_tenant_ids())));

-- WhatsApp Messages: isolamento via instance → tenant
CREATE POLICY "WA_Messages_Security" ON public.whatsapp_messages FOR ALL
USING (is_nexus_user()
  OR instance_name IN (SELECT instance_name FROM whatsapp_instances
    WHERE tenant_id IN (SELECT get_authorized_tenant_ids())));
```

### 1.3 Resolução de Tenant no Frontend

**Arquivo: `src/hooks/useTenantId.ts`**
```typescript
export function useTenantId(): string | undefined {
  const { slug } = useParams<{ slug?: string }>();
  const { data: tenants } = useUserTenants();
  const userTenantId = tenants?.[0]?.tenant_id;

  // Prioridade: 1) slug da URL → resolve tenant_id do DB
  //             2) primeiro tenant do usuário (fallback)
  const { data: slugTenantId } = useQuery({
    queryKey: ["tenant-by-slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
      return data?.id || null;
    },
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });

  if (slug && slugTenantId) return slugTenantId;
  return userTenantId;
}
```

**Arquivo: `src/hooks/useUserTenants.ts`** — Query `user_tenants` por `user_id = auth.uid()`

---

## 2. METADATA-DRIVEN UI E CRM (ZERO FRICÇÃO)

### 2.1 Schema do Banco de Dados

**Migração: `supabase/migrations/20260325014026_add_dynamic_schema_to_crm.sql`**
```sql
-- card_schema: define quais campos customizados cada pipeline espera
ALTER TABLE public.sales_pipelines
  ADD COLUMN IF NOT EXISTS card_schema JSONB DEFAULT '[]'::jsonb;

-- custom_fields: armazena os valores por negócio
ALTER TABLE public.negocios
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- GIN indexes para queries performantes em JSONB
CREATE INDEX IF NOT EXISTS idx_pipelines_card_schema ON public.sales_pipelines USING GIN (card_schema);
CREATE INDEX IF NOT EXISTS idx_negocios_custom_fields ON public.negocios USING GIN (custom_fields);
```

### 2.2 Tipagem TypeScript

**Arquivo: `src/types/vendas.ts`**
```typescript
export type CardFieldType = 'text' | 'number' | 'currency' | 'date' | 'select' | 'boolean' | 'url' | 'email' | 'phone';

export interface CardFieldSchema {
  key: string;           // Identificador único (snake_case), mapeia para custom_fields
  label: string;         // Label de exibição em PT-BR
  type: CardFieldType;   // Tipo de input para renderização
  options?: string[];    // Apenas para type 'select'
  required: boolean;     // Campo obrigatório?
  placeholder?: string;
  defaultValue?: string | number | boolean;
}

export type PipelineCardSchema = CardFieldSchema[];
export type NegocioCustomFields = Record<string, string | number | boolean | null>;

export interface Negocio {
  id: string;
  tenant_id: string;
  titulo: string;
  status: NegocioStatus;
  origem: NegocioOrigem;
  custom_fields: NegocioCustomFields;  // Campos dinâmicos por pipeline
  // ... campos padrão
}
```

### 2.3 Fluxo de Renderização Dinâmica

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  sales_pipelines    │     │  NegocioDrawer.tsx    │     │  negocios           │
│  .card_schema[]     │────▶│  Lê schema do        │────▶│  .custom_fields{}   │
│  [{key,label,type}] │     │  pipeline ativo e     │     │  {"ticket_medio":   │
│                     │     │  renderiza <Input/>   │     │   150, "canal":     │
│                     │     │  dinamicamente        │     │   "Instagram"}      │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

---

## 3. ECOSSISTEMA DE I.A. E INTEGRAÇÕES

### 3.1 Tabela de Configuração

```sql
CREATE TABLE ai_configurations (
  id UUID PRIMARY KEY,
  provider TEXT,          -- 'openai' | 'anthropic' | 'gemini'
  api_key TEXT,           -- Criptografado em trânsito
  project_id TEXT,        -- OpenAI Project ID (opcional)
  model TEXT,             -- 'gpt-4o' | 'claude-sonnet-4-20250514' | 'gemini-2.0-flash'
  tenant_id UUID,         -- NULL = config global, senão tenant-specific
  is_global BOOLEAN,      -- Flag de fallback
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 3.2 Utilitário Compartilhado de IA

**Arquivo: `supabase/functions/_shared/ai.ts`**

**Carregamento de Config:**
```typescript
async function getAIConfig(tenantId?: string): Promise<AIConfig> {
  // 1. Tenta config específica do tenant
  if (tenantId) {
    const { data } = await client.from("ai_configurations")
      .select("provider, api_key, project_id, model")
      .eq("tenant_id", tenantId).eq("is_active", true).maybeSingle();
    if (data) return data;
  }
  // 2. Fallback para config global
  const { data: global } = await client.from("ai_configurations")
    .select("provider, api_key, project_id, model")
    .eq("is_global", true).eq("is_active", true).maybeSingle();
  if (global) return global;
  throw new Error("Nenhuma configuração de I.A. encontrada.");
}
```

**Chat Completions (multi-provider):**
```typescript
export async function callAI(options: AICallOptions): Promise<string>
// Suporta: OpenAI (gpt-4o), Anthropic (claude-sonnet-4-20250514), Gemini (gemini-2.0-flash)
```

**OpenAI Assistants API v2:**
```typescript
export async function callAssistant(options: {
  assistantId: string;
  message: string;
  tenantId?: string;
  pollIntervalMs?: number;  // default: 2000
  maxWaitMs?: number;       // default: 60000
}): Promise<string>
// Fluxo: Create Thread → Add Message → Create Run → Poll até completed → Retorna response
```

### 3.3 Onboarding Zero Fricção

**Fluxo completo:**
```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  WizardLayout   │     │  generate-crm-schema  │     │  OpenAI Assistant   │
│  (3 perguntas)  │────▶│  Edge Function        │────▶│  (Assistants v2)    │
│                 │     │  JWT auth + secrets    │     │                     │
│  1. Negócio     │     │                        │     │  Retorna JSON:      │
│  2. Dados       │     │  Deno.env.get(         │     │  pipeline_name,     │
│  3. Processo    │     │  'OPENAI_CRM_          │     │  stages[],          │
│                 │     │   ASSISTANT_ID')        │     │  card_schema[]      │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
         │                                                      │
         │              ┌──────────────────────┐                │
         └─────────────▶│  INSERT              │◀───────────────┘
                        │  sales_pipelines     │
                        │  + stages            │
                        │  + card_schema       │
                        └──────────────────────┘
```

**Arquivo: `src/components/sales/wizard/WizardLayout.tsx`**
- 3 perguntas textuais com `<Textarea>` (mínimo 10 chars)
- Estado de loading: "A IA está desenhando o seu CRM sob medida..."
- POST para `supabase.functions.invoke('generate-crm-schema', { body: { answers } })`
- INSERT na `sales_pipelines` com `card_schema` JSONB
- Redirect para `/vendas`

**Arquivo: `supabase/functions/generate-crm-schema/index.ts`**
- Auth via JWT header
- Busca `OPENAI_CRM_ASSISTANT_ID` de `Deno.env`
- Usa `callAssistant()` de `_shared/ai.ts`
- Parseia JSON (remove markdown fences)
- Valida presença de `pipeline_name`, `stages[]`, `card_schema[]`

### 3.4 Integrações Externas

| Serviço | API Endpoint | Propósito | Edge Functions | Auth |
|---------|-------------|-----------|---------------|------|
| **OpenAI** | `api.openai.com/v1` | AI (GPT-4o, Assistants v2) | generate-crm-schema, auditor-engine, ai-orchestrator | API Key |
| **Meta Graph** | `graph.facebook.com/v21.0` | WhatsApp Cloud + Instagram | meta-webhook, meta-proxy, meta-send-message | OAuth Token |
| **uazapi** | `whatsflow.uazapi.com` | WhatsApp Web | uazapi-proxy, uazapi-webhook | Instance Token + Admin Token |
| **Asaas** | `api.asaas.com/v3` | Pagamentos (PIX/Boleto/CC) | asaas-webhook, asaas-proxy, create-checkout-payment | API Key |
| **SMTP2GO / SendGrid** | Auto-detect | E-mail transacional | invite-user, send-recovery-email | API Key |
| **Firecrawl** | `api.firecrawl.dev/v1` | Web Scraping | firecrawl-scrape, firecrawl-search | API Key |
| **Apify** | `api.apify.com/v2` | Data Scraping | instagram-scraper, google-business-scraper | API Key |

---

## 4. PADRÕES DE FRONTEND

### 4.1 Stack Exata

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| React | 18.3.1 | UI Framework |
| TypeScript | 5.8.3 | Type Safety |
| Vite | 5.4.19 | Build Tool (SWC transpiler) |
| TailwindCSS | 3.4.17 | Utility-first CSS |
| Shadcn/UI | latest | Component Library |
| React Router | 6.30.1 | Client-side Routing |
| TanStack Query | 5.83.0 | Server State + Cache |
| React Hook Form | 7.61.1 | Form Management |
| Zod | 3.25.76 | Schema Validation |
| @dnd-kit | 6+ | Drag & Drop (Kanban) |
| Recharts | 2.15.4 | Charts & Graphs |
| Lucide React | 0.462.0 | Icon Library |
| Sonner | 1.7.4 | Toast Notifications |
| VitePWA | 1.2.0 | Progressive Web App |

### 4.2 Estrutura de Rotas

**Arquivo: `src/App.tsx`**

```
/ (root)
├── /login, /signup, /forgot-password, /reset-password  ── Public
├── /checkout, /ativar/:token, /aguardando-ativacao      ── Public (no auth)
│
├── /nexus                                               ── Nexus Admin Portal
│   ├── /licencas, /licencas/:id
│   ├── /whitelabels, /equipe, /financeiro
│   ├── /auditoria, /flags, /tickets
│   ├── /lifecycle, /checkouts, /ia
│   └── /configuracoes
│
├── /wl/:slug                                            ── WhiteLabel Portal
│   ├── /clientes, /clientes/:clientId
│   ├── /licencas, /branding, /suporte, /config
│
├── /superadmin                                          ── SuperAdmin Portal
│   ├── /tenants, /licencas, /audit, /config
│
├── /god-admin                                           ── God Admin Portal
│   ├── /whitelabels, /direct-clients, /licencas
│   ├── /ambientes, /audit, /flags, /config
│
└── /app/:slug                                           ── Client Portal (Principal)
    ├── /vendas, /dashboard, /analytics, /reports
    ├── /customers, /products, /atividades
    ├── /input, /cobrancas, /revenue, /expenses, /fiscal, /comissoes
    ├── /mensageria, /conversas, /integracoes
    ├── /usuarios, /settings, /assinatura, /perfil
    ├── /ia, /ia/auditor, /intelligence
    └── /sistema/comunidade, /sistema/tutoriais, /sistema/manual, /sistema/onboarding
```

### 4.3 Sistema de Permissões

**Arquivo: `src/hooks/usePermissions.ts`**

```typescript
// Roles (6 níveis):
type UserRole = 'superadmin' | 'admin' | 'gestor' | 'financeiro' | 'consultor' | 'representante';

// Módulos (15):
const ALL_MODULES = ['dashboard', 'vendas', 'cobrancas', 'comissoes', 'receitas', 'despesas',
  'clientes', 'produtos', 'fiscal', 'intelligence', 'relatorios',
  'configuracoes', 'usuarios', 'inserir_dados', 'mensageria'];

// Ações (5):
type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

// Uso:
const { can, canView, canCreate, canEdit, canDelete, isSuperAdmin } = usePermissions();
if (can('vendas', 'edit')) { /* ... */ }
```

**Bypass SuperAdmin:** `if (userRole === 'superadmin') return true;`
**Custom Permissions:** Merge de `DEFAULT_PERMISSIONS[role]` + `profile.custom_permissions` (JSONB)

### 4.4 Sistema de Temas

**Arquivo: `src/contexts/ThemeContext.tsx`**

3 temas baseados em pesquisa oftalmológica:
- `cafe-noturno` — Warm dark, âmbar (padrão, uso prolongado 6-8h)
- `pacifico` — Light warm, verde (ambientes iluminados)
- `cosmos` — Deep navy, azul gelo (power user técnico)

Persistência: `localStorage('wf_theme')` + `user_preferences.theme` (Supabase)
Aplicação: `document.documentElement.setAttribute('data-theme', theme)` → CSS variables

**Arquivo: `src/styles/themes.css`** — ~120 CSS variables por tema (backgrounds, borders, accents, text, WhatsApp-specific)

### 4.5 Regras de Ouro para Novos Componentes

1. **Sempre usar `useTenantId()`** para filtrar dados — nunca hardcodar tenant_id
2. **Sempre usar `useQuery` (TanStack)** para dados do servidor — nunca `useState` + `useEffect` + `fetch`
3. **Sempre filtrar por `enabled: !!tenantId`** — evita queries antes do tenant resolver
4. **CSS variables em vez de cores hardcoded** — `var(--bg-base)` em vez de `#18140f`
5. **Shadcn/UI como base** — Button, Card, Dialog, Sheet, Textarea, etc.
6. **`sonner` para toasts** — `toast.success()`, `toast.error()`
7. **`supabase.functions.invoke()`** para Edge Functions — nunca fetch direto
8. **Permissões via `<ProtectedRoute module="xxx">`** no routing e `usePermissions()` inline

---

## 5. EDGE FUNCTIONS (35+ funções serverless)

### 5.1 Estrutura de Diretórios

```
supabase/functions/
├── _shared/
│   ├── ai.ts              — API calls: OpenAI, Anthropic, Gemini, Assistants v2
│   └── smtp.ts            — Email: SMTP2GO / SendGrid auto-detect
├── activate-account/      — Ativação de conta
├── ai-orchestrator/       — Orquestração de tarefas IA
├── asaas-proxy/           — Proxy API Asaas (pagamentos)
├── asaas-webhook/         — Webhook Asaas
├── auditor-engine/        — Motor de auditoria de qualidade
├── auditor-report/        — Geração de relatórios de auditoria
├── check-uazapi-status/   — Health check uazapi
├── create-checkout-payment/ — Criação de pagamento checkout
├── generate-crm-schema/   — Onboarding CRM com IA
├── instagram-ai-analysis/ — Análise de perfil Instagram (7 pilares)
├── invite-user/           — Convite + e-mail de ativação
├── meta-oauth-callback/   — OAuth Meta (WhatsApp + Instagram)
├── meta-oauth-start/      — Início OAuth Meta
├── meta-send-message/     — Envio via Meta Cloud API
├── meta-webhook/          — Webhook Meta (WhatsApp + Instagram)
├── send-recovery-email/   — E-mail de recuperação de senha
├── sync-message-status/   — Sync status de mensagens
├── uazapi-proxy/          — Proxy API uazapi
├── uazapi-webhook/        — Webhook uazapi (WhatsApp Web)
└── ... (30+ outras)
```

### 5.2 Padrão de E-mail

**Arquivo: `supabase/functions/_shared/smtp.ts`**
- Auto-detecção: se API key começa com `SG.` → SendGrid, senão → SMTP2GO
- Sender padrão: `Whatsflow <no-reply@whatsflow.com.br>`
- Templates em HTML inline (PT-BR)

---

## 6. INFRAESTRUTURA E DEPLOY

### 6.1 Arquitetura de Deploy

```
GitHub (alezachi-whatsflow/unfold-project-joy)
  └── Push main → Railway auto-build

Railway (Static Hosting)
  ├── Vite build → dist/
  ├── URL: unfold-project-joy-production.up.railway.app
  └── Auto-deploy on push

Supabase Cloud (jtlrglzcsmqmapizqgzu)
  ├── PostgreSQL 15 (75 tabelas, 24 funções, 56 migrations)
  ├── GoTrue Auth (Email/Password)
  ├── PostgREST (Auto REST API)
  ├── Realtime WebSocket (whatsapp_messages, chat_messages)
  ├── Edge Functions (Deno Deploy, 35+ funções)
  └── Storage (S3-compatible)
```

### 6.2 Variáveis de Ambiente

**Frontend (.env):**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Conexão Supabase
- `VITE_APP_URL` — URL de produção Railway
- `VITE_META_APP_ID`, `VITE_META_*` — IDs públicos Meta
- `VITE_WHATSAPP_SUPPORT_NUMBER` — Número de suporte

**Backend (Supabase Secrets):**
- `OPENAI_CRM_ASSISTANT_ID`, `OPENAI_ASSISTANT_ID` — IDs dos Assistants
- `META_APP_SECRET`, `META_VERIFY_TOKEN` — Meta OAuth
- `UAZAPI_ADMIN_TOKEN`, `UAZAPI_BASE_URL` — uazapi
- `SMTP2GO_API_KEY` — E-mail
- `ASAAS_API_KEY` — Pagamentos
- `FIRECRAWL_API_KEY`, `APIFY_API_KEY` — Scraping

### 6.3 Configuração Vite

**Arquivo: `vite.config.ts`**
- SWC transpiler (mais rápido que Babel)
- PWA manifest com suporte offline (Workbox)
- Path alias: `@` → `./src`
- Dev server: porta 8080, HMR sem overlay
- Cache strategies: Supabase API (NetworkFirst 5min), Imagens (CacheFirst 30 dias)

---

## 7. RESUMO EXECUTIVO

| Aspecto | Tecnologia | Detalhes |
|---------|-----------|---------|
| **Frontend** | React 18.3 + TypeScript 5.8 | SPA com React Router 6 |
| **Build** | Vite 5.4 + SWC | PWA plugin, 5MB cache limit |
| **Database** | PostgreSQL 15 (Supabase) | 75 tabelas, 24 funções, 56 migrations |
| **Auth** | Supabase GoTrue | Email + Password, JWT in memory |
| **API** | PostgREST + Edge Functions | Auto REST + 35+ serverless (Deno) |
| **CSS** | TailwindCSS 3.4 | CSS variables para 3 temas runtime |
| **State** | TanStack Query 5.83 | Server state + React Context local |
| **Multi-Tenancy** | 3 níveis Nexus→WL→Tenant | RLS strict isolation + tenant resolution via URL slug |
| **CRM** | JSONB card_schema + custom_fields | Campos dinâmicos por pipeline (IA-generated) |
| **IA** | OpenAI + Anthropic + Gemini | Assistants v2 + Chat Completions |
| **Mensageria** | Meta Cloud + uazapi | WhatsApp Cloud API + WhatsApp Web |
| **Pagamentos** | Asaas | PIX, Boleto, Cartão de Crédito |
| **E-mail** | SMTP2GO / SendGrid | Auto-detect por formato de API key |
| **Deploy** | Railway + Supabase | Static hosting + BaaS |
| **Segurança** | RLS + JWT + OAuth | Isolamento row-level, acesso role-based |

---

*Documento gerado automaticamente via varredura completa da codebase.*
*Última atualização: 2026-03-25*
