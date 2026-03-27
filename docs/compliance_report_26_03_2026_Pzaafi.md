# Auditoria Global de Isolamento e Consistencia
**Data:** 26/03/2026
**Autor:** Claude Opus 4.6 (Lead Software Architect & Compliance Officer)
**Solicitante:** CEO Whatsflow
**Escopo:** Backend (DB + Edge Functions) + Frontend (React/Tailwind) + Design System

---

## 1. RESUMO EXECUTIVO

| Categoria | Status | Score |
|-----------|--------|-------|
| Tenant Isolation (RLS) | PARCIAL | 80% |
| Cascade Deletes (FK) | PARCIAL | 89% |
| Nomenclatura Frontend | INCONSISTENTE | 60% |
| Design System Pzaafi | NAO CONFORME | 30% |

**Total de tabelas auditadas:** 78
**Total de violacoes visuais:** 147+
**Total de inconsistencias de nomenclatura:** 40+ arquivos

---

## 2. SEGURANCA E ISOLAMENTO MULTI-TENANT

### 2.1 Tabelas com Isolamento CORRETO (58 tabelas)

Estas tabelas possuem: tenant_id UUID + ON DELETE CASCADE + RLS habilitado + Strict Tenant Isolation Policy.

```
asaas_connections        asaas_customers         asaas_payments
asaas_splits             asaas_expenses          asaas_revenue
checkout_sources         sales_people            revenue_rules
dunning_rules            dunning_executions      webhook_events
commission_rules         mass_send_batches       mass_send_results
negocios                 crm_contacts            company_profile
icp_profiles             icp_questionnaires      conversations
chat_messages            whatsapp_connections     whatsapp_messages
channel_integrations     oauth_states            csat_ratings
webchat_sessions         webchat_config          notifications
audit_logs               license_history         tenant_encryption_keys
tenant_sync_configs      tenant_sync_logs        quick_replies
conversation_transfers   internal_notes          agent_status
departments              agent_departments       distribution_state
hsm_templates            notification_preferences sla_rules
keyword_alerts           automation_triggers     group_members
group_scheduled_messages group_moderation_rules  lgpd_requests
api_keys                 tenant_tags             activities
user_tenants             licenses
```

### 2.2 P0 CRITICO — Tabelas com USING(true) (Vazamento de Dados)

Estas tabelas tem RLS habilitado mas a policy permite acesso publico a TODOS os registros:

| Tabela | Problema | Risco |
|--------|----------|-------|
| `financial_entries` | USING(true) — qualquer usuario le todos os dados financeiros | **CRITICO** |
| `customers` | USING(true) — qualquer usuario le todos os clientes | **CRITICO** |
| `web_scraps` | USING(true) | ALTO |
| `profiles_analysis` | USING(true) | ALTO |
| `business_leads` | USING(true) | ALTO |
| `digital_analyses` | USING(true) + sem tenant_id | ALTO |
| `export_logs` | USING(true) + sem tenant_id | ALTO |

**Acao requerida:** DROP das policies USING(true) e criacao de Strict_Tenant_Isolation.

### 2.3 P0 CRITICO — Foreign Keys SEM CASCADE

Quando um tenant e deletado, estas tabelas geram registros orfaos e podem bloquear a exclusao:

| Tabela | FK para tenants | ON DELETE |
|--------|-----------------|-----------|
| `payment_dunnings` | tenant_id | **NENHUM** (NO ACTION) |
| `tasks` | tenant_id | **NENHUM** (NO ACTION) |
| `meta_connections` | tenant_id (TEXT) | **NENHUM** |

**Acao requerida:** ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ... ON DELETE CASCADE

### 2.4 P1 — Tabelas SEM tenant_id (Isolamento por instance_name)

Estas tabelas dependem de `instance_name` para isolamento indireto, o que e fragil:

| Tabela | Metodo de Isolamento | Risco |
|--------|---------------------|-------|
| `whatsapp_campaigns` | instance_name lookup | Cross-tenant possivel |
| `whatsapp_contacts` | instance_name lookup | Cross-tenant possivel |
| `whatsapp_leads` | instance_name lookup | Cross-tenant possivel |

**Acao requerida:** Adicionar coluna tenant_id com FK CASCADE e migrar dados.

### 2.5 P1 — DEFAULT tenant_id Hardcoded

Tabelas com valor default perigoso que pode atribuir registros ao tenant errado:

```
prospect_campaigns  → DEFAULT '00000000-0000-0000-0000-000000000001'
negocios            → DEFAULT '00000000-0000-0000-0000-000000000001'
whatsapp_instances  → DEFAULT '00000000-0000-0000-0000-000000000001'
```

**Acao requerida:** Remover DEFAULT e forcar tenant_id NOT NULL no app.

### 2.6 P2 — Inconsistencia TEXT vs UUID

Estas tabelas usam `tenant_id TEXT` em vez de `UUID`, causando falha em casts RLS:

