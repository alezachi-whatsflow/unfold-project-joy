# IAZIS Platform - Relatorio Tecnico de Arquitetura

**Data**: 11 de Abril de 2026
**Versao**: 1.0
**Classificacao**: Confidencial Interno

---

## 1. VISAO GERAL

O IAZIS e uma plataforma SaaS multi-tenant de gestao empresarial inteligente com foco em comunicacao omnicanal, CRM, financeiro e automacao com I.A. Opera sob o modelo de 3 camadas hierarquicas:

```
Admin Core (IAZIS)
  |-- Partner WhiteLabel (ex: Whatsflow)
  |     |-- Tenant (ex: EVOLVE, Primage)
  |     |     |-- Usuarios (atendentes, gestores)
  |     |-- Tenant N...
  |-- Partner WhiteLabel N...
  |-- Licenca Interna (dev/testes)
```

---

## 2. STACK TECNOLOGICA

### 2.1 Frontend

| Tecnologia | Versao | Funcao |
|------------|--------|--------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool + HMR |
| TailwindCSS | 3.4.17 | Utility-first CSS |
| Shadcn/UI + Radix | 1.x | Component library |
| TanStack Query | 5.83.0 | Server state management |
| React Router DOM | 6.30.1 | Routing SPA |
| React Hook Form + Zod | 7.61 / 3.25 | Forms + validation |
| Recharts | 2.15.4 | Graficos/dashboards |
| jsPDF + html2canvas | 4.2 / 1.4 | Export PDF |
| Lucide React | 0.462.0 | Iconografia |
| Sonner | 1.7.4 | Toast notifications |

**Metricas do Frontend:**
- 399 componentes (.tsx)
- 195 modulos TypeScript (.ts)
- 96 paginas
- 34 hooks customizados
- 100 rotas no React Router
- 3 temas visuais (Cafe Noturno, Pacifico, Cosmos)
- Fonte: Inter (body) + Geist Mono (brand core) + Readex Pro (WL Whatsflow)

### 2.2 Backend (Orquestrador de Filas)

| Tecnologia | Versao | Funcao |
|------------|--------|--------|
| Node.js | 20 LTS (Alpine) | Runtime |
| Express | 5.0.0 | HTTP framework |
| BullMQ | 5.0.0 | Job queue |
| IORedis | 5.4.0 | Redis client |
| Socket.io | 4.7.0 | WebSocket realtime |
| TypeScript | 5.8.0 | Type safety |

### 2.3 Banco de Dados

| Tecnologia | Versao | Funcao |
|------------|--------|--------|
| PostgreSQL | 15 | Banco relacional principal |
| Supabase | Self-hosted | BaaS (Auth, Storage, Realtime, Edge Functions) |
| PostgREST | - | API REST automatica |
| GoTrue | - | Auth (JWT, OAuth, MFA) |

**Metricas do Banco:**
- 159 tabelas
- 262 politicas RLS (Row Level Security)
- 141 migrations SQL
- 16 tabelas com Realtime habilitado
- 3 buckets de Storage (chat-attachments, expense-attachments, avatars)

### 2.4 Cache e Filas

| Tecnologia | Versao | Funcao | Memoria |
|------------|--------|--------|---------|
| Redis | 7.4 Alpine | Cache + Job Queue | - |
| redis-core | - | Mensagens 1:1, chatbot, webhooks, DLQ | 512 MB |
| redis-schedule | - | Agendamentos, follow-ups, reminders | 256 MB |
| redis-campaign | - | Envios em massa (10k+ dest.) | 1 GB |
| Redis Insight | - | Monitoring UI | - |

Persistencia: AOF (Append Only File) com fsync a cada segundo.

### 2.5 Edge Functions (Serverless)

| Tecnologia | Versao | Funcao |
|------------|--------|--------|
| Deno | Latest (Supabase) | Runtime serverless |
| TypeScript | - | Language |
| Supabase Edge Runtime | - | Deployment |

