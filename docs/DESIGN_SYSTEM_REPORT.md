# === RELATÓRIO DE DESIGN SYSTEM — WHATSFLOW ===
**Data:** 28/03/2026 | **Gerado por:** Antigravity AI Architect

---

## [1] ARQUIVOS DE TEMA

### 1.1 `tailwind.config.ts`
- **Fonte:** Inter (system-ui fallback)
- **Dark mode:** class-based (`darkMode: ["class"]`)
- **Container:** max 1400px, centered, 2rem padding
- **Cores:** Sistema HSL via CSS variables (primary, secondary, destructive, muted, accent, success, warning, chart 1-5, sidebar variants)
- **Border-radius:** `var(--radius)`, `calc(var(--radius) - 2px)`, `calc(var(--radius) - 4px)`
- **Animações:** accordion-down/up, fade-in-up, fade-in, scale-in, slide-in-right, shimmer
- **Plugins:** tailwindcss-animate

### 1.2 `src/index.css` (471 linhas)
- Tailwind directives com @layer
- Imports: liquid-glass.css, mensageria-redesign.css
- Argon Dashboard default theme (HSL tokens em :root)
- WhatsApp Messenger theme tokens (--wa-*)
- Fluid typography: text-fluid-xs → text-fluid-4xl
- 10+ keyframe animations

### 1.3 `src/styles/themes.css` (458 linhas)
**3 temas completos via `[data-theme="X"]`:**

| Tema | Primary Accent | Background | Propósito |
|------|---------------|------------|-----------|
| **Café Noturno** | `#e8a84a` (amber) | `#18140f` (dark brown) | Uso prolongado, elimina luz azul |
| **Pacífico** | `#0e8a5c` (emerald) | `#f5f2ed` (warm off-white) | Ambientes claros, reduz brilho |
| **Cosmos** | `#5b9ef7` (sky blue) | `#06080f` (navy black) | Alto contraste, power users |

Cada tema inclui 80+ CSS custom properties cobrindo: shadcn/UI, glass effects, borders, text, accent layers, WhatsApp overrides, bubble colors.

### 1.4 `src/styles/liquid-glass.css` (181 linhas)
- Glass tokens: --glass-bg-1/2/3, --glass-blur-sm/md/lg (8/16/24px)
- Componentes: .glass, .glass-dark, .glass-light, .glass-accent, .glass-sidebar, .glass-header, .glass-card, .glass-modal, .glass-popover, .glass-input
- Acessibilidade: @media (prefers-reduced-motion) desabilita blur

### 1.5 `src/styles/mensageria-redesign.css` (421 linhas)
- Base: #FAFAF8 (off-white), borders: #E8E5DF
- Active accent: rgba(14,138,92,0.08/0.25)
- --inbox-radius: 10px, --inbox-radius-lg: 12px
- Componentes: msg-conv-item, msg-chat-header, msg-pill, msg-bubble-in/out, msg-date-sep, kanban-column/card, sla-dot, toggle-pill

---

## [2] TIPOGRAFIA

| Token/Classe | Valor |
|---|---|
| **Família principal** | `Inter`, system-ui, sans-serif |
| **Família display** | `Inter`, system-ui, sans-serif |
| text-fluid-xs | clamp(0.65rem, 0.6rem + 0.2vw, 0.75rem) |
| text-fluid-sm | clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem) |
| text-fluid-base | clamp(0.875rem, 0.8rem + 0.3vw, 1rem) |
| text-fluid-lg | clamp(1rem, 0.9rem + 0.4vw, 1.125rem) |
| text-fluid-xl | clamp(1.125rem, 1rem + 0.5vw, 1.25rem) |
| text-fluid-2xl | clamp(1.375rem, 1.2rem + 0.7vw, 1.75rem) |
| text-fluid-3xl | clamp(1.75rem, 1.5rem + 1vw, 2.25rem) |
| text-fluid-4xl | clamp(2rem, 1.7rem + 1.2vw, 2.75rem) |
| **Pesos usados** | 400 (normal), 500 (medium), 600 (semibold), 700 (bold) |
| **Tamanhos inline** | text-[9px], text-[10px], text-[11px], text-[13px], text-xs, text-sm |
| **Tracking** | tracking-wider (uppercase labels), tracking-tight (KPI values) |

