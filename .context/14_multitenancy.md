# 14 — Multi-tenancy

## Architecture
3-level hierarchy: **Nexus → WhiteLabel → Tenant**

```
Nexus (God-level admin)
├── WhiteLabel: VoiceCoder
│   ├── Tenant: Cliente A (license)
│   └── Tenant: Cliente B (license)
├── WhiteLabel: SendHit
│   ├── Tenant: Cliente C
│   └── ...
├── Direct Client: Tenant D (no WL)
└── Internal: Whatsflow EDTECH (00000001)
```

## Tenant Identification

### Frontend
- Hook: `useTenantId()` → resolves from `user_tenants` table
- All data hooks accept `tenantId` parameter
- Contexts (Financial, Asaas) auto-resolve tenant internally

### Backend (Edge Functions)
- `tenant_id` column on data tables
- Service role key bypasses RLS for cross-tenant operations
- Webhook handlers resolve tenant from integration records

### Database
- `user_tenants` table: maps `user_id` → `tenant_id`
- `get_my_tenant_ids()` function: returns tenant IDs for current user
- `get_my_role()` function: returns role from `profiles` table
- `is_nexus_user()` function: checks `nexus_users` table

## RLS (Row Level Security)
All tables have RLS enabled. Common policy patterns:

```sql
-- Users see own tenant data
USING (tenant_id IN (SELECT get_my_tenant_ids()))

-- Admins can manage
USING (get_my_role() IN ('admin', 'superadmin'))

-- Nexus users see all
USING (is_nexus_user())
```

## Key Tables

| Table | tenant_id? | Purpose |
|-------|-----------|---------|
| `tenants` | IS the tenant | Company/account records |
| `licenses` | Yes | License per tenant |
| `user_tenants` | Links user↔tenant | N:M relationship |
| `profiles` | Via user_id | User profiles with roles |
| `nexus_users` | — | Nexus admin users |
| `negocios` | Yes | CRM deals |
| `financial_entries` | Yes | Financial data |
| `whatsapp_messages` | Via instance | Messages |
| `channel_integrations` | Yes | Meta/WA channels |
| `ai_configurations` | Yes (nullable=global) | AI keys |

## WhiteLabel Isolation
- `whitelabel_config` table: display_name, logo, colors, support_email
- `parent_license_id` on licenses links sub-licenses to WL
- WL admins see only their sub-tenant data
- Branding applied via CSS variables (`--wl-primary`, etc.)

## Tenant Resolution Flow
```
User logs in → auth.uid()
  → user_tenants.tenant_id (WHERE user_id = auth.uid())
    → useTenantId() hook returns first tenant_id
      → All queries filter by tenant_id
```
