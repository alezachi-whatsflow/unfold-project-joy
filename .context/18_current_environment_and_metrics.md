# 18 — Current Environment and Metrics

## Production Topology

```
┌─────────────────────────────────────────────────────┐
│                    INTERNET                          │
│                                                     │
│  Users → HTTPS → Railway (SPA) → Supabase APIs     │
│  Meta  → HTTPS → Supabase Edge Functions (Webhooks) │
│  uazapi → HTTPS → Supabase Edge Functions (Webhooks)│
│  Asaas  → HTTPS → Supabase Edge Functions (Webhooks)│
└─────────────────────────────────────────────────────┘

┌─────────────────┐  ┌──────────────────────────────────┐
│   Railway       │  │   Supabase Cloud                  │
│                 │  │   Region: us-east-1 (AWS)         │
│ Service:        │  │   Project: self-hosted              │
│  unfold-project │  │                                    │
│  -joy-production│  │ ┌─────────────┐ ┌──────────────┐  │
│                 │  │ │ PostgreSQL  │ │ GoTrue Auth  │  │
│ Build: npm run  │  │ │ (Database)  │ │ (JWT tokens) │  │
│  build          │  │ └─────────────┘ └──────────────┘  │
│ Serve: static   │  │ ┌─────────────┐ ┌──────────────┐  │
│  files (dist/)  │  │ │ PostgREST   │ │ Realtime     │  │
│                 │  │ │ (REST API)  │ │ (WebSocket)  │  │
│ Auto-deploy:    │  │ └─────────────┘ └──────────────┘  │
│  GitHub push    │  │ ┌─────────────┐ ┌──────────────┐  │
│  to main        │  │ │ Edge Funcs  │ │ Storage      │  │
│                 │  │ │ (Deno Deploy│ │ (S3-compat)  │  │
│ Region:         │  │ │  35+ funcs) │ │              │  │
│  europe-west4   │  │ └─────────────┘ └──────────────┘  │
└─────────────────┘  └──────────────────────────────────┘
```

## Infrastructure Details

### Railway
| Property | Value |
|----------|-------|
| Service URL | `unfold-project-joy-production.up.railway.app` |
| Region | `europe-west4-drams3a` |
| Replicas | 1 |
| Build Command | `npm run build` (Vite) |
| Deploy Trigger | Auto-deploy on push to `main` |
| GitHub Repo | `alezachi-whatsflow/unfold-project-joy` |

### Supabase Cloud
| Property | Value |
|----------|-------|
| Project Ref | `self-hosted` (supabase.whatsflow.com.br) |
| Region | AWS us-east-1 |
| Plan | Free Tier |
| Database | PostgreSQL 15 |
| Edge Functions | 35+ deployed (Deno Deploy) |
| Auth | GoTrue (JWT, email+password) |
| Realtime | Enabled on `whatsapp_messages`, `whatsapp_instances` |
| RLS | Enabled on all tables |

### External Services
| Service | Purpose | Endpoint |
|---------|---------|----------|
| Asaas | Payment gateway (PIX, Boleto, CC) | `api.asaas.com/v3` |
| uazapi | WhatsApp Web proxy (legacy) | `whatsflow.uazapi.com` |
| Meta Graph API | WhatsApp Cloud + Instagram | `graph.facebook.com/v21.0` |
| SMTP2GO | Transactional email | `api.smtp2go.com/v3` |
| Firecrawl | Web scraping | `api.firecrawl.dev/v1` |
| Apify | Instagram scraping | `api.apify.com/v2` |
| OpenAI | AI analysis (Assistants API) | `api.openai.com/v1` |

## Access Control