**Total: 65 Edge Functions ativas** + 1 diretorio _shared com utilitarios.

### 2.6 Microservicos

| Servico | Runtime | Framework | Porta | Funcao |
|---------|---------|-----------|-------|--------|
| message-queue | Node 20 | BullMQ 5.34 | 3100 | Worker de filas de mensagem |
| telegram-service | Node 20 | Express 4.21 | 3100 | MTProto (GramJS) |
| audio-converter | Docker | ffmpeg | 3200 | WebM → OGG para Meta Cloud API |

---

## 3. INFRAESTRUTURA E SERVIDORES

### 3.1 Ambientes

| Servico | Provedor | SO | Tipo |
|---------|----------|----|------|
| Frontend (SPA) | Railway | Alpine Linux (Docker) | Container |
| Supabase (DB + Auth + Edge) | Self-hosted VPS | Ubuntu 22.04 | VM dedicada |
| Redis (3 instancias) | VPS | Alpine Linux (Docker) | Container |
| Telegram MTProto | VPS (Docker) | Alpine Linux | Container |
| Audio Converter | VPS (Docker) | Alpine Linux + ffmpeg | Container |
| Message Queue Worker | VPS (Docker) | Alpine Linux | Container |

### 3.2 Networking

- Redis acessivel via IPv6: `2804:8fbc:0:5::a152` (portas 16379/16380/16381)
- Supabase: `supabase.whatsflow.com.br` (HTTPS, certificado valido)
- Frontend: Railway auto-deploy via push no branch `main`
- Docker network: `supabase_default` para comunicacao interna

### 3.3 Build e Deploy

```
git push origin main
  |
  +--> Railway (Frontend)
  |     |-- Docker build (node:20-alpine)
  |     |-- npm ci + npm run build (Vite)
  |     |-- serve -s dist (static hosting)
  |     |-- Auto-deploy em ~60s
  |
  +--> Supabase (Edge Functions)
        |-- Deploy via supabase functions deploy
        |-- Deno runtime serverless
```

---

## 4. COMUNICACAO ENTRE SERVICOS

### 4.1 Diagrama de Fluxo

```
[Cliente Browser]
      |
      | HTTPS (React SPA)
      v
[Railway: Frontend]
      |
      | Supabase JS Client (PostgREST + Auth + Realtime)
      v
[Supabase Self-Hosted]
  |-- PostgREST -----> [PostgreSQL 15]
  |-- GoTrue --------> [Auth + JWT]
  |-- Realtime ------> [WebSocket push, 16 tabelas]
  |-- Storage -------> [S3-compat buckets]
  |-- Edge Functions -> [65 serverless functions]
        |
        |-- [OpenAI API] (Vision, Assistants, Chat)
        |-- [Anthropic API] (Claude, Vision)
        |-- [Google APIs] (Calendar OAuth, Business)
        |-- [Meta Graph API] (WhatsApp Cloud, Instagram)
        |-- [Asaas API] (Pagamentos, Cobrancas)
        |-- [Uazapi API] (WhatsApp Web)
        |-- [Firecrawl] (Web scraping)
        |-- [Telegram MTProto] (via microservico)
        |
[Redis Core/Schedule/Campaign]
      ^
      |
[BullMQ Worker] <--- Processa filas de mensagens
      |
      v
[PostgreSQL] (grava resultados)
```

### 4.2 Protocolos de Comunicacao

| De | Para | Protocolo | Autenticacao |
|----|------|-----------|-------------|
| Browser | Supabase | HTTPS + WSS | JWT (anon key + access token) |
| Edge Function | PostgreSQL | Internal TCP | Service Role Key |
| Edge Function | APIs externas | HTTPS | API Keys (per-tenant ou global) |
| Edge Function | Uazapi | HTTPS | Instance Token |
| Webhook inbound | Edge Function | HTTPS POST | Verify Token / HMAC |
| BullMQ Worker | Redis | TCP (IORedis) | Password |
| BullMQ Worker | Supabase | HTTPS | Service Role Key |
| Frontend | Realtime | WebSocket (WSS) | JWT |

