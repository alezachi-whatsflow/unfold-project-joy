# 01 — Product Scope

## Modules

### 1. Financeiro
- **Receitas**: monthly tracking, installments, categories, billing types
- **Despesas**: categories (CSP, MKT, SAL, GA, FIN, TAX), attachments
- **Cobranças**: Asaas integration (PIX, Boleto, CC), dunning campaigns
- **Fiscal**: NF-e emission, tributos (federal/estadual/municipal), certificados digitais
- **Comissões**: rules engine, closing periods, sales-linked commissions
- **Métricas SaaS**: MRR, ARR, LTV, CAC, Churn, NRR, Burn Rate

### 2. CRM / Vendas
- **Pipeline Kanban**: drag-drop stages (prospecção → qualificado → proposta → negociação → fechado)
- **Negócios**: CRUD with products, discounts, payment conditions
- **Relatórios**: 3 sub-tabs (Visão Geral, Detalhes, Tráfego & ROI)
- **ICP Builder**: ideal customer profile questionnaire
- **Atividades**: calendar + kanban view
- **Wizard**: 6-step commercial setup

### 3. Mensageria (WhatsApp + Instagram)
- **uazapi**: 15 instances, QR code connect, message send/receive
- **Meta Cloud API**: OAuth connect, official WhatsApp + Instagram
- **Caixa de Entrada**: conversation list with sidebar collapse
- **Chat**: real-time messages via Supabase Realtime
- **Quick Lead**: create CRM deal from WhatsApp conversation

### 4. Inteligência Digital
- **Website Analysis**: Firecrawl scraping → authority diagnostic (6 pillars)
- **Instagram Analysis**: Apify scraping → AI 7-pillar analysis (via OpenAI Assistant)
- **Google Business**: Apify scraping → score + checklist
- **Neuromarketing Engine**: persuasion analysis
- **Meta Verification**: domain + business verification check
- **Rescue Plan**: AI-generated action plan

### 5. Nexus (Admin Multi-tenant)
- **Licenças**: 717 imported, CSV import, full CRUD
- **WhiteLabels**: 4 configured, branding, sub-licenses
- **Lifecycle**: data encryption, device deletion
- **Feature Flags**: per-tenant feature toggling
- **I.A. Config**: OpenAI/Anthropic/Gemini keys (global or per-tenant)
- **Equipe**: team management, role assignment
- **Checkouts**: checkout session monitoring

### 6. Checkout & Ativação
- **Checkout público**: 4-step wizard (plan → addons → data → payment)
- **Pagamento**: PIX QR, Boleto, Cartão via Asaas
- **Ativação**: email link → create password → account active
- **Trial**: 15-day countdown, banner on dashboard

### 7. Sistema
- **Usuários**: invite via email (SMTP2GO), resend link, generate manual link
- **Integrações**: Meta channels (OAuth), uazapi instances, providers
- **Assinatura**: real license data, limits, upsell options
- **Configurações**: company data (tenant), Asaas config
- **Comunidade / Tutoriais / Manual / Onboarding**: system pages

## User Types

| Role | Access | Portal |
|------|--------|--------|
| `nexus_superadmin` | Full system | `/nexus` |
| `nexus_dev_senior` | Licenses, WL, lifecycle | `/nexus` |
| `nexus_suporte_senior` | Licenses, WL, tickets | `/nexus` |
| `wl_admin` | WhiteLabel portal | `/wl/:slug` |
| `admin` | Full tenant access | `/app/:slug` |
| `gestor` | Most features, no delete | `/app/:slug` |
| `financeiro` | Financial modules only | `/app/:slug` |
| `consultor` | CRM + messaging | `/app/:slug` |
| `representante` | Own deals only | `/app/:slug` |

## Permission Matrix
Defined in `src/config/permissions.ts`. 12 modules × 5 actions (view, create, edit, delete, export).
Custom overrides stored in `profiles.custom_permissions` (JSONB).
