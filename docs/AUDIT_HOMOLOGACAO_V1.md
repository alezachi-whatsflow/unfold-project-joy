# WHATSFLOW FINANCE - DOSSIÊ DE AUDITORIA E HOMOLOGACAO
**Data:** 2026-03-31 | **Versao:** 1.0 | **Autor:** Antigravity Engine  
**Escopo:** Varredura exaustiva de frontend, banco de dados, Edge Functions e infraestrutura

---

## SUMARIO EXECUTIVO

| Metrica | Valor |
|---------|-------|
| **Rotas Frontend** | 50+ (5 portais: Nexus, WhiteLabel, SuperAdmin, GodAdmin, Client) |
| **Componentes >300 linhas** | 69 arquivos |
| **Tabelas PostgreSQL** | 75+ (43+ com RLS Strict_Tenant_Isolation) |
| **Migrations** | 119 arquivos |
| **Policies RLS** | 250+ |
| **Funcoes DB** | 24+ (SECURITY DEFINER) |
| **Edge Functions** | 35+ (Deno Deploy) |
| **Integrações Externas** | 14 APIs (Meta, Asaas, OpenAI, Anthropic, Gemini, uazapi, Z-API, Evolution, Firecrawl, Apify, Telegram, Mercado Livre, SendGrid, SMTP2GO) |
| **Temas UI** | 3 (cafe-noturno, pacifico, cosmos) com 100+ CSS vars cada |
| **Roles Tenant** | 6 (superadmin, admin, gestor, financeiro, consultor, representante) |
| **Roles Nexus** | 6 (nexus_superadmin, nexus_dev_senior, nexus_suporte_senior, nexus_financeiro, nexus_suporte_junior, nexus_customer_success) |
| **Modulos Permissão** | 20 modulos x 5 acoes (view, create, edit, delete, export) |

---

## 1. ARQUITETURA E FLUXOS

### 1.1 Stack Tecnologico (As-Is)

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Frontend SPA | React + TypeScript + Vite (SWC) | 18.3.1 / 5.8.3 / 5.4.19 |
| Styling | TailwindCSS + CSS Variables | 3.4.17 |
| Roteamento | React Router | 6.30.1 |
| Server State | TanStack Query | 5.83.0 |
| Formularios | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| Drag & Drop | @dnd-kit | 6+ |
| Charts | Recharts | 2.15.4 |
| Icons | Lucide React | 0.462.0 |
| Toasts | Sonner | 1.7.4 |
| PWA | VitePWA (DESABILITADO) | 1.2.0 |
| BaaS | Supabase Self-Hosted | PostgreSQL 15 |
| Serverless | Deno Deploy | Edge Functions |
| Object Storage | Cloudflare R2 | S3-compatible |
| Filas | Redis BullMQ | 3 instancias |
| Deploy Frontend | Railway | US/EU |

### 1.2 Topologia Multi-Tenant (3 Niveis)

```
┌─────────────────────────────────────────────┐
│                NEXUS (God-Level)             │
│  nexus_users → is_nexus_user() → bypass RLS │
│  Portais: /nexus/*                           │
├─────────────────────────────────────────────┤
│           WHITELABEL (Intermediario)         │
│  accounts.account_type = 'whitelabel'        │
│  licenses.license_type = 'whitelabel'        │
│  parent_license_id → sub-licenses            │
│  Portais: /wl/:slug/*                        │
├─────────────────────────────────────────────┤
│              TENANT (Operacional)            │
│  user_tenants → get_authorized_tenant_ids()  │
│  Strict_Tenant_Isolation em 43+ tabelas      │
│  Portais: /app/:slug/*                       │
└─────────────────────────────────────────────┘
```

### 1.3 Fluxo de Resolucao de Tenant (Frontend)

```
URL (/app/:slug) → useTenantId()
  ├── Prioridade 1: slug → SELECT id FROM tenants WHERE slug = :slug
  ├── Prioridade 2: useUserTenants() → tenants[0].tenant_id
  └── Fallback: undefined (redireciona login)
```

**Funcoes de Seguranca (Backend):**

| Funcao | Retorno | Uso |
|--------|---------|-----|
| `is_nexus_user()` | BOOLEAN | Bypass completo de RLS para admins Nexus |
| `get_authorized_tenant_ids()` | SETOF UUID | Tenant direto + sub-tenants WhiteLabel |
| `get_my_tenant_ids()` | SETOF UUID | Apenas tenants diretos do user |
| `get_my_role()` | TEXT | Role do profile (admin/gestor/etc) |
| `get_nexus_role()` | TEXT | Role Nexus especifica |
| `is_superadmin()` | BOOLEAN | Check role = 'superadmin' |

### 1.4 Mapa Completo de Rotas

