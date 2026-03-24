# 15 — Known Issues and Technical Debt

## CRITICAL

### 1. Meta Cloud API — Test Number Only
- **Issue:** Only test number `+1 555-926-7154` connected. Cannot send to real phones.
- **Fix:** Add real Brazilian number in Meta WhatsApp Manager.
- **Impact:** Meta Cloud API channel non-functional for production messaging.

### 2. Railway Region Latency
- **Issue:** Railway deploys to `europe-west4` (Netherlands), adding ~150ms for Brazilian users.
- **Fix:** Migrate to VPS in São Paulo (see `docs/Playbook-Migracao-Servidor-Multi-Dev.md`).

## MAJOR

### 3. No Application Telemetry
- **Issue:** No APM, error tracking, or analytics (Sentry, DataDog, etc.).
- **Impact:** Errors in production are invisible unless user reports.
- **Fix:** Add Sentry or similar.

### 4. Supabase Free Tier Limits
- **Issue:** 500MB database, 1GB storage, 2M edge function invocations/month.
- **Risk:** May hit limits as usage grows.
- **Fix:** Upgrade to Pro ($25/mo) when approaching limits.

### 5. No CDN for Static Assets
- **Issue:** Railway serves static files directly, no CDN caching.
- **Impact:** Slower page loads, especially for repeat visitors.
- **Fix:** Add Cloudflare or similar CDN in front.

## MEDIUM

### 6. WhatsApp Messages Table Unbounded Growth
- **Issue:** `whatsapp_messages` grows continuously with no archival policy.
- **Impact:** DB size will grow; Free Tier 500MB limit.
- **Fix:** Implement message archival (move to cold storage after N days).

### 7. CustomerContext / ProductContext Not Tenant-Aware
- **Issue:** These contexts don't filter by tenant_id directly (use local state).
- **Impact:** Data isolation depends on RLS only, not application-level.
- **Status:** Low risk if RLS is correctly configured.

### 8. Lovable API References (Residual)
- **Issue:** Some URL replacement logic still references `lovable.app` domain.
- **Files:** `invite-user`, `generate-access-link`, `send-recovery-email`
- **Impact:** Cosmetic — these are regex replacements that only fire if lovable URL detected.

### 9. Multiple WhatsApp Providers Coexisting
- **Issue:** uazapi, Meta Cloud API, and legacy Z-API/Evolution API code all coexist.
- **Impact:** Maintenance complexity, multiple webhook handlers for same function.
- **Fix:** Consolidate to Meta Cloud API as primary, uazapi as fallback.

## LOW

### 10. Mock Data in Some Pages
- **Issue:** `Index.tsx` dashboard has some hardcoded agent names ("João S.").
- **Impact:** Minor UX inconsistency.

### 11. `conversations` Table Empty
- **Issue:** The `conversations` table is never populated. Conversations are built dynamically from `whatsapp_messages`.
- **Impact:** Analytics queries on `conversations` return zero.

### 12. Duplicated Tenants from CSV Import
- **Issue:** CSV license import created duplicate tenants (e.g., "WHATSFLOW EDTECH LTDA" x2).
- **Status:** Manually cleaned. Could recur on re-import.
- **Fix:** Add unique constraint on tenant name + CNPJ.

## RESOLVED (in this session)
- ✅ Hardcoded tenant IDs → replaced with `useTenantId()`
- ✅ Dashboard/Reports 100% mockado → connected to real data
- ✅ Lovable API for AI → migrated to OpenAI Assistants
- ✅ Webhook pointing to old Supabase project → corrected
- ✅ Missing `updated_at` on whatsapp_messages → added
- ✅ RLS blocking Nexus access to licenses → fixed
- ✅ SMTP2GO vs SendGrid confusion → auto-detect by key format
- ✅ Duplicate close button on NegocioCreateModal → removed