### 4.3 Webhooks (Inbound)

| Origem | Edge Function | Eventos |
|--------|---------------|---------|
| WhatsApp (uazapi) | uazapi-webhook | Mensagens, status, presenca |
| Meta Cloud API | meta-webhook | Mensagens, status, template |
| Asaas | asaas-webhook | Pagamentos, cobrancas |
| Telegram | telegram-webhook | Mensagens |
| MercadoLivre | ml-webhook | Mensagens, pedidos |
| Google Calendar | google-calendar-callback | OAuth callback |
| n8n | api-n8n-inbound | Custom workflows |

---

## 5. SEGURANCA

### 5.1 Multi-Tenancy

- **RLS (Row Level Security)**: 262 politicas ativas
- Toda query filtrada por `tenant_id` via funcao `get_my_tenant_ids()`
- Frontend usa `useTenantId()` hook que resolve tenant do URL slug
- Edge Functions usam Service Role Key mas filtram por tenant do JWT
- Dados de um tenant NUNCA visíveis para outro tenant

### 5.2 Autenticacao

- GoTrue (Supabase Auth): JWT com refresh token
- MFA disponivel
- OAuth: Google, Meta (WhatsApp Business)
- Roles: `god_admin`, `wl_admin`, `wl_support`, `admin`, `user`, `attendant`
- Permissoes granulares por modulo (CRUD por funcionalidade)

### 5.3 Criptografia

- HTTPS em todos os endpoints (TLS 1.3)
- API keys criptografadas no banco (asaas_connections.api_key)
- Tokens OAuth armazenados com refresh automatico
- Storage: acesso publico controlado por politicas RLS

---

## 6. PREVISAO DE PROCESSAMENTO POR TENANT

### 6.1 Estimativa de Recursos por Tenant Ativo

| Recurso | Por Tenant/mes | Notas |
|---------|----------------|-------|
| Mensagens WhatsApp | 1.000 - 50.000 | Depende do plano (10k default) |
| Edge Function calls | ~5.000 - 20.000 | Webhooks + API calls + AI |
| DB rows (mensagens) | ~10.000 - 100.000 | Acumulativo |
| DB rows (leads) | ~100 - 5.000 | - |
| Storage | 100 MB - 1 GB | Anexos de chat + NFs |
| Redis operations | ~10.000 - 50.000 | Filas de mensagem |
| AI API calls (OpenAI) | ~50 - 500 | Depende de skills ativas |

### 6.2 Capacidade Estimada do Sistema Atual

| Componente | Limite | Gargalo |
|------------|--------|---------|
| PostgreSQL | ~500 tenants ativos simultaneos | Conexoes + RLS overhead |
| Redis Core (512MB) | ~100 filas simultaneas | Memoria |
| Redis Campaign (1GB) | ~10 campanhas de 10k simultaneas | Memoria |
| Edge Functions | ~1000 req/s (Supabase tier) | Cold start ~200ms |
| Frontend (Railway) | Ilimitado (static SPA) | CDN caching |
| Storage | Depende do disco VPS | Migrar para S3/R2 em escala |

### 6.3 Para Escalar a 1.000+ Tenants

| Acao | Prioridade | Impacto |
|------|-----------|---------|
| Conexao pooling (PgBouncer) | Alta | 10x mais conexoes |
| Redis Cluster | Media | Eliminacao de gargalo de memoria |
| Edge Function warm pools | Media | Latencia -50% |
| CDN para Storage (R2/CloudFront) | Media | Bandwidth ilimitado |
| Read replicas PostgreSQL | Baixa | Queries pesadas isoladas |
| Particionamento de whatsapp_messages | Media | Performance em tabelas >10M rows |

---

## 7. INTEGRACOES EXTERNAS

### 7.1 APIs Conectadas

