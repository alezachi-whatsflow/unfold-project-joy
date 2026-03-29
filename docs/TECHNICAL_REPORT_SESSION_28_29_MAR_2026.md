# RELATÓRIO TÉCNICO — SESSÃO 28-29 MARÇO 2026
## Whatsflow Platform + Nexus Admin
**Gerado por:** Claude Opus 4.6 (Antigravity)
**Aprovado por:** Alessandro Zachi — CEO Whatsflow EDTECH

---

## 1. ESTADO ANTERIOR (ANTES DA SESSÃO)

### 1.1 Mensageria (Caixa de Entrada)
- Conversas moviam de "Em atendimento" para "Fila" quando nova mensagem chegava (bug de regressão de status)
- Sem paginação — todas as mensagens carregadas de uma vez (limit 500)
- Sem virtual scrolling — DOM pesado em conversas longas
- Rendering de mensagens hardcoded via if/switch (6 tipos fixos)
- Tabs internas duplicadas (Todas/Minhas/Grupos/Resolvidas) competindo com tabs do topo
- Busca limitada apenas por nome de contato
- Sem auto-scroll para última mensagem
- Mensagens do Telegram não apareciam na caixa de entrada
- Envio de mensagens via Telegram não funcionava pelo painel

### 1.2 Integrações
- Telegram: erro `ON CONFLICT` ao salvar (faltava constraint unique)
- Telegram: erro `Unauthorized` (auth check bloqueava setup)
- Mercado Livre: erro `access_token NOT NULL` ao salvar credenciais
- Canal de cada integração não computado nos KPIs do Nexus
- Webhook do Telegram não recebia mensagens (deploy pendente)