| Tabela | Tipo |
|--------|------|
| `sales_pipelines` | TEXT |
| `meta_connections` | TEXT |
| `manual_articles` | TEXT |
| `tutorials` | TEXT |

**Acao requerida:** ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid

### 2.7 Storage Buckets

| Bucket | Policies | Isolamento Tenant |
|--------|----------|-------------------|
| `chat-attachments` | Auth upload, public read | Path-based (app enforce) |
| `expense-attachments` | Public access | Path-based (app enforce) |

**Observacao:** Nenhum bucket tem policy SQL que force tenant_id no path. O isolamento depende do codigo da Edge Function incluir `{tenant_id}/` no path do upload. Se o app falhar em prefixar, um tenant pode acessar arquivos de outro.

---

## 3. NOMENCLATURA E LINGUAGEM UBIQUA

### 3.1 Telefone / Celular / Phone

| Termo | Onde aparece | Arquivos |
|-------|-------------|----------|
| "Fone" | CustomerFormDialog.tsx (labels) | 3 ocorrencias |
| "Fone WhatsApp" | CrmCSVImport.tsx | 1 ocorrencia |
| "Telefone" | CrmPage.tsx, WizardLayout.tsx, ProfilePage | 5+ ocorrencias |
| "Phone" | Propriedades internas | Codebase inteiro |

**Padrao recomendado:** "Telefone" para labels, `phone` para propriedades.

### 3.2 Cliente / Contato / Lead

| Termo | Onde aparece | Contexto |
|-------|-------------|----------|
| "Novo Cliente" | CustomerFormDialog.tsx | Dialog title |
| "Criar Contato" | CrmPage.tsx | Page action |
| "Cliente / Empresa" | NegocioCreateModal.tsx | Form label |
| "Lead" | WhatsApp leads, tags | Messaging context |

**Padrao recomendado:** "Cliente" para CRM/Financeiro, "Contato" para Messaging, "Lead" para pipeline pre-venda.

### 3.3 Botoes de Acao — Criar vs Cadastrar vs Adicionar

| Acao | Variantes encontradas | Arquivos |
|------|----------------------|----------|
| Criar | "Criar", "Cadastrar", "Adicionar", "Novo" | 15+ arquivos |
| Salvar | "Salvar", "Atualizar", "Confirmar" | 10+ arquivos |
| Excluir | "Excluir", "Remover", "Deletar", "Apagar" | 8+ arquivos |

**Padrao recomendado:**
- Criar novo registro: **"Criar"**
- Salvar edicao: **"Salvar"**
- Excluir: **"Excluir"**
- Fechar sem salvar: **"Cancelar"**

### 3.4 Descricao / Notas / Observacoes

| Termo | Onde aparece |
|-------|-------------|
| "Descricao" | BillingConfigCard, DepartmentManager, NexusIntegracoes |
| "Notas" | CommissionRulesTab, NexusLicenseDetail |
| "Observacoes" | NegocioCreateModal (placeholder) |

**Padrao recomendado:** "Descricao" para campos curtos, "Observacoes" para textarea livre.

### 3.5 Valor / Preco / Custo

| Termo | Onde aparece | Contexto |
|-------|-------------|----------|
| "Valor" | ExpensesPage, NegocioCreateModal | Generico |
| "Preco" | ProductsPage ("Preco de Venda") | Produto |
| "Custo" | ProductsPage ("Custo por Hora") | Custo interno |

**Padrao recomendado:** "Valor" generico, "Preco" para produto/servico, "Custo" para despesa interna.

---

## 4. DESIGN SYSTEM PZAAFI — VIOLACOES

### 4.1 Border-Radius (100+ violacoes)

O Dossie Pzaafi exige **0px border-radius** exceto em avatares (rounded-full).
Classes encontradas em componentes que NAO sao avatares:

**CRITICO — Componentes de pagina:**
```
rounded-xl    → KPICard.tsx (2x), FaturaView.tsx
rounded-lg    → ActivityKanban.tsx, AsaasBillingManagerPanel.tsx, AsaasDunningPanel.tsx,
                AsaasPaymentsPanel.tsx (4x), BillingConfigCard.tsx (2x),
                PaymentArtifactsDialog.tsx, SplitConfigCard.tsx (2x),
                CommissionClosingTab.tsx (4x), CommissionDashboardTab.tsx (3x),
                ChurnTrendChart.tsx, CostBreakdownChart.tsx, CustomerGrowthChart.tsx,
                MarginTrendChart.tsx, OverviewChart.tsx, RevenueChart.tsx
rounded-md    → ActivityCalendar.tsx (2x), AsaasDunningPanel.tsx (2x),
                BillingConfigCard.tsx, CustomerSelectionCard.tsx,
                CommissionRulesTab.tsx (3x)
```

**CSS hardcoded:**
```
src/index.css              → border-radius em 10+ selectores
src/styles/liquid-glass.css → border-radius em glass components
src/styles/themes.css       → border-radius em metric cards, sidebar
src/styles/mensageria-redesign.css → border-radius em 13 selectores
```