#### Rotas Publicas
| Rota | Componente | Proposito |
|------|-----------|----------|
| `/login` | LoginPage | Autenticacao |
| `/signup` | SignupPage | Registro |
| `/forgot-password` | ForgotPasswordPage | Recuperacao de senha |
| `/reset-password` | ResetPasswordPage | Reset via token |
| `/checkout` | CheckoutPage | Checkout publico |
| `/aguardando-ativacao` | AguardandoAtivacaoPage | Aguardando ativacao |
| `/ativar/:token` | ActivationPage | Ativacao de conta |
| `/pay/:slug` | PzaafiPublicCheckout | Checkout Pzaafi |

#### Portal Nexus (/nexus/*)
| Rota | Componente | Guard |
|------|-----------|-------|
| `/nexus/login` | NexusLogin | None |
| `/nexus` | NexusLayout | AuthGuard + NexusProvider |
| `/nexus/licencas` | NexusLicenses | AuthGuard |
| `/nexus/licencas/:id` | NexusLicenseDetail | AuthGuard |
| `/nexus/whitelabels` | NexusWhitelabels | AuthGuard |
| `/nexus/lifecycle` | NexusLifecycle | AuthGuard |
| `/nexus/checkouts` | NexusCheckouts | AuthGuard |
| `/nexus/financeiro` | NexusFinanceiro | AuthGuard |
| `/nexus/equipe` | NexusEquipe | AuthGuard |
| `/nexus/auditoria` | NexusAuditLog | AuthGuard |
| `/nexus/flags` | NexusFeatureFlags | AuthGuard |
| `/nexus/tickets` | NexusTickets | AuthGuard |
| `/nexus/configuracoes` | NexusConfiguracoes | AuthGuard |
| `/nexus/configuracoes/integracoes` | NexusIntegracoes | AuthGuard |
| `/nexus/ia` | NexusAIConfig | AuthGuard |

#### Portal WhiteLabel (/wl/:slug/*)
| Rota | Componente |
|------|-----------|
| `/wl/:slug` | WLLayout (Dashboard) |
| `/wl/:slug/clientes` | WLClients |
| `/wl/:slug/clientes/:clientId` | WLClientDetail |
| `/wl/:slug/licencas` | WLLicenses |
| `/wl/:slug/branding` | WLBranding |
| `/wl/:slug/suporte` | WLAudit |
| `/wl/:slug/config` | WLConfig |

#### App Tenant (/app/:slug/*)
| Rota | Module Guard | Componente |
|------|-------------|-----------|
| `/app/:slug` | dashboard | Index |
| `/app/:slug/home` | dashboard | HomePage |
| `/app/:slug/vendas` | vendas | VendasPage |
| `/app/:slug/input` | inserir_dados | DataInputPage |
| `/app/:slug/cobrancas` | cobrancas | CobrancasPage |
| `/app/:slug/expenses` | despesas | ExpensesPage |
| `/app/:slug/revenue` | receitas | RevenuePage |
| `/app/:slug/fiscal` | fiscal | FiscalPage |
| `/app/:slug/comissoes` | comissoes | ComissoesPage |
| `/app/:slug/customers` | clientes | CustomersPage |
| `/app/:slug/atividades` | clientes | ActivitiesPage |
| `/app/:slug/products` | produtos | ProductsPage |
| `/app/:slug/intelligence` | intelligence | IntelligencePage |
| `/app/:slug/settings` | configuracoes | SettingsPage |
| `/app/:slug/usuarios` | usuarios | UsersPage |
| `/app/:slug/reports` | relatorios | ReportsPage |
| `/app/:slug/mensageria` | mensageria | MensageriaPage |
| `/app/:slug/integracoes` | mensageria | IntegracoesPage |
| `/app/:slug/conversas` | mensageria | ConversationsPage |
| `/app/:slug/assinatura` | None | AssinaturaPage |
| `/app/:slug/analytics` | dashboard | AnalyticsPage |
| `/app/:slug/pzaafi` | None | PzaafiModule |

---

## 2. MAPEAMENTO DE TABELAS E SCHEMAS

### 2.1 Tabelas Estruturais (Multi-Tenant Core)

#### tenants
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador unico |
| name | TEXT | Nome do tenant |
| slug | TEXT UNIQUE | URL-safe identifier |
| cpf_cnpj | TEXT | Documento fiscal |
| email | TEXT | Email principal |
| phone | TEXT | Telefone |
| deleted_at | TIMESTAMPTZ | Soft delete |
| deletion_scheduled_for | TIMESTAMPTZ | Hard delete agendado (30 dias) |

#### accounts
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| name | TEXT | Nome da conta |
| slug | TEXT UNIQUE | URL-safe |
| account_type | TEXT | 'direct_client' / 'wl_client' |
| status | TEXT | Status da conta |
| plan | TEXT | Plano contratado |
| environment | TEXT | Ambiente |

