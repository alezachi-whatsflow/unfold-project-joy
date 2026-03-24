# 08 — Integrations (7 External Services)

## Map
```
Edge Functions → Asaas (Payments) | Meta (WA+IG) | uazapi (WA Web)
             → SMTP2GO (Email) | Firecrawl (Scrape) | Apify (Scrape) | OpenAI (AI)
```

## 1. Asaas — Payments (PIX, Boleto, CC)
- API: `api.asaas.com/v3`
- Functions: `create-checkout-payment`, `asaas-webhook`, `asaas-proxy`, `run-dunning`
- Secrets: `ASAAS_API_KEY`, `ASAAS_ENV`
- Checkout types: `new_account`, `upsell`, `renewal`

## 2. Meta — WhatsApp Cloud + Instagram
- API: `graph.facebook.com/v21.0`
- App ID: `440046068424112`
- Functions: `meta-oauth-start`, `meta-oauth-callback`, `meta-webhook`, `meta-send-message`, `meta-proxy`
- Secrets: `META_APP_ID`, `META_CLIENT_SECRET`, `META_SYSTEM_USER_TOKEN`, `META_BUSINESS_ID`
- OAuth: Embedded Signup (WA) + Standard OAuth (IG)
- DB: `channel_integrations`, `oauth_states`

## 3. uazapi — WhatsApp Web Proxy
- API: `whatsflow.uazapi.com`
- Auth: `admintoken` (admin) / `token` (instance)
- Functions: `uazapi-proxy`, `uazapi-webhook`, `setup-uazapi-webhook`, `sync-uazapi-messages`
- Secrets: `UAZAPI_BASE_URL`, `UAZAPI_ADMIN_TOKEN`
- DB: `whatsapp_instances`, `whatsapp_messages`, `whatsapp_leads`, `whatsapp_contacts`

## 4. SMTP2GO / SendGrid — Email
- API: `api.smtp2go.com/v3` or `api.sendgrid.com/v3` (auto-detect by key prefix)
- From: `Whatsflow <no-reply@whatsflow.com.br>`
- Functions: `invite-user`, `send-recovery-email`, `resend-activation-email`, `asaas-webhook`
- Secret: `SMTP2GO_API_KEY`
- Shared: `_shared/smtp.ts`

## 5. Firecrawl — Web Scraping
- API: `api.firecrawl.dev/v1`
- Functions: `firecrawl-scrape` (URL→markdown), `firecrawl-search` (query→results)
- Secret: `FIRECRAWL_API_KEY`

## 6. Apify — Data Scraping
- API: `api.apify.com/v2`
- Functions: `instagram-scraper` (actor: `apify~instagram-profile-scraper`), `google-business-scraper` (actor: `nwua9Gu5YrADL7ZDj`)
- Secret: `APIFY_API_KEY`

## 7. OpenAI — AI (Assistants API v2)
- API: `api.openai.com/v1`
- Assistant: `asst_0KNVoni5ifTXlllEsSoMPdH3`
- Model: `gpt-4o` | Config: `ai_configurations` table
- Functions: `instagram-ai-analysis`, `auditor-engine`, `generate-rescue-plan`, `ai-orchestrator`
- Shared: `_shared/ai.ts` → `callAI()` + `callAssistant()`
- Secret: `OPENAI_ASSISTANT_ID`
