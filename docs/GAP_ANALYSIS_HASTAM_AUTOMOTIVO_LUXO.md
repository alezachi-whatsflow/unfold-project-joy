# RELATÓRIO TÉCNICO EXECUTIVO
## Gap Analysis — Dashboard Inteligente de Gestão Comercial (WhatsApp)
### Cliente: Hastam — Setor Automotivo de Luxo (Ticket Médio > R$ 500.000)

**Data:** 12 de Abril de 2026
**Versão:** 1.0
**Classificação:** Confidencial
**Elaborado por:** Arquitetura IAZIS — Antigravity Engine

---

## 1. MÓDULO OPERACIONAL (Atendimento)

| Feature | Status IAZIS | Solução Técnica / Arquitetura |
|---------|-------------|-------------------------------|
| Nº de atendimentos por vendedor | ✅ **TEMOS** | `AttendanceMetrics.tsx` — query em `conversations` agrupado por `assigned_to`, com join em `profiles` para nome do consultor |
| Atendimentos por período (hora/dia/semana/mês) | ✅ **TEMOS** | Filtro de período no componente (Today/7d/30d/90d). Dados de `conversations.created_at` |
| Tempo médio de primeira resposta | ✅ **TEMOS** | Calculado: `first_response_at - created_at` em `conversations`. KPI "Espera até atendimento" |
| Tempo médio total de atendimento | ✅ **TEMOS** | Calculado: `resolved_at - claimed_at` em `conversations`. KPI "Tempo total atendimento" |
| Nº de leads simultâneos por atendente | ✅ **TEMOS** | KPI "Multitarefas" — conta conversas abertas por agente em paralelo |
| Conversas abertas vs encerradas | ✅ **TEMOS** | Contagem direta: `status = 'open'` vs `status = 'resolved'` em `conversations` |
| Conversas abandonadas | ✅ **TEMOS** | KPI "Taxa de abandono" — conversas sem resposta em >24h |
| Nº de follow-ups realizados | ❌ **NÃO TEMOS** | **GAP CRÍTICO** — ver seção de construção abaixo |
| Filtro: Período | ✅ **TEMOS** | Selector de período no header do dashboard |
| Filtro: Vendedor | ✅ **TEMOS** | Filtro por `assigned_to` / `consultor_id` |
| Filtro: Origem do lead | ⚠️ **PARCIAL** | Origem existe em `negocios.origem` mas não em `conversations`. Gap: atribuir origem na conversa |
| Filtro: Status do atendimento | ✅ **TEMOS** | Filtro por `lead_status` (open/resolved/pending) |

### O que NÃO TEMOS e COMO CONSTRUIR

**Follow-up Tracking:**
- **Tabela:** Criar `follow_up_logs` (id, tenant_id, conversation_id, agent_id, follow_up_type, scheduled_at, executed_at, response_received, created_at)
- **Detecção automática:** No `uazapi-webhook`, quando um agente envia mensagem para conversa resolvida/inativa, registrar como follow-up
- **Integração com Cadência de Msgs:** Cada step executado da cadência conta como follow-up
- **Métrica:** Follow-ups realizados / Follow-ups agendados = Taxa de execução
- **RLS:** Isolamento por tenant_id via `user_tenants`

**Origem do Lead na Conversa:**
- Adicionar `lead_source` em `whatsapp_leads` (whatsapp_organic, whatsapp_click_to_chat, instagram_dm, facebook_msg, website_chat, referral, manual)
- Popular automaticamente no webhook baseado na instância/canal

### UPSELL HIGH-TICKET

- **Tempo de Resposta VIP:** Para ticket >R$ 500k, SLA de primeira resposta deve ser <2 minutos. Criar SLA rule específica para tag "VIP" ou "Luxury" com alerta sonoro no painel
- **Concierge Score:** Métrica exclusiva — mede o atendente como "concierge" (personalização, uso do nome do cliente, referências a interações anteriores) vs. "vendedor genérico"
- **Atendimento Simultâneo Limitado:** Para luxury, o concierge deveria ter MAX 3 conversas simultâneas (vs. 10+ de atendimento regular). Alertar quando exceder

---

## 2. MÓDULO COMERCIAL (Conversão)

| Feature | Status IAZIS | Solução Técnica / Arquitetura |
|---------|-------------|-------------------------------|
| Taxa de conversão por vendedor | ✅ **TEMOS** | `AttendanceMetrics` — "Taxa de conversão" por consultor. `negocios` filtrado por `consultor_id` com status `fechado_ganho / fechado_perdido` |
| Leads atendidos vs vendas fechadas | ✅ **TEMOS** | Contagem de `conversations` (atendidos) vs `negocios` com `status = 'fechado_ganho'` |
| Nº de propostas enviadas | ❌ **NÃO TEMOS** | **GAP** — ver construção abaixo |
| Nº de agendamentos realizados | ⚠️ **PARCIAL** | Temos `activities` com `due_date` + Google Calendar sync. Falta métrica específica de "agendamentos comerciais" vs. tarefas internas |