---

## [3] COMPONENTES

### 3.1 Sidebar (`AppSidebar.tsx` — 622 linhas)
- 4 modos de layout: grouped cards, dual-rail, spotlight, custom
- Smart badges com contagem em tempo real via Supabase
- Mobile drawer com collapse/expand
- User footer com role-based colors + theme switcher
- Classes: `px-2 py-1`, `gap-3`, `border-t border-black/[0.06]`, `hover:bg-black/[0.04]`
- Glass: `backdrop-filter: blur(40px) saturate(180%)`

### 3.2 KPI Card (`KPICard.tsx` — 141 linhas)
- 4 accent variants: primary, accent, warning, destructive
- Icon com bg transparente (15% opacity)
- Trend badge (up/down) com cores semânticas
- Classes: `p-5`, `border`, `bg-card`, `hover:-translate-y-1`, `animate-fade-in-up`

### 3.3 Card de Conversa (`ConversationItem.tsx` — 143 linhas)
- Avatar 42×42px com badge unread (top-left) e channel (bottom-right)
- Preview truncado, SLA breach indicator, search highlight, tags
- Classes: `px-4 py-3`, `gap-3`, `border-b border-border/50`, `hover:bg-muted/50`

### 3.4 Barra de Ações
- Botões: Transferir, Finalizar, IA: ON, Tag, Notas, Criar Lead, Mais
- Estilo pill: `msg-pill` com variants (green, blue, orange, gray)

### 3.5 Kanban Column (`GroupKanbanColumn.tsx` — 52 linhas)
- @dnd-kit/core para drag-and-drop
- Header: color dot + nome + counter badge + SLA badge
- Classes: `kanban-column`, `min-width: 280px`, `width: 300px`

### 3.6 Modal (`NegocioCreateModal.tsx` — 620 linhas)
- Wizard 4 steps com progress bar
- Shadcn Dialog + Form components
- Classes: `space-y-4`, `grid grid-cols-1 sm:grid-cols-2 gap-3`, `h-8 text-xs`

---

## [4] ESPAÇAMENTO E BORDAS

| Elemento | Valor |
|---|---|
| **Card padding** | p-5 (20px), p-3 (12px), px-4 py-3 (16/12px) |
| **Gap padrão** | gap-2 (8px), gap-3 (12px) |
| **Gap compacto** | gap-0.5 (2px), gap-1 (4px), gap-1.5 (6px) |
| **Border-radius cards** | 10px (--inbox-radius), 12px (--inbox-radius-lg), 16px (glass) |
| **Border-radius pills** | rounded-full (999px) |
| **Border-radius botões** | Shadcn default (var(--radius)) |
| **Border padrão** | 1px solid, `border-border`, `border-border/50`, `border-black/[0.06]` |
| **Sidebar item height** | ~36-40px (py-1 + conteúdo) |
| **Botão mínimo** | h-8 (32px), h-9 (36px), h-10 (40px) |

---

## [5] CORES DE STATUS

### Semântica
| Elemento | Cor | Classe/Hex |
|---|---|---|
| **Sucesso** | Verde | `text-success`, `bg-success/10`, HSL var |
| **Erro/Negativo** | Vermelho | `text-destructive`, `bg-destructive/10`, `text-red-500` |
| **Atenção/Pendente** | Amarelo/Amber | `text-warning`, `bg-warning/15`, `#e8a84a` |
| **Informação** | Azul | `text-primary` (cosmos), `#5b9ef7` |
| **SLA OK** | Verde | `.sla-dot.ok` com glow |
| **SLA Warning** | Amarelo | `.sla-dot.warn` |
| **SLA Critical** | Vermelho | `.sla-dot.critical` com glow |