### 4.2 Shadows (30+ violacoes)

Pzaafi exige **box-shadow: none** em todos os elementos.

**Classes Tailwind:**
```
shadow-xl     → ChurnTrendChart, CostBreakdownChart, CustomerGrowthChart,
                MarginTrendChart, OverviewChart, RevenueChart, KPICard, ErrorBoundary
shadow-md     → ActivityKanban (hover), ProspeccaoTab
shadow-lg     → KPICard (hover), ThresholdStatusBar (hover)
shadow-black/20 → KPICard
```

**CSS hardcoded:**
```
src/index.css              → box-shadow no dock (8px 32px blur)
src/styles/liquid-glass.css → 10 shadow declarations (glass-shadow-sm/md/lg)
src/styles/mensageria-redesign.css → 4 box-shadow (SLA dots, toggle)
```

### 4.3 Gradientes (15+ violacoes)

Pzaafi proibe gradientes. Encontrados:

**TSX Components:**
```
bg-gradient-to-br → KPICard.tsx, GoogleBusinessCard.tsx,
                    InstagramAnalysisCard.tsx (2x), ThresholdStatusBar.tsx,
                    QRCodeModal.tsx, UazapiQRCodeModal.tsx, GodAdminDashboard.tsx
bg-gradient-to-r  → InstagramAnalysisCard.tsx, ThresholdStatusBar.tsx (2x)
bg-gradient-to-t  → TutoriaisPage.tsx
```

**CSS Files:**
```
src/index.css              → radial-gradient, linear-gradient (2x)
src/styles/liquid-glass.css → --glass-shine linear-gradient, radial-gradient
src/styles/themes.css       → linear-gradient (1x)
```

**Excecao aceitavel:** ChannelIcon.tsx usa linear-gradient para o badge do Instagram — isso e parte da identidade visual do canal, nao do nosso design system.

### 4.4 Fontes Nao-Aprovadas

Pzaafi aprova apenas: **Inter**, **system-ui**, **monospace** (para codigo).

| Fonte | Onde | Status |
|-------|------|--------|
| `Open Sans` | src/index.css (line 98) | **VIOLACAO** |
| `Space Grotesk` | src/index.css (line 120) | **VIOLACAO** |
| `Readex Pro` | Referenciada no design system | Ausente no CSS |
| `JetBrains Mono` | ExpensesPage, WebchatWidget | Aceitavel (monospace) |

---

## 5. PRIORIDADES DE CORRECAO

### P0 — EMERGENCIAL (Seguranca)
1. Dropar policies USING(true) em: financial_entries, customers, web_scraps, profiles_analysis, business_leads
2. Adicionar ON DELETE CASCADE em: payment_dunnings, tasks, meta_connections
3. Remover DEFAULT tenant_id hardcoded de: prospect_campaigns, negocios, whatsapp_instances

### P1 — ALTA (Integridade)
4. Adicionar tenant_id FK em: digital_analyses, export_logs
5. Migrar whatsapp_campaigns/contacts/leads para usar tenant_id direto
6. Converter TEXT tenant_id para UUID em: sales_pipelines, meta_connections, manual_articles, tutorials
7. Adicionar storage bucket policies com tenant_id no path

### P2 — MEDIA (Consistencia)
8. Padronizar nomenclatura de labels (Telefone, Cliente, Criar/Salvar/Excluir)
9. Padronizar fontes para Inter/system-ui (remover Open Sans, Space Grotesk)

### P3 — BAIXA (Design System)
10. Remover border-radius de componentes non-avatar (100+ ocorrencias)
11. Remover shadows de todos os componentes (30+ ocorrencias)
12. Remover gradientes de componentes non-channel (15+ ocorrencias)

> **Nota:** As correcoes P3 (Design System) impactam 50+ componentes e devem ser feitas de forma faseada para nao quebrar a UI em producao. Recomenda-se criar um branch `feat/pzaafi-strict` e migrar por modulo.

---

## 6. TABELAS NEXUS (Internas — Sem tenant_id por design)

Estas tabelas sao internas do painel Nexus e NAO precisam de tenant_id:

```
nexus_users              nexus_license_usage
nexus_audit_logs         nexus_feature_flags
nexus_license_feature_flags  nexus_tickets
whatsapp_providers       sync_schedules
```

**Status:** CONFORME — tabelas administrativas com RLS restrito a nexus_users.

---

## 7. TABELAS DE SUPORTE (User-based, sem tenant_id por design)

```
manual_progress    → isolamento por user_id
tutorial_progress  → isolamento por user_id
onboarding_steps   → isolamento por user_id
community_posts    → acesso publico autenticado (intencional)
profiles           → isolamento por auth.uid()
```

**Status:** ACEITAVEL — dados pessoais do usuario, nao dados de tenant.

---

*Fim do relatorio. Documento gerado automaticamente pela auditoria de compliance Pzaafi.*
*Whatsflow EDTECH — Marco/2026*
