# 05 — Database Schema

## Engine: PostgreSQL 15 (Supabase Cloud)
## Tables: 75 | Functions: 24 | Triggers: 7 | Cron Jobs: 5 | Materialized Views: 2

---

## Core Multi-Tenant Tables

| Table | PK | Key Columns | Purpose |
|-------|----|-----------  |---------|
| `tenants` | UUID | name, slug(UNIQUE), cpf_cnpj, email, plan, status | Company records |
| `accounts` | UUID | name, slug(UNIQUE), account_type, parent_id, whitelabel_id | Hierarchical (WL) |
| `profiles` | UUID (FK auth.users) | full_name, role, custom_permissions, license_id, invitation_status | User profiles |
| `user_tenants` | UUID | user_id, tenant_id, is_owner | User↔Tenant N:M |
| `licenses` | UUID | tenant_id, plan, status, license_type, parent_license_id, monthly_value, expires_at | License per tenant |
| `whitelabel_config` | UUID | license_id, slug(UNIQUE), display_name, logo_url, primary_color | WL branding |
| `nexus_users` | UUID | auth_user_id(UNIQUE), name, email(UNIQUE), role | Internal admin team |

## CRM & Sales

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `negocios` | tenant_id, titulo, status, origem, valor_total, consultor_nome, pipeline_id | CRM deals |
| `sales_pipelines` | tenant_id, name, stages(JSONB), is_default | Pipeline config |
| `crm_contacts` | tenant_id, name, phone, email, stage, source | Unified contacts |
| `company_profile` | tenant_id(UNIQUE), segment, avg_ticket, wizard_completed | Company ICP setup |
| `icp_profiles` | tenant_id, criteria(JSONB), hot/warm thresholds | Ideal customer profile |
| `activities` | tenant_id, title, status, priority, assigned_to | Activity tracking |

## WhatsApp & Messaging

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `whatsapp_instances` | session_id(UNIQUE), instance_name, instance_token, status | uazapi instances |
| `whatsapp_messages` | instance_name, remote_jid, message_id(UNIQUE), direction, status | Message log |
| `whatsapp_contacts` | instance_name+phone(UNIQUE), jid, push_name | Contact cache |
| `whatsapp_leads` | instance_name+chat_id(UNIQUE), lead_status, assigned_attendant_id | Lead CRM |
| `whatsapp_connections` | tenant_id, type, phone_number_id, waba_id | Meta API connections |
| `conversations` | tenant_id, contact_id, status, channel, unread_count | Unified conversations |
| `chat_messages` | tenant_id, conversation_id, direction, content, wa_message_id | Conversation messages |
| `channel_integrations` | tenant_id, provider(WABA/INSTAGRAM), phone_number_id, access_token | Meta OAuth integrations |
| `oauth_states` | state_token(UNIQUE), provider, expires_at, used | OAuth anti-CSRF |

## Financial & Payments

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `financial_entries` | month(UNIQUE), mrr, costs, customers, cash_balance, tenant_id | Monthly SaaS metrics |
| `asaas_payments` | tenant_id+asaas_id(UNIQUE), status, value, billing_type | Payment records |
| `asaas_customers` | tenant_id+asaas_id(UNIQUE), name, cpf_cnpj | Asaas customers |
| `asaas_revenue` | tenant_id, value, date, category, status | Revenue tracking |
| `asaas_expenses` | tenant_id, value, date, category, is_paid | Expense tracking |
| `checkout_sessions` | checkout_type, buyer_email, plan, status, asaas_payment_id | Checkout flow |
| `activation_tokens` | token(UNIQUE), checkout_session_id, status, expires_at | Account activation |
| `dunning_rules` | tenant_id, rules(JSONB), status | Payment dunning |
| `commission_rules` | tenant_id, product_name, installment_rates(JSONB) | Commission rules |

## AI & Intelligence

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `ai_configurations` | provider, api_key, model, is_global, tenant_id | AI provider config |
| `audit_evaluations` | license_id, conversation_id, overall_score, criteria_scores | Quality audit |
| `audit_reports` | license_id, period, avg_score, attendant_ranking | Audit reports |
| `web_scraps` | url, title, raw_markdown, status | Website analysis |
| `profiles_analysis` | username, followers, authority_score | Instagram analysis |
| `business_leads` | name, rating, reviews_count, place_id | Google Business |
| `knowledge_base` | license_id, category, title, content | AI knowledge |

## Data Lifecycle & Security

| Table | Purpose |
|-------|---------|
| `data_lifecycle_queue` | Encryption/deletion operations queue |
| `tenant_encryption_keys` | AES-256-GCM keys per tenant |
| `data_lifecycle_audit` | Immutable operation log (LGPD) |

## Key Database Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `get_my_role()` | TEXT | Current user's role from profiles |
| `get_my_tenant_ids()` | SETOF UUID | User's tenant IDs |
| `is_nexus_user()` | BOOLEAN | Check if nexus admin |
| `is_superadmin()` | BOOLEAN | Check superadmin role |
| `calculate_mrr(license_id)` | DECIMAL | Monthly recurring revenue |
| `soft_delete_tenant(id)` | JSONB | 30-day grace deletion |
| `hard_delete_tenant(id)` | JSONB | Permanent cascade delete |
| `delete_device_cascade(id)` | JSONB | Soft delete device + data |
| `generate_tenant_encryption_key(id)` | TEXT | AES-256 key generation |

## RLS Policy Patterns
```sql
-- Tenant isolation
USING (tenant_id IN (SELECT get_my_tenant_ids()))
-- Admin override
USING (get_my_role() IN ('admin', 'superadmin'))
-- Nexus access
USING (is_nexus_user())
```

## Cron Jobs (pg_cron)
| Schedule | Job | Purpose |
|----------|-----|---------|
| Hourly | process-device-file-deletions | Delete orphan files |
| 02:00 BRT | queue-files-for-encryption | Queue old files |
| 03:00 BRT | process-file-encryption | AES-256 encrypt |
| 01:00 BRT | process-tenant-deletions | Hard delete after 30d |
| Weekly | cleanup-cron-history | Cleanup logs |

## Migrations: 56 files (2026-03-05 → 2026-03-23)