### Canais de Origem
| Canal | Background | Ícone |
|---|---|---|
| WA Web | `#25D366` | WhatsApp branco |
| WA Meta (Cloud API) | `#000000` | WhatsApp verde `#25D366` |
| Instagram | Gradiente `#f58529→#dd2a7b→#8134af` | Câmera branca |
| Facebook | `#1877F2` | "f" branco |
| Telegram | `#229ED9` | Avião branco |
| Webchat | `#11bc76` | Chat branco |
| Mercado Livre | `#FFE600` | Balão azul `#3483FA` |

### Pipeline (Café Noturno / Pacífico / Cosmos)
- Prospecção, Qualificado, Proposta, Negociação, Fechado — cores definidas pelo tema ativo

---

## [6] RESPONSIVIDADE

| Item | Valor |
|---|---|
| **Breakpoints** | sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1400px (container) |
| **Grid patterns** | `grid-cols-1 sm:grid-cols-2`, `grid-cols-2 md:grid-cols-4` |
| **Sidebar mobile** | Drawer overlay com collapse/expand, backdrop blur |
| **Kanban mobile** | Scroll horizontal via `overflow-x-auto` |
| **PWA safe area** | `--safe-area-inset-*` para notch support |
| **Telas mobile** | Sem componentes exclusivos — responsivo via Tailwind |

---

## [7] ÍCONES

| Item | Valor |
|---|---|
| **Biblioteca** | Lucide React v0.462.0 |
| **Tamanho sidebar** | 18-20px (`h-5 w-5`) |
| **Tamanho cards** | 14-16px (`h-4 w-4`, `h-3.5 w-3.5`) |
| **Tamanho barra ações** | 12-14px inline |
| **Tamanho botões** | 16px (`h-4 w-4`) |

---

## [8] ANIMAÇÕES E TRANSIÇÕES

### Keyframes definidos:
| Nome | Duração | Easing |
|---|---|---|
| accordion-down/up | 0.2s | ease-out |
| fade-in-up | 0.4s | ease-out |
| fade-in | 0.3s | ease-out |
| scale-in | 0.2s | ease-out |
| slide-in-right | 0.3s | ease-out |
| shimmer | 2s | linear infinite |
| home-slide-down | 0.7s | cubic-bezier(0.16,1,0.3,1) |
| home-card-in | 0.5s | cubic-bezier(0.16,1,0.3,1) |
| messageIn | 0.2s | ease-out |
| typingDot | 1.4s | ease-in-out infinite |
| bar-grow | 1s | cubic-bezier(0.4,0,0.2,1) |

### Transições CSS:
- `transition-all duration-300` (cards, hover effects)
- `transition-colors` (botões, links)
- `--transition-fast: 120ms`, `--transition-base: 200ms` (custom)

### Drag & Drop:
- @dnd-kit/core + @dnd-kit/sortable para Kanban
- `.drag-over` com border-color change

### Loading States:
- Shimmer animation em skeletons
- `animate-spin` em loaders
- `opacity-0 animate-fade-in-up` com staggered delays

---

## [9] ESTRUTURA DE ARQUIVOS

```
src/components/
├── activities/        (Calendar, FormDialog, Kanban)
├── asaas/             (5 panels + billing)
├── auth/              (PermissionGate, ProtectedRoute)
├── billing/           (FaturaView)
├── comissoes/         (3 commission tabs)
├── customers/         (FormDialog, TableFilters)
├── dashboard/         (7 chart & KPI components)
├── fiscal/            (9 tax components)
├── input/             (5 data input)
├── integracoes/       (MetaChannelsTab)
├── intelligence/      (12+ AI modules)
├── layout/            (AppSidebar, DashboardLayout, CommandPalette, ThemeSwitcher)
├── license/           (AlertBanner, LimitModal)
├── mensageria/        (20+ inbox/messaging)
├── nexus/             (Admin panels)
├── sales/             (Sales modals)
├── settings/          (Preferences)
├── tour/              (Tutorial)
├── ui/                (Shadcn base: 40+ primitives)
├── users/             (User management)
├── vendas/            (15+ pipeline/sales)
├── webchat/           (Widget)
└── whatsapp/          (20+ WA integration)

src/pages/             (35 page files)
src/styles/            (3 CSS files: themes, liquid-glass, mensageria-redesign)
```

