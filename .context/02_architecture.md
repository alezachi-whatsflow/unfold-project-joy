# 02 — Architecture

## Pattern: SPA + BaaS (Supabase) + Serverless Edge Functions

```
┌──────────────────────────────────────────────────────┐
│                     CLIENTS                           │
│  Browser (React SPA)  |  Mobile (PWA)                │
└──────────────┬───────────────────────────────────────┘
               │ HTTPS
┌──────────────▼───────────────────────────────────────┐
│              RAILWAY (Static Hosting)                  │
│  Serves: dist/ (Vite build output)                    │
│  Auto-deploy from GitHub main                         │
└──────────────┬───────────────────────────────────────┘
               │ HTTPS (REST + WebSocket)
┌──────────────▼───────────────────────────────────────┐
│              SUPABASE CLOUD                           │
│                                                       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │
│  │PostgREST│ │ GoTrue   │ │ Realtime │ │ Storage │  │
│  │(REST API)│ │(Auth/JWT)│ │(WebSocket│ │(S3)     │  │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └─────────┘  │
│       │           │            │                      │
│  ┌────▼───────────▼────────────▼─────┐               │
│  │         PostgreSQL 15              │               │
│  │  75 tables | RLS | 24 functions   │               │
│  │  56 migrations | 5 cron jobs      │               │
│  └───────────────────────────────────┘               │
│                                                       │
│  ┌───────────────────────────────────┐               │
│  │    Edge Functions (Deno Deploy)    │               │
│  │    35+ serverless functions        │──────────┐   │
│  └───────────────────────────────────┘           │   │
└──────────────────────────────────────────────────┘   │
                                                        │
┌───────────────────────────────────────────────────────┤
│                 EXTERNAL SERVICES                      │
│  Asaas (Payments) | Meta Graph API (WA+IG)            │
│  uazapi (WA Web)  | SMTP2GO (Email)                  │
│  Firecrawl (Scrape)| Apify (Scrape)                  │
│  OpenAI (AI)       |                                  │
└───────────────────────────────────────────────────────┘
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| No custom backend | Supabase Edge Functions sufficient; reduces infra |
| RLS for data isolation | Built into Postgres, enforced at DB level |
| JWT auth (not session) | Stateless, works with Edge Functions |
| Multi-provider WhatsApp | uazapi (legacy) + Meta Cloud API (official) |
| AI via Assistants API | Prompts managed in OpenAI platform, not code |
| CSS variables for themes | Runtime switching, no rebuild needed |
| Dynamic env vars | All URLs/IDs from .env, zero hardcoded |
| Shared DB, tenant isolation | Cost-effective, RLS enforces isolation |

## Data Flow Patterns

### Request → Response (typical)
```
Browser → supabase.from("table").select() → PostgREST → PostgreSQL (RLS) → JSON
```

### Edge Function call
```
Browser → supabase.functions.invoke("fn") → Edge Function → External API → Response
```

### Webhook (inbound)
```
External → Edge Function (no JWT) → PostgreSQL → Realtime → Browser (live update)
```

### Auth flow
```
Login → GoTrue → JWT → stored in memory → sent with every request
```