#### user_tenants
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| user_id | UUID FK→auth.users | Usuario |
| tenant_id | UUID FK→tenants | Tenant vinculado |
| is_owner | BOOLEAN | Proprietario do tenant |

#### profiles
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK (= auth.uid) | Vinculado ao auth.users |
| full_name | TEXT | Nome completo |
| role | TEXT | 'admin'/'superadmin'/'gestor'/'consultor'/'representante'/'financeiro' |
| custom_permissions | JSONB | Permissoes customizadas por modulo |
| tenant_id | UUID | Tenant principal |
| is_active | BOOLEAN | Ativo |
| invitation_status | TEXT | 'pending'/'accepted' |
| last_login_at | TIMESTAMPTZ | Ultimo login |

#### licenses
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| tenant_id | UUID FK UNIQUE | 1:1 com tenant |
| account_id | UUID FK | Conta vinculada |
| plan | TEXT | 'solo_pro'/'profissional'/'custom' |
| status | TEXT | 'active'/'suspended'/'expired' |
| license_type | TEXT | 'internal'/'whitelabel'/'individual' |
| parent_license_id | UUID FK→licenses | Hierarquia WL |
| base_devices_web/meta | INT | Dispositivos base |
| extra_devices_web/meta | INT | Dispositivos extras |
| base_attendants | INT | Atendentes base |
| extra_attendants | INT | Atendentes extras |
| has_ai_module | BOOLEAN | Modulo IA ativo |
| ai_active_skills | JSONB | {auditor, copilot, closer} |
| facilite_plan | TEXT | 'none'/'basico'/'intermediario'/'avancado' |
| monthly_value | DECIMAL(10,2) | Valor mensal |
| valid_until | TIMESTAMPTZ | Validade |
| billing_cycle | TEXT | 'monthly'/'quarterly'/'annual' |
| split_config | JSONB | Config de split de pagamento |

#### nexus_users
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| auth_user_id | UUID UNIQUE | Vinculo auth |
| name/email | TEXT | Dados pessoais |
| role | TEXT | 6 roles Nexus |
| is_active | BOOLEAN | Status |

### 2.2 Schemas JSONB Criticos

#### sales_pipelines.card_schema (Metadata-Driven UI)
```typescript
type CardFieldType = 'text' | 'number' | 'currency' | 'date' | 'select' | 'boolean' | 'url' | 'email' | 'phone';

interface CardFieldSchema {
  key: string;           // snake_case unique key
  label: string;         // Display label PT-BR
  type: CardFieldType;   // Tipo para renderizacao
  options?: string[];    // Somente para type='select'
  required: boolean;     // Obrigatorio
  placeholder?: string;  // Placeholder do input
  defaultValue?: string | number | boolean;
}
```

#### negocios.custom_fields
```typescript
type NegocioCustomFields = Record<string, string | number | boolean | null>;
// Chaves correspondem ao card_schema[].key do pipeline
```

#### negocios.produtos
```typescript
interface NegocioProduto {
  produtoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  desconto: number;
  valorTotal: number;
}
```

#### negocios.historico
```typescript
interface HistoricoItem {
  id: string;
  data: string;
  tipo: 'nota' | 'email' | 'ligacao' | 'reuniao' | 'status_change' | 'proposta' | 'cobranca' | 'nf';
  descricao: string;
  usuarioId: string;
  usuarioNome: string;
}
```

### 2.3 Tabelas de Mensageria

#### whatsapp_messages (Tabela Unificada Multi-Canal)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| instance_name | TEXT NOT NULL | Instancia de origem |
| remote_jid | TEXT NOT NULL | Destinatario/Remetente |
| message_id | TEXT UNIQUE | ID da mensagem no provider |
| direction | TEXT | 'inbound'/'outbound' |
| type | TEXT | 'text'/'image'/'audio'/'video'/'document'/'sticker'/'ptt' |
| body | TEXT | Conteudo textual |
| media_url | TEXT | URL da midia |
| caption | TEXT | Legenda de midia |
| status | INT | 0=error, 1=sent, 2=delivered, 3=read, 4=received |
| raw_payload | JSONB | Payload bruto do provider |
| file_encrypted | BOOLEAN | Flag de criptografia LGPD |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

**Nota:** Esta tabela armazena mensagens de TODOS os canais (WhatsApp Web, Meta WABA, Instagram, Messenger, Telegram, Mercado Livre) diferenciados por `instance_name` prefix.

#### whatsapp_contacts
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| instance_name | TEXT | Instancia |
| phone | TEXT | Telefone |
| name / push_name | TEXT | Nome do contato |
| profile_pic_url | TEXT | **Foto do perfil** (salva pelo webhook) |
| is_business | BOOLEAN | Conta comercial |
| UNIQUE(instance_name, phone) | | Constraint composta |

