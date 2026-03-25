-- ═══════════════════════════════════════════════════════════════
-- P0 FIX: Remove auto-assign trigger that causes multi-tenant data leak
--
-- ROOT CAUSE: handle_new_user_tenant() assigns EVERY new auth.user
-- to the OLDEST tenant (ORDER BY created_at ASC LIMIT 1), regardless
-- of which tenant the user was actually invited to.
--
-- This causes new license users to see data from a foreign tenant.
--
-- The invite-user Edge Function already handles user_tenants creation
-- correctly with the proper tenant_id. The trigger conflicts with that.
-- ═══════════════════════════════════════════════════════════════

-- 1. Drop the dangerous trigger
DROP TRIGGER IF EXISTS on_auth_user_created_tenant ON auth.users;

-- 2. Drop the dangerous function
DROP FUNCTION IF EXISTS public.handle_new_user_tenant();

-- 3. Clean up any orphaned user_tenants entries where user was
--    accidentally assigned to tenant 00000000-0000-0000-0000-000000000001
--    but also has a CORRECT entry for another tenant
-- (Only removes the wrong entry if user has 2+ tenant links)
DELETE FROM public.user_tenants ut1
WHERE ut1.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND ut1.is_owner = false
  AND EXISTS (
    SELECT 1 FROM public.user_tenants ut2
    WHERE ut2.user_id = ut1.user_id
      AND ut2.tenant_id != '00000000-0000-0000-0000-000000000001'
  );
