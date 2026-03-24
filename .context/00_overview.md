# 00 — Overview

## Product
**Name:** Whatsflow Finance
**Type:** Multi-tenant SaaS Platform
**Domain:** CRM + WhatsApp Messaging + Financial Management + AI Intelligence
**Market:** Brazilian SMBs (Small and Medium Businesses)
**Language:** Portuguese (PT-BR)

## Problem Solved
Brazilian businesses juggle multiple disconnected tools for client communication (WhatsApp), sales (CRM), billing, and digital presence analysis. Whatsflow unifies these into a single multi-tenant platform with AI-powered intelligence.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Shadcn/UI |
| State | TanStack React Query v5 + React Context |
| Charts | Recharts 2.15 |
| Backend | Supabase (PostgreSQL 15 + Edge Functions on Deno) |
| Auth | Supabase GoTrue (JWT, email/password) |
| Payments | Asaas API v3 (PIX, Boleto, Credit Card) |
| WhatsApp Legacy | uazapi v2 (uazapiGO) — WebSocket proxy |
| WhatsApp Official | Meta Cloud API v21.0 — OAuth + REST |
| Instagram | Meta Graph API v21.0 — OAuth + REST |
| Email | SMTP2GO (SendGrid-compatible REST API) |
| AI | OpenAI Assistants API v2 (GPT-4o) |
| Web Scraping | Firecrawl + Apify |
| Deploy | Railway (auto-deploy from GitHub main) |
| Repository | GitHub (private) |

## Codebase Stats (2026-03-24)

| Metric | Value |
|--------|-------|
| Total files (excl. node_modules) | ~560 |
| React Components | ~135 |
| Pages/Routes | 40+ |
| Custom Hooks | 18 |
| Context Providers | 10 |
| Edge Functions | 35+ |
| SQL Migrations | 56 |
| TypeScript Errors | 0 |
| Themes | 3 (Deep Sapphire, Midnight Slate, Obsidian Forest) |

## Production

| Property | Value |
|----------|-------|
| Supabase Project | `jtlrglzcsmqmapizqgzu` |
| Production URL | `unfold-project-joy-production.up.railway.app` |
| Deploy | Auto-deploy on push to `main` |
| Licenses | 717 imported |
| WhiteLabels | 4 (VoiceCoder, SendHit, MSolution, Stheel) |
| uazapi Instances | 15 (14 connected) |
| Meta Cloud API | 1 channel (test number) |

## Architecture Pattern
- **SPA** with client-side routing (React Router)
- **Serverless backend** (Supabase Edge Functions)
- **Shared database** with tenant isolation via `tenant_id` + RLS
- **JWT auth** with role-based access (admin/gestor/consultor/representante)
- **Dynamic env vars** — all URLs/IDs from `.env` + Supabase Secrets
- **AI via Assistants API** — prompts in OpenAI platform, not in code

## Key Modules
1. **Financeiro** — Receitas, Despesas, Cobranças, Fiscal, Comissões
2. **CRM/Vendas** — Pipeline Kanban, Negócios, Leads, ICP
3. **Mensageria** — WhatsApp (uazapi + Meta Cloud), Instagram
4. **Inteligência Digital** — Análise de sites, Instagram, Google Business, AI
5. **Nexus** — Admin multi-tenant, licenças, WhiteLabels, feature flags
6. **Checkout** — Pagamento público, ativação de conta, trial
7. **Sistema** — Usuários, Integrações, Assinatura, Configurações

## Related Documents
- [01_product_scope.md](01_product_scope.md) — Features and user types
- [02_architecture.md](02_architecture.md) — Architecture diagram
- [09_env_and_infra.md](09_env_and_infra.md) — Environment and infrastructure
- [18_current_environment_and_metrics.md](18_current_environment_and_metrics.md) — Production metrics