#### whatsapp_instances (uazapi/Z-API/Evolution)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| session_id | TEXT UNIQUE | ID da sessao |
| instance_name / instance_token | TEXT | Credenciais uazapi |
| provedor | TEXT | 'uazapi'/'zapi'/'evolution' |
| status | TEXT | 'connected'/'disconnected' |
| profile_pic_url | TEXT | Foto do perfil da instancia |
| current_presence | TEXT | 'available'/'unavailable' |
| chatbot_enabled | BOOLEAN | Bot ativo |

### 2.4 Tabelas Financeiras

#### asaas_payments
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| asaas_id | TEXT | ID no Asaas |
| billing_type | ENUM | 'BOLETO'/'CREDIT_CARD'/'PIX'/'UNDEFINED' |
| status | ENUM | PENDING/RECEIVED/CONFIRMED/OVERDUE/REFUNDED/etc |
| value / net_value | DECIMAL(12,2) | Valores |
| invoice_url / bank_slip_url | TEXT | Links de pagamento |
| pix_qr_code / pix_copy_paste | TEXT | Dados PIX |

#### financial_entries (Consolidado Mensal)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| month | TEXT UNIQUE | 'YYYY-MM' |
| mrr / new_mrr / expansion_mrr / churned_mrr | DECIMAL | Receita recorrente |
| fixed_costs / variable_costs / infrastructure | DECIMAL | Custos |
| total_customers / new_customers / churned_customers | DECIMAL | Metricas |
| cash_balance | DECIMAL | Saldo |

---

## 3. LISTA DE EDGE FUNCTIONS E APIs

### 3.1 Edge Functions por Categoria

#### Mensageria & WhatsApp (11 funcoes)
| Funcao | Metodo | Proposito | API Externa |
|--------|--------|-----------|-------------|
| `meta-webhook` | GET/POST | Receiver Meta Cloud API (WhatsApp/Instagram/Messenger) | Meta Graph v21.0 |
| `meta-proxy` | POST | Envio de mensagens via Meta | Meta Graph v21.0 |
| `whatsapp-proxy` | POST | Proxy multi-provider (Z-API, uazapi, Evolution) | Z-API/uazapi/Evolution |
| `whatsapp-webhook-receiver` | POST | Receiver multi-provider normalizado | - |
| `uazapi-webhook` | POST | Receiver dedicado uazapi (messages, status, connection) | - |
| `uazapi-proxy` | POST | Proxy autenticado para uazapi | uazapi |
| `setup-uazapi-webhook` | POST | Configurar webhook uazapi | uazapi |
| `sync-uazapi-messages` | POST | Sincronizar mensagens recentes | uazapi |
| `enqueue-message` | POST | Enfileirar em Redis BullMQ (3 filas) | Redis |
| `telegram-webhook` | POST | Receiver Telegram Bot API | Telegram |
| `telegram-send` | POST | Envio via Telegram | Telegram Bot API |

#### Pagamentos & Checkout (4 funcoes)
| Funcao | Proposito | API |
|--------|-----------|-----|
| `create-checkout-payment` | Criar cobranca (PIX/Boleto/Cartao) | Asaas v3 |
| `asaas-webhook` | Receiver de eventos Asaas + ativacao de conta | Asaas v3 |
| `asaas-proxy` | Proxy rate-limited para Asaas | Asaas v3 |
| `pzaafi-checkout` | Checkout via Pzaafi (orchestrator) | Pzaafi |

#### AI & Automacao (4 funcoes)
| Funcao | Proposito | API |
|--------|-----------|-----|
| `generate-crm-schema` | Wizard AI: gerar pipeline/departamentos/tags | OpenAI Assistants v2 |
| `ai-orchestrator` | Router de skills IA (Copilot/Closer/Auditor) | OpenAI/Anthropic/Gemini |
| `analyze-conversation` | Analise de conversas por IA | Multi-provider |
| `auditor-engine` | Motor de auditoria de atendimento | Multi-provider |

#### Scraping & Inteligencia (4 funcoes)
| Funcao | Proposito | API |
|--------|-----------|-----|
| `firecrawl-scrape` | Scrape de URL unica | Firecrawl |
| `firecrawl-search` | Busca + scrape | Firecrawl |
| `instagram-scraper` | Perfil Instagram completo | Apify |
| `google-business-scraper` | Google Business com reviews/produtos | Apify |

#### Ciclo de Vida & Email (4 funcoes)
| Funcao | Proposito |
|--------|-----------|
| `activate-account` | Ativar conta via token |
| `resend-activation-email` | Reenviar email de ativacao |
| `send-recovery-email` | Recuperacao de senha |
| `invite-user` | Convite de usuario |

#### Storage & Arquivos (3 funcoes)
| Funcao | Proposito |
|--------|-----------|
| `r2-upload` | Upload para Cloudflare R2 |
| `r2-delete` | Deletar de R2 |
| `delete-device-files` | Limpeza de arquivos de dispositivo |

