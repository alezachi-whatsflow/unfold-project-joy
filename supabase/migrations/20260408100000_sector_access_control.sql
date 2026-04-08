-- ============================================================================
-- Sector-Based Access Control
-- Implements department filtering for conversations, deals, activities, support
-- ============================================================================

-- 1. Add department_id to whatsapp_leads (conversations)
ALTER TABLE public.whatsapp_leads
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_department ON public.whatsapp_leads(department_id);

-- 2. Add department_id to negocios (deals)
ALTER TABLE public.negocios
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 3. Add department_id to activities
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 4. Add department_id to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 5. Ensure agent_departments has RLS
ALTER TABLE public.agent_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "agent_departments_tenant_isolation" ON public.agent_departments
  FOR ALL TO authenticated
  USING (
    public.is_nexus_user()
    OR tenant_id IN (SELECT public.get_authorized_tenant_ids())
  )
  WITH CHECK (
    public.is_nexus_user()
    OR tenant_id IN (SELECT public.get_authorized_tenant_ids())
  );

-- 6. Function: check if user has access to a department
CREATE OR REPLACE FUNCTION public.user_has_sector_access(
  p_user_id UUID,
  p_department_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    -- Super admin / admin always have access
    EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role IN ('superadmin', 'admin'))
    -- Or user is assigned to this department
    OR EXISTS (
      SELECT 1 FROM public.agent_departments
      WHERE user_id = p_user_id AND department_id = p_department_id
    )
    -- Or user has no department assignments (legacy: see everything)
    OR NOT EXISTS (
      SELECT 1 FROM public.agent_departments WHERE user_id = p_user_id
    )
    -- Or department is NULL (unassigned conversations)
    OR p_department_id IS NULL;
$$;

-- 7. Function: get departments accessible to a user
CREATE OR REPLACE FUNCTION public.get_user_departments(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- If user is superadmin/admin, return ALL departments
  SELECT d.id FROM public.departments d
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role IN ('superadmin', 'admin'))

  UNION

  -- If user has specific department assignments, return those
  SELECT department_id FROM public.agent_departments
  WHERE user_id = p_user_id

  UNION

  -- Always include NULL (unassigned items) for all users
  SELECT NULL::UUID;
$$;

-- 8. Add view_all_chats to profiles for explicit override
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS view_all_chats BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.view_all_chats IS 'If true, user can see conversations from all departments regardless of assignment';
COMMENT ON FUNCTION public.user_has_sector_access IS 'Checks if a user can access items in a specific department';
COMMENT ON FUNCTION public.get_user_departments IS 'Returns all department IDs accessible to a user';
