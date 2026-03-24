# 17 — File Tree (Annotated)

```
WFW New/
├── src/                          # Application source (~300 files)
│   ├── App.tsx                   # Root: all routes, providers
│   ├── main.tsx                  # Entry point
│   ├── index.css                 # Global CSS + WA vars
│   ├── components/               # ~135 components
│   │   ├── ui/                   # 51 Shadcn/UI base components
│   │   ├── vendas/               # CRM: pipeline, negocio, relatorios
│   │   ├── whatsapp/             # Chat: panels, messages, input
│   │   ├── fiscal/               # Tax: NF-e, tributos, certificados
│   │   ├── asaas/                # Payments: cockpit, billing, split
│   │   ├── comissoes/            # Commissions: rules, dashboard
│   │   ├── intelligence/         # AI: analysis, prospecting
│   │   ├── integracoes/          # Meta channels UI
│   │   ├── mensageria/           # Messaging config
│   │   ├── nexus/                # Admin: team, timeline
│   │   ├── layout/               # Sidebar, command palette
│   │   ├── auth/                 # ProtectedRoute, PermissionGate
│   │   ├── settings/             # Tenant, checkout, sales config
│   │   ├── sales/wizard/         # 6-step sales wizard
│   │   ├── input/                # CSV import
│   │   ├── dashboard/            # KPI cards, charts
│   │   ├── ErrorBoundary.tsx     # Global error catch
│   │   └── MobileTabBar.tsx      # Floating mobile nav
│   ├── pages/                    # 38 route pages
│   │   ├── nexus/                # 14 Nexus admin pages
│   │   ├── wl/                   # 7 WhiteLabel pages
│   │   ├── superadmin/           # 5 SuperAdmin pages
│   │   ├── god-admin/            # 8 God Admin pages
│   │   ├── sistema/              # 4 system pages
│   │   └── *.tsx                 # Client portal pages
│   ├── hooks/                    # 18 custom hooks
│   ├── contexts/                 # 10 context providers
│   ├── types/                    # 16 type definitions
│   ├── lib/                      # 24 utilities + engines
│   ├── services/                 # 4 service modules
│   ├── config/                   # 4 config files
│   ├── styles/                   # 3 CSS (themes, glass, mensageria)
│   └── integrations/supabase/    # Client + types
├── supabase/
│   ├── config.toml               # Project ref
│   ├── migrations/               # 56 SQL migrations
│   └── functions/                # 35+ Edge Functions
│       ├── _shared/              # smtp.ts, ai.ts
│       ├── meta-*/               # Meta OAuth + webhook + send
│       ├── uazapi-*/             # uazapi proxy + webhook
│       ├── asaas-*/              # Payment proxy + webhook
│       ├── *-scraper/            # Firecrawl, Instagram, Google
│       ├── *-email/              # Invite, recovery, activation
│       └── auditor-*/            # AI audit engine
├── docs/                         # 21 documentation files
├── .context/                     # AI-ready docs (this folder)
├── .github/workflows/            # CI/CD
├── public/                       # Static + PWA
├── .env                          # Environment (gitignored)
├── package.json                  # Dependencies
├── vite.config.ts                # Build config
└── tailwind.config.ts            # Tailwind config
```

## Counts: ~560 files total (excl. node_modules)