#### Outros (5+ funcoes)
| Funcao | Proposito |
|--------|-----------|
| `ml-webhook` | Receiver Mercado Livre |
| `group-manager` | Gestao de grupos WhatsApp |
| `send-csat` | Pesquisa de satisfacao |
| `run-dunning` | Retry de pagamentos falhados |
| `webchat-api` | Widget de chat embarcado |
| `automation-router` / `api-n8n-inbound` | Integracao n8n |

### 3.2 Shared Utilities (_shared/)

| Arquivo | Funcao Principal | Providers |
|---------|-----------------|-----------|
| `ai.ts` | `callAI()`, `callAssistant()`, `callVision()`, `extractExpenseData()` | OpenAI, Anthropic, Gemini |
| `smtp.ts` | `sendEmail()` (auto-detect provider) | SendGrid (SG.*), SMTP2GO |
| `r2.ts` | `uploadToR2()`, `getFromR2()`, `deleteFromR2()` | Cloudflare R2 (AWS Sig V4) |
| `media-processor.ts` | `processMedia()`, `downloadMedia()`, `normalizeMediaData()` | uazapi, WhatsApp CDN |
| `supabase.ts` | Supabase client factory | Supabase |
| `cors.ts` | CORS headers padrao | - |

### 3.3 Redis BullMQ (3 Filas)

| Fila | Host | Proposito |
|------|------|-----------|
| `msg:transactional` | REDIS_CORE_HOST | Mensagens transacionais (1:1) |
| `msg:scheduled` | REDIS_SCHEDULE_HOST | Mensagens agendadas |
| `msg:campaign` | REDIS_CAMPAIGN_HOST | Campanhas em massa |

---

## 4. DIVIDA TECNICA, BUGS E VULNERABILIDADES

### 4.1 CRITICOS (P0) - Correcao Imediata

| # | Area | Descricao | Impacto | Arquivo |
|---|------|-----------|---------|---------|
| P0-1 | **Mensageria** | Avatar mostra badge colorida ao inves de `profile_pic_url` do WhatsApp | UX quebrada - usuarios nao reconhecem contatos | `ConversationItem.tsx` |
| P0-2 | **Mensageria** | Status de leitura (ticks) nao atualiza - fica em 1 tick | Usuarios nao sabem se mensagem foi entregue/lida | `WhatsAppLayout.tsx` (realtime + uazapi-webhook) |
| P0-3 | **Mensageria** | Historico some ao trocar de conversa | UX critica - perda de contexto | `WhatsAppLayout.tsx` (sem cache por conversa) |
| P0-4 | **Mensageria** | Recebimento lento de mensagens (3-15s delay) | Operacao em tempo real comprometida | Realtime subscription + polling interval |
| P0-5 | **RLS** | CORS `Access-Control-Allow-Origin: *` em TODAS Edge Functions | Qualquer dominio pode chamar as funcoes | `_shared/cors.ts` |
| P0-6 | **Seguranca** | `openai_apikey` armazenado em texto claro em `whatsapp_instances` | API key exposta no banco | `whatsapp_instances.openai_apikey` |

### 4.2 ALTOS (P1) - Proximo Sprint

| # | Area | Descricao | Impacto | Arquivo |
|---|------|-----------|---------|---------|
| P1-1 | **Componente** | WhatsAppLayout.tsx com 1.051 linhas monoliticas | Manutenibilidade zero, bugs em cascata | `WhatsAppLayout.tsx` |
| P1-2 | **Componente** | NexusWhitelabels.tsx com 1.327 linhas | Mesma situacao | `NexusWhitelabels.tsx` |
| P1-3 | **Componente** | NexusLicenses.tsx com 1.046 linhas | Mesma situacao | `NexusLicenses.tsx` |
| P1-4 | **Componente** | IntegracoesPage.tsx com 1.171 linhas | Mesma situacao | `IntegracoesPage.tsx` |
| P1-5 | **DB** | `whatsapp_messages` cresce indefinidamente (sem retention/partitioning) | Degradacao de performance, custo de storage | Tabela `whatsapp_messages` |
| P1-6 | **DB** | Tabela `conversations` nunca populada (queries retornam zero) | Feature morta, analytics incorretas | `conversations` |
| P1-7 | **Observabilidade** | Zero telemetria (sem Sentry, DataDog, LogTail) | Bugs em producao invisiveis | Infraestrutura |
| P1-8 | **PWA** | VitePWA desabilitado (Service Worker cacheava assets stale e bloqueava login) | Sem app instalavel, sem offline | `vite.config.ts` |
| P1-9 | **Realtime** | Race condition na deduplicacao de mensagens (Set-based tracking) | Mensagens duplicadas possiveis | `WhatsAppLayout.tsx` ~linha 521 |
| P1-10 | **Type Safety** | Multiplos `(payload as any)`, `(result as any)` no WhatsAppLayout | Bugs de tipo silenciosos | `WhatsAppLayout.tsx` |

