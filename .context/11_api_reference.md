# 11 — API Reference (Edge Functions)

All functions at: `https://{PROJECT_REF}.supabase.co/functions/v1/{name}`

## Auth & Users
| Function | Method | Auth | Input | Output |
|----------|--------|------|-------|--------|
| `invite-user` | POST | JWT (admin/nexus) | `{email, full_name, role, tenant_id, user_id}` | `{message, user_id}` |
| `send-recovery-email` | POST | None | `{email}` | `{success}` |
| `generate-access-link` | POST | JWT (admin/nexus) | `{email or user_id}` | `{link}` |
| `resend-activation-email` | POST | None | `{token}` | `{success}` |
| `activate-account` | POST | None | `{token}` | `{success}` |

## Meta OAuth & Messaging
| Function | Method | Auth | Input | Output |
|----------|--------|------|-------|--------|
| `meta-oauth-start` | POST | JWT | `{provider, tenant_id}` | `{auth_url, state}` |
| `meta-oauth-callback` | GET | State token | `?code=&state=` | Redirect |
| `meta-webhook` | GET | Verify token | `?hub.mode=&hub.verify_token=&hub.challenge=` | Challenge |
| `meta-webhook` | POST | None | Meta event payload | `OK` |
| `meta-send-message` | POST | JWT | `{phone_number_id, to, text, template}` | `{success, message_id}` |
| `meta-proxy` | POST | JWT | `{action, phone, message, phone_number_id}` | API response |

## uazapi (WhatsApp Web)
| Function | Method | Auth | Input | Output |
|----------|--------|------|-------|--------|
| `uazapi-proxy` | POST | JWT | `{path, method, body, instanceName}` | API response |
| `uazapi-webhook` | POST | None | uazapi event payload | `OK` |
| `setup-uazapi-webhook` | POST | None | — | Config results |
| `sync-uazapi-messages` | POST | None | — | Sync results |
| `check-uazapi-status` | POST | None | — | Status results |

## Payments (Asaas)
| Function | Method | Auth | Input | Output |
|----------|--------|------|-------|--------|
| `create-checkout-payment` | POST | None | `{session_id, payment_method}` | `{payment_id, pix_code, ...}` |
| `asaas-webhook` | POST | None | Asaas event payload | `{status}` |
| `asaas-proxy` | POST | None | `{endpoint, method, params, environment}` | API response |
| `run-dunning` | POST | None/Cron | `{environment}` | `{processed}` |

## AI & Intelligence
| Function | Method | Auth | Input | Output |
|----------|--------|------|-------|--------|
| `instagram-ai-analysis` | POST | JWT | `{profile}` | `{success, analysis}` |
| `auditor-engine` | POST | None | `{license_id, messages, config}` | `{status, score}` |
| `auditor-report` | POST | None | `{license_id, period_start, period_end}` | Report |
| `generate-rescue-plan` | POST | JWT | `{websiteData, instagramData, scores}` | `{rescuePlan}` |
| `ai-orchestrator` | POST | None | `{license_id, conversation_id, message}` | `{skills_called}` |

## Scraping
| Function | Method | Auth | Input | Output |
|----------|--------|------|-------|--------|
| `firecrawl-scrape` | POST | JWT | `{url}` | `{success, title, markdown, links}` |
| `firecrawl-search` | POST | JWT | `{query, options}` | Search results |
| `instagram-scraper` | POST | JWT | `{username}` | `{profile}` |
| `google-business-scraper` | POST | JWT | `{query}` | `{business, lead_id}` |

## File Management
| Function | Method | Auth | Input | Output |
|----------|--------|------|-------|--------|
| `encrypt-old-files` | POST/Cron | None | — | `{encrypted, failed}` |
| `delete-device-files` | POST/Cron | None | — | `{processed, bytes_freed}` |

## PostgREST (Auto-generated)
All tables accessible via `https://{REF}.supabase.co/rest/v1/{table}` with RLS.