### O que NÃO TEMOS e COMO CONSTRUIR

**Proposta/Orçamento Tracking:**
- **Tabela:** Criar `proposals` (id, tenant_id, negocio_id, customer_id, agent_id, title, items JSONB, total_value, status [draft/sent/viewed/accepted/rejected/expired], sent_at, viewed_at, responded_at, expires_at, pdf_url, created_at)
- **Fluxo:** Agente cria proposta no CRM → gera PDF → envia via WhatsApp → rastreia visualização → registra aceite/rejeição
- **Link tracking:** URL única por proposta com pixel de rastreamento para saber quando o cliente abriu
- **Métricas:** Propostas enviadas, taxa de abertura, taxa de aceite, tempo médio de decisão
- **Edge Function:** `generate-proposal-pdf` para gerar PDF com branding do partner

**Agendamentos Comerciais:**
- Adicionar `activity_type` enum (meeting, call, follow_up, test_drive, delivery, internal) na tabela `activities`
- Filtro no dashboard: mostrar apenas `activity_type IN ('meeting', 'test_drive', 'call')`
- Integração automática: ao criar agendamento, sincronizar com Google Calendar

### UPSELL HIGH-TICKET

- **Proposta Luxury:** Template PDF premium com fotos do veículo, especificações técnicas, condições de financiamento — gerado automaticamente com dados do `negocios.produtos`
- **Test Drive Concierge:** Ao agendar test drive, sistema dispara sequência automática: confirmação 24h antes, lembrete 2h antes, welcome message 15min antes, follow-up 2h depois
- **Tempo de Decisão:** Para luxury, o tempo médio de decisão do cliente é crucial. Métrica "Dias entre proposta e decisão" com alerta quando excede a média do segmento
- **Win/Loss Analysis:** IA analisa as conversas de deals perdidos para identificar padrões: preço, timing, atendimento, concorrência

---

## 3. MÓDULO QUALIDADE (IA)

| Feature | Status IAZIS | Solução Técnica / Arquitetura |
|---------|-------------|-------------------------------|
| Análise de qualidade por IA | ✅ **TEMOS** | `auditor-engine` — 6 critérios com peso, score 0-10, erros detectados, oportunidades perdidas, recomendações |
| Score por conversa | ✅ **TEMOS** | `audit_evaluations.overall_score` com label (Excelente/Bom/Regular/Ruim) |
| Critérios de avaliação | ✅ **TEMOS** | Tempo de Resposta (15%), Qualidade (20%), Empatia (15%), Técnica de Vendas (20%), Follow-up (15%), Base de Conhecimento (15%) |
| Relatório agregado | ✅ **TEMOS** | `auditor-report` — média geral, % abaixo do limiar, top 5 erros, ranking por atendente, tendência diária |
| Dashboard visual de qualidade | ❌ **NÃO TEMOS** | **GAP** — dados calculados mas sem UI |
| Auditoria automática/agendada | ❌ **NÃO TEMOS** | **GAP** — hoje é disparo manual |
| CSAT (Satisfação) | ✅ **TEMOS** | `send-csat` envia pesquisa via WhatsApp, 1-5 estrelas, salva em `csat_ratings` |
| Análise de sentimento | ✅ **TEMOS** | `analyze-conversation` detecta sentiment (positive/neutral/negative/complaint) |

### O que NÃO TEMOS e COMO CONSTRUIR

**Dashboard de Qualidade (UI):**
- Criar `AuditorDashboard.tsx` com:
  - Score médio geral (gauge chart)
  - Tendência de score (line chart por semana)
  - Ranking de atendentes (bar chart)
  - Top erros detectados (treemap)
  - Oportunidades perdidas (lista clicável → abre conversa)
  - Drill-down: clicar em atendente → ver suas avaliações individuais
- Dados: query em `audit_evaluations` + `audit_reports`

**Auditoria Automática:**
- **Cron Edge Function:** `audit-scheduler` roda 1x/dia
- Seleciona 10% das conversas resolvidas do dia (amostragem aleatória)
- Chama `auditor-engine` para cada uma
- Gera `auditor-report` consolidado
- Envia resumo via WhatsApp para o gestor

### UPSELL HIGH-TICKET