### 4.3 MEDIOS (P2) - Backlog Priorizado

| # | Area | Descricao | Arquivo |
|---|------|-----------|---------|
| P2-1 | **NegocioDrawer** | 530 linhas, 8 useState, regex fragil para parsing JSONB `notas` | `NegocioDrawer.tsx` |
| P2-2 | **WizardLayout** | 945 linhas, prompt engineering fragil (concatena texto para Claude) | `WizardLayout.tsx` |
| P2-3 | **ChatInput** | 768 linhas, complexidade de input multi-provider | `ChatInput.tsx` |
| P2-4 | **ChatPanel** | 603 linhas, renderizacao pesada de mensagens | `ChatPanel.tsx` |
| P2-5 | **Error Boundary** | Unico ErrorBoundary no root - nao captura erros async | `ErrorBoundary.tsx` |
| P2-6 | **CDN** | Railway serve assets estaticos diretamente (sem CDN) | Infraestrutura |
| P2-7 | **Tema** | Sem fallback para variavel CSS inexistente em componentes novos | `themes.css` |
| P2-8 | **LicenseFormModal** | 849 linhas com calculo inline de precos | `LicenseFormModal.tsx` |
| P2-9 | **Checkout** | CheckoutPage 638 linhas com logica de pagamento misturada com UI | `CheckoutPage.tsx` |
| P2-10 | **Multi-Provider** | 6 branches de roteamento em `handleSend()` com tratamento de erro inconsistente | `WhatsAppLayout.tsx` |
| P2-11 | **Signature Cache** | useRef cache de assinatura pode ficar stale se usuario editar mid-session | `WhatsAppLayout.tsx` |
| P2-12 | **SLA** | Calculo linear O(n) por conversa (busca first/last incoming) | `WhatsAppLayout.tsx` ~335-356 |
| P2-13 | **Pzaafi** | `create-checkout-payment` com TODO - chamada API do connector NAO implementada | `pzaafi-checkout` Edge Function |
| P2-14 | **Mock Data** | Nomes de agentes hardcoded no Index.tsx | `Index.tsx` |

### 4.4 BAIXOS (P3) - Tech Debt de Longo Prazo

| # | Area | Descricao |
|---|------|-----------|
| P3-1 | Lovable | Referencias residuais de dominio Lovable no codigo |
| P3-2 | Legacy Routes | Rotas top-level duplicadas (`/whatsapp`, `/manual`, etc) fora de `/app/:slug` |
| P3-3 | message_logs | Tabela legada `message_logs` duplica funcao de `whatsapp_messages` |
| P3-4 | whatsapp_leads | Tabela legada, funcionalidade migrada para `crm_contacts` + `whatsapp_contacts` |
| P3-5 | pg_cron | Extensoes pg_cron/pg_net comentadas (desabilitadas) |
| P3-6 | daily_conversation_stats | Materialized view nunca populada |

---

## 5. MAPEAMENTO RLS COMPLETO

### 5.1 Policy Padrao: Strict_Tenant_Isolation

Aplicada em **43+ tabelas**:
```sql
CREATE POLICY "Strict_Tenant_Isolation" ON public.{table} FOR ALL
USING (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()))
WITH CHECK (is_nexus_user() OR tenant_id IN (SELECT get_authorized_tenant_ids()));
```

**Tabelas cobertas:** negocios, financial_entries, crm_contacts, activities, asaas_payments, asaas_customers, asaas_revenue, asaas_expenses, channel_integrations, conversations, chat_messages, whatsapp_connections, whatsapp_groups, group_kanban_columns, group_attributions, sales_pipelines, meta_connections, manual_articles, tutorials, company_profile, icp_profiles, icp_questionnaires, audit_logs, license_history, notifications, + 20 mais.

### 5.2 Policies Especiais

| Tabela | Policy | Condicao |
|--------|--------|----------|
| `profiles` | Profiles_Security | `id = auth.uid() OR is_nexus_user() OR id IN (SELECT user_id FROM user_tenants WHERE tenant_id IN get_authorized_tenant_ids())` |
| `licenses` | Nexus full access | `is_nexus_user()` |
| `licenses` | User view own | `tenant_id IN get_my_tenant_ids()` |
| `tenants` | Nexus manage | `is_nexus_user()` |
| `tenants` | User view own | `id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())` |
| `nexus_*` | Nexus only | `is_nexus_user()` / `get_nexus_role() = 'nexus_superadmin'` |
| `data_lifecycle_*` | Service role only | `auth.role() = 'service_role'` |
| `whitelabel_config` | Hybrid | `is_nexus_user() OR license_id IN (licenses via get_my_tenant_ids())` |

### 5.3 Funcoes de Seguranca Completas

