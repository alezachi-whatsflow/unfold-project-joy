import { supabase } from '@/integrations/supabase/client';

// ── Types ──────────────────────────────────────────────────────
export type PzaafiRole = 'owner' | 'finance' | 'support' | 'ops' | 'viewer';

export type PzaafiPermission =
  | 'org:read'
  | 'org:write'
  | 'org:delete'
  | 'members:read'
  | 'members:write'
  | 'members:delete'
  | 'finance:read'
  | 'finance:write'
  | 'finance:refund'
  | 'kyc:read'
  | 'kyc:write'
  | 'kyc:approve'
  | 'checkout:read'
  | 'checkout:write'
  | 'branding:read'
  | 'branding:write'
  | 'subaccount:read'
  | 'subaccount:write'
  | 'commission:read'
  | 'commission:write'
  | 'support:read'
  | 'support:write'
  | 'audit:read';

// ── Permission Matrix ──────────────────────────────────────────

const ALL_PERMISSIONS: PzaafiPermission[] = [
  'org:read', 'org:write', 'org:delete',
  'members:read', 'members:write', 'members:delete',
  'finance:read', 'finance:write', 'finance:refund',
  'kyc:read', 'kyc:write', 'kyc:approve',
  'checkout:read', 'checkout:write',
  'branding:read', 'branding:write',
  'subaccount:read', 'subaccount:write',
  'commission:read', 'commission:write',
  'support:read', 'support:write',
  'audit:read',
];

const READ_ONLY: PzaafiPermission[] = [
  'org:read', 'members:read', 'finance:read', 'kyc:read',
  'checkout:read', 'branding:read', 'subaccount:read',
  'commission:read', 'support:read', 'audit:read',
];

export const PERMISSIONS: Record<PzaafiRole, PzaafiPermission[]> = {
  owner: [...ALL_PERMISSIONS],
  finance: [
    ...READ_ONLY,
    'finance:write', 'finance:refund',
    'commission:write',
  ],
  support: [
    ...READ_ONLY,
    'support:write',
    'kyc:write',
  ],
  ops: [
    ...READ_ONLY,
    'org:write',
    'checkout:write',
    'branding:write',
    'subaccount:write',
    'members:write',
    'kyc:write',
  ],
  viewer: [...READ_ONLY],
};

// ── Service Functions ──────────────────────────────────────────

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: PzaafiRole, permission: PzaafiPermission): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a given role.
 */
export function getRolePermissions(role: PzaafiRole): PzaafiPermission[] {
  return PERMISSIONS[role] ?? [];
}

/**
 * Fetch the current user's role within an organization.
 */
export async function getUserRole(orgId: string): Promise<PzaafiRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('pzaafi_org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) return null;
  return data.role as PzaafiRole;
}