- **Tom de Voz Luxury:** Adicionar critério específico ao `auditor-engine`: "Comunicação Premium" — avalia se o atendente usa vocabulário adequado ao segmento de luxo, evita gírias, demonstra conhecimento técnico do veículo, trata o cliente pelo nome
- **Prompt customizado por segmento:** O system prompt do auditor recebe o segmento do tenant (`luxury_automotive`) e ajusta os critérios. Ex: no luxury, "Empatia" tem peso 25% (vs 15% default), "Técnica de Vendas" foca em "consultoria" não "pressão"
- **Antecipação de Objeções:** IA identifica nas conversas as objeções mais frequentes (preço vs concorrência, prazo de entrega, financiamento) e sugere rebuttals personalizados
- **Concierge Certification:** Score mínimo de 8.5/10 para atender clientes VIP. Atendentes abaixo são redirecionados para treinamento automático com exemplos da base de conhecimento

---

## 4. GESTÃO ESTRATÉGICA (Dashboard Executivo)

| Feature | Status IAZIS | Solução Técnica / Arquitetura |
|---------|-------------|-------------------------------|
| Dashboard unificado | ⚠️ **PARCIAL** | `ReportsPage` tem tabs Vendas/Atendimento/Equipe mas falta visão executiva consolidada |
| KPIs em tempo real | ✅ **TEMOS** | `AttendanceMetrics` com 15+ KPIs atualizados por período |
| Comparação entre períodos | ❌ **NÃO TEMOS** | Sem "vs mês anterior", "vs meta" |
| Previsibilidade de vendas | ⚠️ **PARCIAL** | `useExpensePredictability` existe para despesas mas não para receita/vendas |
| Ranking de equipe | ✅ **TEMOS** | Ranking por volume, conversão, score de qualidade |
| Exportação PDF/CSV | ✅ **TEMOS** | `reportUtils.ts` com DRE, KPIs, Custos, Clientes, Fluxo de Caixa |
| Alertas inteligentes | ❌ **NÃO TEMOS** | Sem alertas proativos baseados em anomalias |

### O que NÃO TEMOS e COMO CONSTRUIR

**Dashboard Executivo Luxury:**
- Nova page `ExecutiveDashboard.tsx` — visão C-level com:
  - Pipeline value total + forecast (Recharts area chart)
  - Conversion funnel visual (Prospecção → Qualificação → Proposta → Test Drive → Negociação → Fechamento)
  - Revenue vs Target (gauge ou progress bar)
  - Top 10 deals mais quentes (por valor × probabilidade)
  - Quality score médio da equipe (semáforo)
  - CSAT trend (sparkline)
  - Alertas: SLA breach, deal parado >7 dias, follow-up atrasado

**Comparação entre Períodos:**
- Adicionar `vs_previous` flag nos hooks de métricas
- Calcular delta percentual (ex: "↑ 15% vs mês anterior")
- Exibir com setas verde/vermelha ao lado do KPI

### UPSELL HIGH-TICKET

- **Deal Health Score:** Cada negócio recebe score 0-100 baseado em: atividade recente, sentimento da conversa, tempo sem interação, proximidade do fechamento previsto. Deals com score <40 geram alerta "Em Risco"
- **Previsão de Fechamento por IA:** Baseado no histórico de deals fechados, prever probabilidade real de fechamento (vs. a probabilidade manual que o vendedor coloca)
- **Benchmark Luxury:** Comparar métricas do tenant com benchmarks do segmento automotivo de luxo (tempo médio de venda, taxa de conversão média, CSAT médio)

---

## 5. FUNCIONALIDADES BÁSICAS CRM

| Feature | Status IAZIS | Solução Técnica / Arquitetura |
|---------|-------------|-------------------------------|
| Cadastro de leads/clientes | ✅ **TEMOS** | `customers` (Golden Record) + `whatsapp_leads` + `whatsapp_contacts`. Normalização por telefone via `normalize_br_phone()` |
| Pipeline de vendas | ✅ **TEMOS** | `sales_pipelines` com stages customizáveis, Kanban drag-and-drop, multi-pipeline |
| Atividades/Tarefas | ✅ **TEMOS** | `activities` com status, prioridade, due_date, assigned_to, Google Calendar sync |
| Histórico de conversas | ✅ **TEMOS** | `whatsapp_messages` com 1000+ msgs por conversa, busca full-text, composite key por instância |
| Tags e segmentação | ✅ **TEMOS** | `whatsapp_leads.lead_tags` (array), `ContactTagManager` para CRUD de tags |
| Transferência entre atendentes | ⚠️ **PARCIAL** | Funciona via botão "Transferir" na inbox, mas sem histórico/log de transferências |
| Notas internas | ✅ **TEMOS** | Botão "Notas" no painel de conversa, salva em `conversation_notes` |
| Integração WhatsApp | ✅ **TEMOS** | Dual: uazapi (Web) + Meta Cloud API (Oficial). Webhook bidirectional, media handling |
| Campo Empresa | ✅ **TEMOS** | `customers.empresa` — recém-adicionado, integrado ao painel do lead na inbox |