```sql
-- is_nexus_user(): Verifica se o usuario autenticado e admin Nexus ativo
SELECT EXISTS (
  SELECT 1 FROM nexus_users 
  WHERE auth_user_id = auth.uid() AND is_active = true
);

-- get_authorized_tenant_ids(): Retorna todos os tenant_ids acessiveis
-- (diretos via user_tenants + sub-tenants via WhiteLabel parent)
SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
UNION
SELECT l_child.tenant_id FROM licenses l_child
JOIN licenses l_parent ON l_child.parent_license_id = l_parent.id
JOIN user_tenants ut ON ut.tenant_id = l_parent.tenant_id
WHERE ut.user_id = auth.uid() AND ut.is_owner = true 
  AND l_parent.license_type = 'whitelabel';
```

---

## 6. FLUXOS CRITICOS DETALHADOS

### 6.1 Checkout → Ativacao

```
1. Usuario acessa /checkout
2. Seleciona plano (Solo Pro R$49 / Profissional R$199)
3. Preenche dados (nome, CNPJ, email, telefone)
4. Escolhe forma de pagamento
5. POST create-checkout-payment → cria cobranca no Asaas
   └── PIX: retorna qr_code + copy_paste
   └── Boleto: retorna bank_slip_url
   └── Cartao: retorna invoice_url
6. Asaas processa pagamento
7. asaas-webhook recebe PAYMENT_CONFIRMED/PAYMENT_RECEIVED
   └── handleNewAccount():
       a. Cria account + license + activation_token (24h expiry)
       b. Envia email com link /ativar/:token
8. Usuario acessa /ativar/:token
   └── Valida token (nao usado, nao expirado)
   └── Define senha
   └── activate-account: cria auth user + marca token como usado
9. Redireciona para /app/:slug
```

### 6.2 Fluxo de Mensagem (Multi-Canal)

```
RECEBIMENTO:
  Provider → Edge Function webhook → normaliza payload → INSERT whatsapp_messages
  ├── uazapi: uazapi-webhook → normaliza message_id, status, type
  ├── Meta: meta-webhook → extrai phone_number_id → lookup channel_integrations
  ├── Telegram: telegram-webhook → converte chat_id → remote_jid = tg_{chatId}@telegram
  └── ML: ml-webhook → converte pack_id → remote_jid via ml_user_id

REALTIME → FRONTEND:
  Supabase Realtime (postgres_changes) → WhatsAppLayout.tsx
  └── Fallback: polling adaptativo 3s→8s com exponential backoff

ENVIO:
  ChatInput → handleSend() → detecta prefixo de instance_name
  ├── uazapi_*: uazapi-proxy → /send/text
  ├── meta:*: meta-proxy → Graph API v21.0
  ├── telegram_*: telegram-send → Bot API
  ├── mercadolivre_*: ml-send
  └── messenger_*: messenger-send
```

### 6.3 Wizard CRM (Onboarding IA)

```
1. WizardLayout Step 0: Coleta dados da empresa
2. WizardLayout Step 1: Detecta canais ativos (WhatsApp, Meta, Telegram, etc)
3. WizardLayout Steps 2-4: 3 perguntas sobre negocio/dados/processo
4. Concatena respostas → POST generate-crm-schema
   └── callAssistant() com OpenAI Assistants v2
   └── Retorna: pipeline_name, stages, card_schema
   └── callAI() para extras: departments, tags, quick_replies, etc
5. WizardLayout Step 6: Review editavel
   └── Departments: nome editavel, removivel
   └── Tags: removivel
   └── Quick Replies: shortcut/title/body editavel
6. handleFinish():
   └── INSERT sales_pipelines (com card_schema JSONB)
   └── UPSERT departments
   └── UPSERT tenant_tags
   └── DELETE + INSERT quick_replies
   └── UPDATE company_profile.wizard_completed = true
```

---

## 7. COMPONENTES CRITICOS (TOP 20 POR TAMANHO)

| # | Linhas | Arquivo | Categoria |
|---|--------|---------|-----------|
| 1 | 3.884 | `supabase/types.ts` | Types (auto-gerado) |
| 2 | 1.327 | `nexus/NexusWhitelabels.tsx` | Admin |
| 3 | 1.171 | `IntegracoesPage.tsx` | Config |
| 4 | 1.051 | `whatsapp/WhatsAppLayout.tsx` | Mensageria |
| 5 | 1.046 | `nexus/NexusLicenses.tsx` | Admin |
| 6 | 945 | `sales/wizard/WizardLayout.tsx` | CRM |
| 7 | 849 | `nexus/LicenseFormModal.tsx` | Admin |
| 8 | 768 | `whatsapp/chat/ChatInput.tsx` | Mensageria |
| 9 | 748 | `lib/digitalAnalysisHtmlGenerator.ts` | Intelligence |
| 10 | 650 | `ProductsPage.tsx` | Catalogo |
| 11 | 638 | `CheckoutPage.tsx` | Pagamento |
| 12 | 637 | `ui/sidebar.tsx` | UI |
| 13 | 626 | `layout/AppSidebar.tsx` | Layout |
| 14 | 619 | `vendas/NegocioCreateModal.tsx` | CRM |
| 15 | 608 | `nexus/NexusCheckouts.tsx` | Admin |
| 16 | 606 | `nexus/NexusLifecycle.tsx` | Admin |
| 17 | 605 | `UsersPage.tsx` | Usuarios |
| 18 | 604 | `nexus/NexusLicenseDetail.tsx` | Admin |
| 19 | 603 | `whatsapp/panels/ChatPanel.tsx` | Mensageria |
| 20 | 567 | `settings/CheckoutIntegrationsCard.tsx` | Config |