---

## [10] DEPENDÊNCIAS DE UI

### Tailwind & CSS
- tailwindcss `^3.4.17`
- tailwind-merge `^2.6.0`
- tailwindcss-animate `^1.0.7`
- @tailwindcss/typography `^0.5.16`
- autoprefixer, postcss

### Radix UI (28 packages)
accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip

### Ícones & Visuais
- lucide-react `^0.462.0`
- embla-carousel-react `^8.6.0`
- recharts `^2.15.4`

### Drag & Drop
- @dnd-kit/core `^6.3.1`
- @dnd-kit/sortable `^10.0.0`
- @dnd-kit/utilities `^3.2.2`

### Forms & State
- react-hook-form `^7.61.1`
- @hookform/resolvers `^3.10.0`
- zod `^3.25.76`
- class-variance-authority `^0.7.1`
- clsx `^2.1.1`

### Temas
- next-themes `^0.3.0`

### Notificações
- sonner `^1.7.4`

### Datas
- date-fns `^3.6.0`
- react-day-picker `^8.10.1`

### Utilidades UI
- cmdk `^1.1.1` (command palette)
- input-otp `^1.4.2`
- vaul `^0.9.9` (drawer)
- react-resizable-panels `^2.1.9`
- react-markdown `^10.1.0`

### Exports
- html2canvas `^1.4.1`
- jspdf `^4.2.0`

### Data & Network
- @tanstack/react-query `^5.83.0`
- @supabase/supabase-js `^2.98.0`
- react-router-dom `^6.30.1`

---

---

## [11] NEXUS ADMIN PANEL — AUDITORIA COMPLETA

### Arquitetura
- **Rota:** `/nexus/login` → `/nexus` (NexusLayout wrapper)
- **Auth:** Supabase Auth + tabela `nexus_users`
- **Tema:** Glass morphism (`glass-ambient-bg`, `glass-sidebar`) + forest theme (emerald)
- **RBAC:** 6 roles com matrix de acesso granular

### Roles e Permissões

| Role | Label | Cor | Acesso |
|------|-------|-----|--------|
| `nexus_superadmin` | SuperAdmin | red-400 | Tudo (13 módulos) |
| `nexus_dev_senior` | Dev Senior | purple-400 | Dashboard, Licenças, WhiteLabels, Lifecycle, Auditoria, Flags, Tickets, Integrações |
| `nexus_suporte_senior` | Suporte Senior | blue-400 | Dashboard, Licenças, WhiteLabels, Tickets, Auditoria |
| `nexus_financeiro` | Financeiro | amber-400 | Dashboard, Financeiro, Licenças, Checkouts |
| `nexus_suporte_junior` | Suporte Junior | emerald-400 | Dashboard, Licenças, Tickets |
| `nexus_customer_success` | Customer Success | cyan-400 | Dashboard, Licenças, WhiteLabels, Tickets |

### Navegação (13 módulos)
```
Dashboard → Licenças → Integrações → WhiteLabels → Checkouts
→ Financeiro → Equipe → Auditoria → Feature Flags
→ Tickets → Lifecycle → I.A. Config → Configurações (Sync)
```

### Tabelas do Banco de Dados