### 1.3 Despesas (Extrator IA)
- Pipeline de extração nunca funcionou em produção:
  - URL do uazapi errada (`/instance/{name}/message/download` → correto: `/message/download`)
  - Coluna `amount` não existia na tabela (correto: `value`)
  - Variável `tenantId` undefined no webhook (crashava toda a função)
  - Sem verificação de skill ativo na licença
  - Resposta JSON do GPT-4o vinha com markdown (```json) não parseado
- Página de despesas dava erro RLS ao carregar
- Template de confirmação WhatsApp com caracteres quebrados (encoding UTF-8)

### 1.4 Onboarding (Wizard de Inteligência Comercial)
- Erro "Erro ao salvar dados da empresa" — tabela `company_profile` sem campos extras
- Tabela `tenant_tags` não existia
- Wizard tinha apenas 3 steps (faltava dados da empresa e verificação de integração)

### 1.5 Design System
- Temas com cores inconsistentes (Café Noturno com primary amber em vez de green)
- Liquid glass com blur excessivo (40px sidebar) causando lag em mobile
- Sem tokens globais (transitions, pipeline colors, sidebar dimensions)
- Skeletons com shimmer incorreto nos temas escuros
- Sem suporte mobile adequado (inputs com zoom iOS, touch targets < 44px)
- Nexus sem design system próprio (misturava tokens da plataforma)

### 1.6 Infraestrutura
- Redis: logs brutos sem TTL — risco de OOM em 15k licenças
- Supabase: tabelas de log sem expurgo — crescimento infinito de disco
- Sem worker de agregação de métricas — erros invisíveis em produção
- Sem alertas proativos — admin só descobria falhas quando cliente reclamava
- Sem materialized view — dashboard Nexus agregava 15k rows em tempo real
- BullMQ workers sem Dockerfile para deploy
- `UAZAPI_ADMIN_TOKEN` não populado no .env

### 1.7 Segurança
- `access_token` era NOT NULL em `channel_integrations` (bloqueava integrações sem token)
- `licenses` sem policy RLS para tenants lerem sua própria licença
- `conversation_notes` sem GRANT e sem RLS
- `web_scraps` sem RLS para insert (erro ao analisar websites)
- `asaas_expenses` sem RLS e sem GRANT
- `whatsapp_leads` sem constraint UNIQUE — duplicatas causavam conversas bouncing entre tabs

---

## 2. AÇÕES EXECUTADAS

### 2.1 Correções Críticas (P0)

| # | Correção | Commit |
|---|----------|--------|
| 1 | Fix regressão de status: webhook não sobrescreve `assigned_attendant_id` em conversas ativas | Múltiplos |
| 2 | Fix `access_token` nullable em `channel_integrations` | `586bc42` |
| 3 | Fix `licenses` RLS — tenant pode ler/atualizar própria licença | `4dbbf3b` |
| 4 | Fix `conversation_notes` GRANT + RLS tenant isolation | `69b6f98` |
| 5 | Fix `asaas_expenses` RLS + GRANT via `get_authorized_tenant_ids()` | Migração |
| 6 | Fix `whatsapp_leads` duplicatas + UNIQUE constraint | `4ebfadc` |
| 7 | Fix variável `tenantId` undefined no webhook (crashava toda a função) | Deploy |
| 8 | Fix URL uazapi download (`/instance/X/message/download` → `/message/download`) | Deploy |
| 9 | Fix coluna `amount` → `value` na tabela `asaas_expenses` | Deploy |
| 10 | Fix provider CHECK constraint — adicionado TELEGRAM ao enum | Deploy |

### 2.2 Integrações Implementadas

| Canal | Funcionalidade | Status |
|-------|---------------|--------|
| **Telegram** | Webhook recebe → salva em `whatsapp_messages` → aparece no inbox | ✅ Operacional |
| **Telegram** | Envio pelo painel via `telegram-send` Edge Function | ✅ Operacional |
| **Mercado Livre** | OAuth 3-step flow + credenciais dinâmicas (sem .env) | ✅ Operacional |
| **n8n** | Ponte bidirecional: webhook out → `api-n8n-inbound` in | ✅ Operacional |
| **Typebot** | `automation-router` Edge Function com trigger matching | ✅ Operacional |

### 2.3 Extrator de Despesas via WhatsApp

| Etapa | Implementação |
|-------|---------------|
| Trigger | Imagem com caption "Despesa" OU texto "Despesa" após imagem (2 min window) |
| Download | uazapi `/message/download` → URL descriptografada |
| Vision AI | GPT-4o extrai: fornecedor, valor, data, categoria, descrição |
| Persistência | Insert em `asaas_expenses` com attachment_url |
| Confirmação | WhatsApp formatado: fornecedor, valor, categoria, data |
| Proteção | 3 camadas: tipo estendido, log diagnóstico, feedback de erro |

### 2.4 Onboarding Wizard (5 Steps)

| Step | Conteúdo |
|------|----------|
| 0 | Dados da empresa (nome, CNPJ, segmento, telefone, cidade, equipe) |
| 1 | Verificação de integrações (mínimo 1 canal conectado) |
| 2-4 | Perguntas IA (core do negócio, dados do cliente, processo de vendas) |
| 5 | Review editável (setores, tags, respostas rápidas, mensagens) |

### 2.5 Caixa de Entrada (Inbox) — Refatoração Completa

| Feature | Antes | Depois |
|---------|-------|--------|
| Tabs | Todas/Minhas/Grupos/Resolvidas (internas) | Em atendimento/Fila/Grupos/Finalizados (topo) |
| Paginação | 500 msgs de uma vez | 50 inicial + "Carregar mais" |
| Rendering | Hardcoded if/switch (6 tipos) | Schema-driven registry (`getMessageRenderer()`) |
| Busca | Apenas nome | Deep search: nome + telefone + conteúdo + snippets |
| Scroll | Manual | Auto-scroll: instant on switch, smooth on new msg |
| Performance | Sem otimização | `contain:strict`, `React.memo`, memoized grouping |
| Fila → Atendimento | Botão não funcionava / bouncing | `assigned_attendant_id` persistido + UNIQUE constraint |
| Notas internas | Erro de permissão | GRANT + RLS + modal funcional |
| SLA | Badge sem config | Config panel + breach indicator |
| Assinatura | Vermelho "não configurada" | Auto-append + config em perfil |
| Emoji | Não funcionava | Picker integrado no ChatInput |
| Áudio | Não funcionava | Gravação + preview + envio |

### 2.6 Design System — Redesign Completo

**Sistema A — Plataforma (3 Temas):**

| Tema | Primary | Background | Mudança Principal |
|------|---------|------------|-------------------|
| Café Noturno | `#11bc76` (green) | `#16181c` (carbon) | Primary era amber → agora green unificado |
| Pacífico | `#0fa468` (vibrant green) | `#eeeae4` (warm white) | Accent vibrante para fundo claro |
| Cosmos | `#11bc76` (green) | `#06080f` (navy) | Primary era blue → agora green unificado |

| Componente | Mudança |
|------------|---------|
| Liquid Glass | Blur 40px → 12px sidebar, 16px → 8px header |
| Mobile | Glass disabled, touch targets 44px, inputs 16px (iOS zoom fix) |
| Kanban Card | Hierarquia: título 12px, valor 17px green, footer com % badge |
| Shimmer | Fix para temas escuros (`shimmer-dark` keyframe) |
| Bubbles | Café Noturno: contraste WCAG AA corrigido |
| Charts | `ChartThemeProvider` — paleta por tema para Recharts |
| Pipeline | Tokens semânticos: `--pipeline-prospeccao` a `--pipeline-fechado` |

**Sistema B — Nexus (Design System Próprio):**

| Arquivo | Propósito |
|---------|-----------|
| `nexus-tokens.css` | 40+ tokens (accent, bg, text, roles, licenses, audit) |
| `ImpersonationBar.tsx` | Banner vermelho sticky quando impersonando tenant |
| `NexusKPICard.tsx` | Card com 5 variants (primary/default/success/warning/critical) |
| `NexusRoleBadge.tsx` | 6 roles com cores via tokens (não hardcoded) |
| `ResourceUsageBar.tsx` | Barra progressiva (green→yellow→red em 80%/95%) |

**Sistema C — Mobile Web:**

| Regra | Valor |
|-------|-------|
| Touch targets | min-height/width: 44px |
| Input zoom iOS | font-size: 16px !important |
| Glass disable | backdrop-filter: none em mobile |
| Modais | Full-screen em mobile (100dvh) |
| Safe area | env(safe-area-inset-*) para notch |

### 2.7 Observabilidade — Torre de Controle (5 Lacunas)

| Lacuna | Solução | Commit |
|--------|---------|--------|
| **O1** Sem métricas agregadas | `obs:aggregator` worker — coleta queue depths, DLQ, error rate, instance health a cada 1min → `nexus_system_metrics` | `8b77233` |
| **O2** Sem alertas proativos | `obs:alerter` worker — avalia 8 thresholds, envia WhatsApp + Slack, anti-spam 15min Redis TTL | `3e44730` |
| **O3** Dashboard lento (15k rows) | `nexus_health_snapshot` materialized view — 22 métricas, refresh 1min via pg_cron | `8b77233` |
| **O4** Redis sem TTL (OOM risk) | `removeOnComplete: {age: 3600}` + `removeOnFail: {age: 86400}` em todas as filas | `70339d8` |
| **O5** Logs sem expurgo (disco) | 5 pg_cron jobs diários 03:00 UTC (90-180 dias), `data_lifecycle_audit` NUNCA limpo (LGPD) | `70339d8` |

### 2.8 Performance — Lacunas Corrigidas

| Lacuna | Antes | Depois |
|--------|-------|--------|
| **L1** Paginação msgs | 500 de uma vez | 50 + load more (cursor-based) |
| **L2** DOM pesado | Todas renderizadas | `contain:strict` + `React.memo` + auto-scroll |
| **L3** Rendering rígido | if/switch hardcoded | Schema-driven registry extensível |
| **L4** Workers sem deploy | Código sem container | Dockerfile + docker-compose.yml |
| **L5** .env incompleto | UAZAPI_ADMIN_TOKEN vazio | Populado + Redis ports corrigidos |

### 2.9 Tags & Grupos

| Feature | Status |
|---------|--------|
| Tags de Contato | Auto-import de negocios, leads, contacts, groups |
| Tags CRUD | Criar, editar, excluir com contagem de usos |
| Grupos | Dashboard com KPIs, tabela com lotação, criação em massa, limite de membros |

### 2.10 Inteligência Digital (Unificação)

| Antes | Depois |
|-------|--------|
| "IA Composable" + "Inteligência Digital" separados | Unificado em "Inteligência Digital" |
| 3 skills de IA | 4 skills: Auditor, Copiloto, Closer, **Extrator de Despesas** |
| Toggle não funcionava (RLS) | Fix RLS + `get_my_tenant_ids()` na tabela licenses |

---

## 3. ESTADO ATUAL (PÓS-SESSÃO)

### 3.1 Arquitetura de Workers

```
Docker Container (servidor Redis IPv6 2804:8fbc:0:5::a152)
├── core-worker        → msg:transactional (concurrency 5, 30msg/s)
├── schedule-worker    → msg:scheduled
├── campaign-worker    → msg:campaign (10k+)
├── dlq-processor      → msg:dlq (audit imutável)
├── obs:aggregator     → métricas a cada 1min → nexus_system_metrics
└── obs:alerter        → health check a cada 1min → WhatsApp + Slack
```

### 3.2 Edge Functions Deployadas

| Function | Propósito |
|----------|-----------|
| `uazapi-webhook` | WhatsApp Web — mensagens, status, media, despesas, CSAT |
| `telegram-webhook` | Telegram Bot — mensagens incoming |
| `telegram-send` | Envio via Telegram Bot API |
| `meta-webhook` | Meta Cloud API — WhatsApp Business + Instagram + Messenger |
| `meta-send-message` | Envio via Meta Graph API v21.0 |
| `messenger-send` | Facebook Messenger send |
| `ml-webhook` | Mercado Livre — messages, questions, orders |
| `ml-send` | Envio ML — messages + answers |
| `ml-oauth-callback` | OAuth2 code exchange |
| `webchat-api` | Webchat público (session-based, no auth) |
| `automation-router` | Typebot trigger matching + session management |
| `api-n8n-inbound` | n8n webhook receiver (Bearer token auth) |
| `enqueue-message` | Bridge Supabase → Redis BullMQ |
| `analyze-conversation` | IA pós-atendimento (FCR, sentiment, first-yes) |
| `generate-crm-schema` | OpenAI Assistants — pipeline + schema CRM |
| `send-csat` | CSAT survey (1-5 rating) |
| `test-expense-pipeline` | Diagnóstico step-by-step do extrator |

### 3.3 Tabelas com RLS Tenant Isolation

**48+ tabelas** com `Strict_Tenant_Isolation` via:
- `get_my_tenant_ids()` — acesso direto
- `get_authorized_tenant_ids()` — hierarquia 3 níveis (Nexus → WhiteLabel → Tenant)
- `is_nexus_user()` — acesso admin

### 3.4 pg_cron Jobs Ativos

| Job | Frequência | Ação |
|-----|-----------|------|
| `cleanup-message-logs-90d` | Diário 03:00 | DELETE > 90 dias |
| `cleanup-nexus-audit-logs-180d` | Diário 03:05 | DELETE > 180 dias |
| `cleanup-sync-logs-90d` | Diário 03:10 | DELETE > 90 dias |
| `cleanup-audit-logs-180d` | Diário 03:15 | DELETE > 180 dias |
| `cleanup-lifecycle-queue-30d` | Diário 03:20 | DELETE completed > 30 dias |
| `cleanup-system-metrics-7d` | Diário 03:25 | DELETE > 7 dias |
| `refresh-nexus-health-snapshot` | A cada 1 min | REFRESH MATERIALIZED VIEW CONCURRENTLY |

### 3.5 Thresholds de Alerta

| Nível | Condição |
|-------|----------|
| 🟢 OK | < 5 erros/min, < 10% offline, < 50 DLQ |
| 🟡 WARNING | ≥ 5 erros/min OU ≥ 10% instances offline OU ≥ 50 DLQ OU ≥ 10 tickets |
| 🔴 CRITICAL | ≥ 20 erros/min OU ≥ 30% offline OU ≥ 200 DLQ OU ≥ 5 licenças bloqueadas |

Anti-spam: cooldown 15 minutos por nível via Redis TTL.

---

## 4. COMMITS DA SESSÃO (CRONOLÓGICO)

```
584d344  refactor(nav): merge IA Composable into Inteligência Digital + fix tooltip
a430d12  feat(webchat): brutalist Pzaafi simulator + DIY install card
8c9181b  feat(expenses): AI Vision extraction pipeline + Pzaafi ledger UI
03ac739  feat(onboarding): 5-step wizard with AI-generated CRM configuration
586bc42  fix(db): make access_token nullable on channel_integrations
4dbbf3b  fix(rls): allow tenant users to read/update own license
69b6f98  fix(rls): GRANT + tenant isolation policy for conversation_notes
4ebfadc  fix(expense): column name amount→value + diagnostic endpoint
3ef6bb7  feat(tags): auto-import tags from CRM negocios, leads, contacts, groups
e2fc400  feat(automation): Typebot integration in automation manager
fe77152  feat(inbox): auto-scroll to last message + deep search with snippets
f1c3f61  fix(nav): Integrações link on Home pointed to /settings
98fba3f  feat(groups): member capacity limit per group (250/512/1024)
662c243  redesign(plataforma): design system 3 temas — tokens, kanban, charts, mobile
ac378a8  redesign(nexus): design system próprio — tokens, roles, KPI, impersonation
6e3d8d2  docs: design system report + redesign execution log
005b7ee  feat(inbox): L1-L3 message pagination + virtual scroll + schema renderers
f265811  feat(workers): L4 Docker deploy config for BullMQ workers
70339d8  feat(observability): O4+O5 Redis TTL + Supabase log expiry + health snapshot
8b77233  feat(observability): O1+O3 system metrics worker + enhanced health snapshot
3e44730  feat(observability): O2 proactive alerter worker + aggregator fix
```

---

## 5. PASSO MANUAL RESTANTE

Deploy do Docker no servidor Redis:
```bash
ssh root@[2804:8fbc:0:5::a152]
cd /opt/whatsflow-workers
git pull origin main
docker compose up -d --build
docker logs -f whatsflow-bullmq-worker
```

Verificar logs esperados:
```
[obs-aggregator] Started — collecting metrics every 1 minute
[obs-alerter] Started — monitoring health every 1 minute (cooldown: 15min)
[obs-aggregator] 🟢 OK | errors/min: 0 | instances: X/Y | dlq: 0 | 45ms
[obs-alerter] OK | instances: X/Y | errs: 0 | dlq: 0
```

---

## 6. PRÓXIMAS SESSÕES (BACKLOG)

| Prioridade | Item |
|-----------|------|
| P1 | Migração visual P3 (Pzaafi Strict — border-radius, shadows, gradients) |
| P1 | Webchat CDN distribution (cdn.whatsflow.com.br/webchat.js) |
| P2 | 5 métricas avançadas de analytics (multitarefas, tempo ocioso, FCR, first-yes, reclamações) |
| P2 | Gestão de Grupos Phase 2 (19 funções) |
| P3 | Flow builder visual (drag-and-drop) — Q3/2026 |
| P3 | Lead scoring automático — Q3/2026 |
| P3 | RAG/Knowledge Base — Q3/2026 |

---

*Relatório gerado em 29/03/2026 por Claude Opus 4.6 — Whatsflow Antigravity*