**Total de componentes >300 linhas: 69**

---

## 8. SISTEMA DE PERMISSOES

### 8.1 Matriz de Roles x Modulos

| Modulo | superadmin | admin | gestor | financeiro | consultor | representante |
|--------|-----------|-------|--------|-----------|-----------|--------------|
| dashboard | CRUD+E | CRUD+E | V | V | V | V |
| vendas | CRUD+E | CRUD+E | CRUD+E | V | CRUD | CRU (proprio) |
| cobrancas | CRUD+E | CRUD+E | V | CRUD+E | V | V |
| comissoes | CRUD+E | CRUD+E | V | CRUD+E | V | V |
| receitas | CRUD+E | CRUD+E | V | CRUD+E | - | - |
| despesas | CRUD+E | CRUD+E | V | CRUD+E | - | - |
| clientes | CRUD+E | CRUD+E | CRUD+E | V | CRUD | CRU |
| produtos | CRUD+E | CRUD+E | CRUD | V | V | V |
| fiscal | CRUD+E | CRUD+E | V | CRUD+E | - | - |
| intelligence | CRUD+E | CRUD+E | CRUD | - | V | - |
| relatorios | CRUD+E | CRUD+E | V+E | V+E | V | V |
| configuracoes | CRUD | CRUD | V | V | - | - |
| usuarios | CRUD | CRUD | V | - | - | - |
| mensageria | CRUD+E | CRUD+E | CRUD | - | CRUD | CRU |

*V=View, C=Create, R=Read, U=Update, D=Delete, E=Export*

### 8.2 Guards do Frontend

| Guard | Proposito | Usado Em |
|-------|-----------|----------|
| `AuthGuard` | Redireciona nao-autenticados para /login | Todas rotas protegidas |
| `PublicRoute` | Redireciona autenticados para fora | /login, /signup, etc |
| `ProtectedRoute(module)` | Verifica permissao do modulo | Rotas /app/:slug/* |
| `PermissionGate` | Esconde elementos UI sem permissao | Botoes, menus, formularios |
| `NexusProvider` | Contexto Nexus + verificacao nexus_users | /nexus/* |

---

## 9. RECOMENDACOES PRIORIZADAS

### Sprint Imediato (Homologacao)

1. **P0-1 a P0-4:** Corrigir os 4 bugs de mensageria (avatar, ticks, cache, velocidade)
2. **P1-1:** Refatorar WhatsAppLayout.tsx extraindo:
   - `useConversations()` hook
   - `useMessages()` hook com cache Map por conversa
   - `useRealtimeSync()` hook
   - `useMessageRouting()` hook (multi-provider send)
3. **P0-5:** Restringir CORS para dominios conhecidos (app.whatsflow.com.br, *.whatsflow.com.br)
4. **P0-6:** Mover `openai_apikey` para `ai_configurations` (ja existe) e remover coluna de `whatsapp_instances`

### Sprint Seguinte

5. **P1-5:** Implementar retention policy para `whatsapp_messages` (partitioning por mes ou archival)
6. **P1-7:** Integrar Sentry para error tracking (frontend + Edge Functions)
7. **P1-6:** Popular ou remover tabela `conversations` (decidir se usa `chat_messages` + `conversations` ou `whatsapp_messages` unificado)
8. **P1-8:** Reabilitar PWA com estrategia de cache correta (network-first para auth, cache-first para assets)

### Backlog Estrutural

9. Decompor NexusWhitelabels.tsx (1.327 linhas)
10. Decompor NexusLicenses.tsx (1.046 linhas)
11. Adicionar ErrorBoundary por rota/modulo (nao apenas root)
12. Configurar CDN (Cloudflare Pages ou similar) para assets estaticos
13. Limpar tabelas legadas (message_logs, whatsapp_leads se migradas)
14. Implementar pg_cron para `queue_files_for_encryption()` (LGPD compliance)

---

*Documento gerado em 2026-03-31 por Antigravity Engine v1.0*  
*Base de codigo: f:/WFW New (branch main, commit a1e2202)*