| Tabela | Propósito | Campos-chave |
|--------|-----------|-------------|
| `nexus_users` | Equipe interna | auth_user_id, role, is_active, invite_sent_at |
| `licenses` | Gestão de licenças | tenant_id, status, plan, monthly_value, recursos, AI |
| `tenants` | Contas de clientes | name, slug, email, cpf_cnpj, deleted_at |
| `nexus_audit_logs` | Trail de auditoria | actor_id, action, target_entity, old/new_value, ip |
| `nexus_tickets` | Suporte interno | title, priority, status, assigned_to, license_id |
| `nexus_feature_flags` | Controle de features | flag_key, default_value, is_global |
| `ai_configurations` | Provedores IA | provider, model, api_key, is_global |
| `whatsapp_providers` | Provedores WA | name, slug, base_url, admin_token, max_instances |
| `checkout_sessions` | Links de pagamento | status, checkout_type, buyer_*, plan, monthly_value |
| `nexus_license_usage` | Uso mensal | messages_sent, storage_used_gb, active_devices |
| `data_lifecycle_queue` | LGPD/GDPR | operation_type, status, scheduled_for |
| `data_lifecycle_audit` | Compliance | records_affected, files_deleted, storage_freed |
| `tenant_sync_logs` | Sync de config | source/target_tenant_ids, scope, items_synced |

### Funcionalidades por Módulo

**Dashboard:** KPIs globais (MRR, licenças ativas, inadimplentes, expirando em 30d, tickets abertos), licenças críticas (15d)

**Licenças:** Tabela com filtro/busca, detalhe com uso de recursos (devices, atendentes, mensagens, storage), sub-licenças WhiteLabel, notas internas, bloqueio/desbloqueio, fatura

**Integrações:** 8 KPIs (Total, WA Connected, WA Disconnected, Sem Webhook, Meta, Telegram, ML, Webchat), providers com toggle/default, conexões por cliente expandível

**Equipe:** Timeline de onboarding (invite→access→login), badges por role, CRUD de membros

**Financeiro:** MRR, ARR, Ticket Médio, Churn, tabela de billing com export CSV

**Checkouts:** Criar links de pagamento (new_account/upsell/renewal), buyer details, plano, add-ons, recursos extras, gateway Asaas

**Auditoria:** Log paginado (100/page), filtro por ação (20+ tipos), busca, export CSV

**Feature Flags:** Toggle global/por-licença, CRUD de flags

**Tickets:** CRUD interno, prioridade (baixa→crítica), atribuição, filtro por status

**Lifecycle (LGPD):** Fila de operações (encrypt, delete), audit log, resumo de storage, re-queue de falhas

**Config Sync:** 11 escopos sincronizáveis, batch 50 tenants, agendamento (manual/once/recurring), progress bar

**I.A. Config:** OpenAI/Anthropic/Gemini, global ou por-tenant, modelos configuráveis

### Padrões de Styling Nexus

| Pattern | Classes |
|---------|---------|
| KPI cards | `grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4`, `bg-card/50 border-border/50` |
| Status badges | `bg-emerald-500/20 text-emerald-400` (ativo), `bg-red-500/20 text-red-400` (bloqueado) |
| Glass effects | `glass-ambient-bg`, `glass-sidebar`, `glass-header` |
| Role badges | red=superadmin, purple=dev, blue=support, amber=finance, emerald=junior, cyan=CS |
| Action badges (audit) | emerald=login, blue=edit/create, red=block, purple=impersonate, cyan=flag, amber=import |
| Checkout types | blue=new_account, purple=upsell, teal=renewal |

### Segurança

- **RLS:** `is_nexus_user()` function + policies por tabela
- **Audit trail:** Toda ação logada em `nexus_audit_logs`
- **LGPD/GDPR:** Soft delete → grace period → hard delete
- **API keys:** Mascaradas (primeiros 8 + últimos 4 chars)
- **Impersonation:** Logada como ação de auditoria

### Valores Hardcoded

| Valor | Uso |
|-------|-----|
| `00000000-0000-0000-0000-000000000001` | Tenant fonte para sync |
| 100 | Page size (audit, CSV batch) |
| 50 | Batch de sync por vez |
| 30 dias | Threshold de expiração |
| 15 dias | Licença crítica |
| 80% | Warning de uso de recursos |
| 3:00 AM | Horário default de sync recorrente |

---

# === FIM DO RELATÓRIO ===