### Supabase Secrets (Edge Functions)
| Secret | Purpose | Set? |
|--------|---------|------|
| SUPABASE_URL | Supabase project URL | Yes (auto) |
| SUPABASE_SERVICE_ROLE_KEY | Admin DB access | Yes (auto) |
| SUPABASE_ANON_KEY | Public API key | Yes (auto) |
| APP_URL | Production frontend URL | Yes |
| META_APP_ID | Meta App identifier | Yes |
| META_CLIENT_SECRET | Meta OAuth secret | Yes |
| META_SYSTEM_USER_TOKEN | Meta admin token | Yes |
| META_WEBHOOK_VERIFY_TOKEN | Webhook verification | Yes |
| META_BUSINESS_ID | Meta Business portfolio | Yes |
| META_WHATSAPP_CONFIG_ID | Embedded Signup config | Yes |
| META_INSTAGRAM_CONFIG_ID | Instagram OAuth config | Yes |
| UAZAPI_BASE_URL | uazapi server URL | Yes |
| UAZAPI_ADMIN_TOKEN | uazapi admin auth | Yes |
| SMTP2GO_API_KEY | Email sending | Yes |
| FIRECRAWL_API_KEY | Web scraping | Yes |
| APIFY_API_KEY | Instagram scraping | Yes |
| OPENAI_ASSISTANT_ID | AI Assistant reference | Yes |

### Frontend Environment (.env)
| Variable | Purpose |
|----------|---------|
| VITE_SUPABASE_URL | Supabase endpoint |
| VITE_SUPABASE_ANON_KEY | Public API key |
| VITE_APP_URL | Frontend URL |
| VITE_META_APP_ID | Meta App ID (public) |
| VITE_META_WHATSAPP_CONFIG_ID | WhatsApp config |
| VITE_META_INSTAGRAM_CONFIG_ID | Instagram config |
| VITE_META_BUSINESS_ID | Business portfolio |
| VITE_WHATSAPP_SUPPORT_NUMBER | Support WhatsApp |

## Volumetry and Metrics

### Database
| Table | Rows (approx) | Growth Rate |
|-------|---------------|-------------|
| licenses | 717 | Low (manual import) |
| tenants | 700+ | Matches licenses |
| negocios | ~50 | Growing (CRM active) |
| whatsapp_messages | Growing | Real-time via webhook |
| whatsapp_instances | 15 | Low |
| channel_integrations | 1 | New (Meta Cloud API) |
| profiles | ~50 | Matches users |
| financial_entries | ~20 | Monthly input |
| web_scraps | ~30 | Per analysis |
| ai_configurations | 1 | Global config |

### Active Users
| Role | Count | Access |
|------|-------|--------|
| Nexus Superadmin | 1 (Alessandro Zachi) | Full system |
| Tenant Admins | 2-3 | Per-tenant |
| Gestors | ~5 | Per-tenant, limited |
| STATUS: Total auth users | ~50 | NÃO CONFIRMADO (estimate from profiles) |

### WhatsApp Instances (uazapi)
| Instance | Status | Phone |
|----------|--------|-------|
| Teste Ale SP | Connected | +55 16 97616-1720 |
| DEVS_teste | Connected | +55 43 9644-3912 |
| + 13 others | Mixed | Various |

### Meta Cloud API
| Channel | Status | Phone |
|---------|--------|-------|
| Whatsflow Edtech Ltda | Active | +1 555-926-7154 (TEST) |
| STATUS: Production number | NOT CONNECTED | Pending real number |

## Known Bottlenecks
1. **Railway region** (europe-west4) adds latency for Brazilian users (~150ms extra vs São Paulo)
2. **Supabase Free Tier** limits: 500MB database, 1GB file storage, 2M Edge Function invocations/month
3. **Single Railway replica** — no horizontal scaling
4. **No CDN** — static assets served directly from Railway
5. **WhatsApp messages table** grows unbounded — no archival policy

## Telemetry
- STATUS: NÃO CONFIRMADO — No application-level telemetry (APM, error tracking, analytics) detected in codebase
- Railway provides basic metrics (CPU, memory, requests)
- Supabase Dashboard provides DB metrics and Edge Function logs
