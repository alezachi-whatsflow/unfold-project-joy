# 09 — Environment Variables and Infrastructure

## Frontend Environment (.env)

All frontend variables use `VITE_` prefix (Vite build-time injection).
The `.env` file is in `.gitignore` — values must be set per environment.

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Yes | `https://xxx.supabase.co` | Supabase project endpoint |
| `VITE_SUPABASE_ANON_KEY` | Yes | `eyJhbG...` | Supabase anonymous/public key |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Fallback | `sb_publishable_...` | Alternative key name (legacy) |
| `VITE_APP_URL` | No | `https://app.whatsflow.com.br` | Frontend production URL |
| `VITE_WHATSAPP_SUPPORT_NUMBER` | No | `5511954665605` | Default WhatsApp support |
| `VITE_META_APP_ID` | No | `440046068424112` | Meta App ID (public) |
| `VITE_META_WHATSAPP_CONFIG_ID` | No | `389404487314896` | WhatsApp Embedded Signup |
| `VITE_META_INSTAGRAM_CONFIG_ID` | No | `816342840311378` | Instagram OAuth config |
| `VITE_META_BUSINESS_ID` | No | `688498549631942` | Meta Business portfolio |

### Fallback Strategy
`src/integrations/supabase/client.ts` has inline fallbacks for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` because Railway builds without `.env`. These are public values (anon key is visible in browser).

## Edge Functions Secrets (Supabase)

Set via `npx supabase secrets set KEY=VALUE`.

### Auto-provided
| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (bypasses RLS) |
| `SUPABASE_DB_URL` | Direct Postgres connection |

### Application Secrets
| Secret | Used By | Description |
|--------|---------|-------------|
| `APP_URL` | invite-user, send-recovery-email, generate-access-link, asaas-webhook, meta-oauth-callback | Frontend URL for redirects |
| `META_APP_ID` | meta-oauth-start, meta-oauth-callback | Meta App identifier |
| `META_CLIENT_SECRET` | meta-oauth-callback | Meta OAuth secret |
| `META_SYSTEM_USER_TOKEN` | meta-oauth-callback | Meta admin token |
| `META_WEBHOOK_VERIFY_TOKEN` | meta-webhook | Webhook hub.verify token |
| `META_BUSINESS_ID` | meta-oauth-callback | Business portfolio ID |
| `META_WHATSAPP_CONFIG_ID` | meta-oauth-start | Embedded Signup config |
| `META_INSTAGRAM_CONFIG_ID` | meta-oauth-start | Instagram OAuth config |
| `UAZAPI_BASE_URL` | uazapi-proxy | uazapi server URL |
| `UAZAPI_ADMIN_TOKEN` | uazapi-proxy | uazapi admin token |
| `SMTP2GO_API_KEY` | _shared/smtp.ts | Email API key |
| `FIRECRAWL_API_KEY` | firecrawl-scrape | Web scraping key |
| `APIFY_API_KEY` | instagram-scraper | Instagram scraping |
| `OPENAI_ASSISTANT_ID` | instagram-ai-analysis, auditor-engine | AI Assistant ref |

## Infrastructure Map

```
GitHub (alezachi-whatsflow/unfold-project-joy)
  ├── push main → Railway (auto-build dist/ → static serve)
  ├── push main → GitHub Actions (migrations, optional)
  └── manual    → supabase functions deploy

Supabase Cloud (jtlrglzcsmqmapizqgzu)
  ├── PostgreSQL 15 (Database + RLS)
  ├── GoTrue (Auth — JWT email/password)
  ├── PostgREST (Auto REST API)
  ├── Realtime (WebSocket for whatsapp_messages)
  ├── Edge Functions (35+ on Deno Deploy)
  └── Storage (S3-compatible, not actively used)
```

## Security
1. `.env` in `.gitignore` — never committed
2. `SUPABASE_SERVICE_ROLE_KEY` never in frontend
3. Webhook endpoints use `--no-verify-jwt`
4. All other Edge Functions verify JWT
5. RLS on all tables
6. OAuth states expire in 15min
7. Activation tokens expire in 24h