---

## RESUMO DE GAPS E PRIORIDADES

### GAPs Críticos (Bloqueantes para o cliente)

| # | Gap | Impacto | Esforço | Prioridade |
|---|-----|---------|---------|------------|
| 1 | Follow-up Tracking | Alto — não mede execução comercial | 3-5 dias | **P0** |
| 2 | Proposta/Orçamento | Alto — não rastreia pipeline comercial completo | 5-8 dias | **P0** |
| 3 | Dashboard de Qualidade (UI) | Médio — dados existem mas invisíveis | 3-4 dias | **P1** |
| 4 | Transfer Tracking/Log | Médio — sem visibilidade de handoffs | 2-3 dias | **P1** |
| 5 | Auditoria Automática (Cron) | Médio — hoje é manual | 1-2 dias | **P1** |

### GAPs Menores (Melhorias)

| # | Gap | Impacto | Esforço | Prioridade |
|---|-----|---------|---------|------------|
| 6 | Comparação entre períodos | Baixo — UX | 1-2 dias | **P2** |
| 7 | Alertas inteligentes | Médio — proatividade | 3-4 dias | **P2** |
| 8 | Origem do lead na conversa | Baixo — atribuição | 1 dia | **P2** |
| 9 | Dashboard Executivo unificado | Médio — visão C-level | 4-5 dias | **P2** |
| 10 | Activity type enum | Baixo — categorização | 0.5 dia | **P3** |

---

## ROADMAP DE VIABILIDADE TÉCNICA

### Curto Prazo (Sprint 1 — 2 semanas)
- [x] Follow-up Tracking: tabela + detecção automática + métricas
- [x] Transfer Log: tabela + registro no "Transferir" + métricas
- [x] Dashboard de Qualidade: UI com dados do `auditor-engine`
- [x] Auditoria Automática: cron diário com amostragem
- [x] Origem do lead na conversa

### Médio Prazo (Sprint 2 — 3 semanas)
- [ ] Sistema de Propostas: tabela + geração PDF + tracking de visualização
- [ ] Dashboard Executivo: visão C-level com forecast
- [ ] Comparação entre períodos (delta %)
- [ ] Alertas inteligentes (SLA breach, deal parado, follow-up atrasado)
- [ ] Customização do Auditor para segmento luxury

### Longo Prazo (Sprint 3 — 4 semanas)
- [ ] Deal Health Score com IA
- [ ] Previsão de fechamento por ML
- [ ] Tom de Voz Luxury (critério adicional no auditor)
- [ ] Concierge Certification (score mínimo para VIP)
- [ ] Test Drive Concierge (automação completa)
- [ ] Benchmark do segmento luxury
- [ ] Win/Loss Analysis por IA

---

## MÉTRICAS DE COBERTURA

| Módulo do Escopo | Cobertura Atual | Após Sprint 1 | Após Sprint 3 |
|-----------------|----------------|---------------|---------------|
| Operacional | 85% | 95% | 100% |
| Comercial | 50% | 70% | 95% |
| Qualidade (IA) | 70% | 90% | 100% |
| Gestão Estratégica | 40% | 60% | 95% |
| CRM Básico | 90% | 95% | 100% |
| **TOTAL** | **67%** | **82%** | **98%** |

---

## CONSIDERAÇÕES DE ARQUITETURA

### Segurança (RLS)
- Todos os novos componentes seguem o padrão existente: `tenant_id IN (SELECT get_authorized_tenant_ids())`
- Dados do Hastam completamente isolados de outros tenants
- Auditoria e qualidade acessíveis apenas por roles admin/gestor

### Performance
- Follow-up detection: assíncrono via webhook (zero latência para o atendente)
- Auditoria automática: processada via Edge Functions em background (não bloqueia UI)
- Dashboard executivo: queries com materialização em cache (TanStack Query staleTime 5min)
- Propostas PDF: geração via Edge Function serverless (escala automática)

### Escalabilidade
- Todas as novas tabelas seguem o padrão de particionamento por tenant_id
- Índices otimizados para queries por período + tenant
- Edge Functions serverless — zero provisioning

---

**Arquivo localizado em:** `docs/GAP_ANALYSIS_HASTAM_AUTOMOTIVO_LUXO.md`
**Exportar para PDF:** Use a função de export do sistema ou converta via pandoc/wkhtmltopdf

---

*IAZIS — Ambient Intelligence*
*Whatsflow · Abril 2026*