| Servico | Tipo | Funcao | Edge Functions |
|---------|------|--------|----------------|
| **OpenAI** | AI | Vision, Assistants, Chat completions | 9 |
| **Anthropic** | AI | Claude Vision (fallback/alternativa) | 1 |
| **Google** | Calendar + Business | Sync atividades, scraping | 4 |
| **Meta** | WhatsApp Cloud + Instagram | Mensageria oficial | 11 |
| **Asaas** | Pagamentos | PIX, Boleto, Cartao, Split | 6 |
| **Uazapi** | WhatsApp Web | Conexao nao-oficial | 5 |
| **Telegram** | MTProto | Bot + canal messaging | 3 |
| **MercadoLivre** | Marketplace | Mensagens + pedidos | 3 |
| **Firecrawl** | Web scraping | Prospeccao + analise digital | 2 |
| **Typebot** | Chatbot | Flow builder integration | 2 |
| **n8n** | Automacao | Workflow custom | 1 |
| **Cloudflare R2** | Storage | Objetos/arquivos externos | 2 |
| **SendGrid** | Email | Transacional | 1 |

**Total: 13 integracoes externas, 50+ Edge Functions dedicadas**

---

## 8. MODULOS FUNCIONAIS

| Modulo | Componentes | Tabelas | Descricao |
|--------|-------------|---------|-----------|
| **Caixa de Entrada** | 45+ | 8 | Inbox omnicanal (WhatsApp, Telegram, Meta) |
| **CRM/Vendas** | 30+ | 12 | Pipeline, negocios, atividades, clientes |
| **Financeiro** | 25+ | 15 | Receitas, despesas, DRE, cobrancas |
| **Mensageria** | 20+ | 10 | Campanhas, modelos, cadencias, HSM |
| **Admin Core (Nexus)** | 15+ | 8 | Licencas, tenants, feature flags |
| **WhiteLabel** | 10+ | 4 | Branding, sub-licencas, painel partner |
| **IAZIS (Pagamentos)** | 20+ | 22 | Checkout, split, ledger, KYC |
| **Inteligencia** | 10+ | 6 | Prospeccao, analise digital, ICP |
| **Fiscal** | 5+ | 4 | Notas fiscais, tributos, certificados |
| **Comissoes** | 5+ | 3 | Regras, fechamento, dashboard |
| **Suporte** | 5+ | 4 | Tickets, knowledge base, manual |

---

## 9. NUMEROS DO SISTEMA

| Metrica | Valor |
|---------|-------|
| Componentes React (.tsx) | 399 |
| Modulos TypeScript (.ts) | 195 |
| Paginas | 96 |
| Rotas | 100 |
| Hooks customizados | 34 |
| Edge Functions | 65 |
| Migrations SQL | 141 |
| Tabelas PostgreSQL | 159 |
| Politicas RLS | 262 |
| Tabelas com Realtime | 16 |
| Buckets Storage | 3 |
| Integracoes externas | 13 |
| Variaveis de ambiente | 44+ |
| Temas visuais | 3 |
| Microservicos Docker | 3 |
| Instancias Redis | 3 |

---

## 10. SISTEMA OPERACIONAL DOS SERVIDORES

| Servico | OS | Imagem Base |
|---------|----|----|
| Frontend (Railway) | Alpine Linux 3.19 | node:20-alpine |
| Supabase (VPS) | Ubuntu 22.04 LTS | Docker containers |
| PostgreSQL | Ubuntu 22.04 (host) | supabase/postgres:15 |
| Redis (3x) | Alpine Linux | redis:7.4-alpine |
| Telegram MTProto | Alpine Linux | node:20-alpine + tini |
| Audio Converter | Alpine Linux | node:20-alpine + ffmpeg |
| Message Queue Worker | Alpine Linux | node:20-alpine + tini |

**Padrao**: Todos os containers usam Alpine Linux para minimo footprint (~5MB base).
**Seguranca**: Containers rodam com usuario nao-root (`appuser`) + tini como init process.

---

*Documento gerado automaticamente a partir da analise do codebase em 11/04/2026.*
*IAZIS — Ambient Intelligence*
