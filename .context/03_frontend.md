# 03 — Frontend

## Stack
React 18 + TypeScript 5.8 + Vite 5 + Tailwind CSS 3 + Shadcn/UI (Radix)

## Routing (React Router v6)
5 portals with nested routes:

### Public (no auth)
`/login` `/signup` `/forgot-password` `/reset-password` `/checkout` `/ativar/:token`

### Client Portal `/app/:slug`
| Route | Page | Module |
|-------|------|--------|
| `/dashboard` | Index | Dashboard KPIs (real data) |
| `/vendas` | VendasPage | Pipeline, Lista, Atividades, Relatórios |
| `/customers` | CustomersPage | Customer management |
| `/products` | ProductsPage | Product catalog |
| `/revenue` | RevenuePage | Revenue tracking |
| `/expenses` | ExpensesPage | Expense management |
| `/cobrancas` | CobrancasPage | Collections/billing |
| `/fiscal` | FiscalPage | Tax/NF-e (5 tabs) |
| `/comissoes` | ComissoesPage | Commissions |
| `/intelligence` | IntelligencePage | AI digital analysis |
| `/mensageria` | MensageriaPage | WhatsApp inbox |
| `/analytics` | AnalyticsPage | Advanced analytics |
| `/reports` | ReportsPage | Reports (real data) |
| `/integracoes` | IntegracoesPage | Meta + uazapi channels |
| `/assinatura` | AssinaturaPage | License (real data) |
| `/usuarios` | UsersPage | User management |
| `/settings` | SettingsPage | App settings |
| `/ia` | IASkillsPage | AI skills |
| `/ia/auditor` | IAAuditorPage | AI auditor |

### Nexus Portal `/nexus` (admin)
14 pages: Dashboard, Licenças, WhiteLabels, Checkouts, Financeiro, Equipe, Auditoria, Lifecycle, Flags, Tickets, I.A. Config, Configurações

### WhiteLabel Portal `/wl/:slug`
7 pages: Dashboard, Clientes, Licenças, Branding, Suporte, Config

### SuperAdmin `/superadmin` + God Admin `/god-admin`
5+8 pages for system-level management

## State Management

| Pattern | Usage |
|---------|-------|
| **React Context** | 10 providers (Financial, Customer, Product, Asaas, Intelligence, Theme, Tour, Sidebar, Nexus, CostLines) |
| **React Query** | Server state (useQuery with staleTime, cache) |
| **localStorage** | Theme (`wf-theme`), Sidebar prefs (`wf_sidebar_prefs`), Tenant (`whatsflow_default_tenant_id`) |
| **Supabase Realtime** | `whatsapp_messages` live updates |

## Custom Hooks (18)
| Hook | Purpose |
|------|---------|
| `useAuth` | Auth provider + signIn/signOut/resetPassword |
| `useTenantId` | Centralized tenant resolution |
| `usePermissions` | Role-based access (canView/canEdit/canDelete) |
| `useNegocios(tenantId)` | CRM deals CRUD |
| `usePipelines(tenantId)` | Sales pipelines |
| `useCompanyProfile(tenantId)` | Company profile |
| `useICPProfile(tenantId)` | Ideal customer profile |
| `useLicenseLimits(tenantId)` | License usage vs limits |
| `useChannelIntegrations` | Meta/WA channel data |
| `useUserTenants` | User's tenant list |

## Components (~135 files in 15 directories)
- `ui/` — 51 Shadcn/UI base components
- `vendas/` — Pipeline, NegocioDrawer, VendasRelatorios (3 sub-tabs)
- `whatsapp/` — ChatPanel, MessageList, ChatInput, ConversationItem
- `fiscal/` — 8 components (NF-e, tributos, certificados)
- `asaas/` — Cockpit, Payments, Reconciliation, Split, Dunning
- `intelligence/` — 11 analysis + prospecting components
- `mensageria/` — 14 messaging config components
- `dashboard/` — 7 KPI/chart components
- `layout/` — DashboardLayout, AppSidebar, CommandPalette

## Navigation (src/config/navigation.ts)
3 categories: Financeiro (6 items) → Clientes & Produtos (11 items) → Sistema (8 items)

## Themes (src/styles/themes.css)
| Theme | Identity | Background |
|-------|----------|-----------|
| Deep Sapphire | Blue cockpit | `#0a1628` |
| Midnight Slate | Warm amber | `#12100e` |
| Obsidian Forest | Green Whatsflow | `#0a1628` + `#25d366` |

Applied via `data-theme` attribute on `<html>`. CSS variables cascade.

## Key Libraries
Recharts (charts), DND Kit (drag&drop), React Hook Form + Zod (forms), html2canvas + jsPDF (export), Embla (carousel), Lucide (icons), Sonner (toasts)
