/** Audit action → category mapping for reduced density in audit logs */

export const AUDIT_ACTION_CATEGORY: Record<string, string> = {
  // Access
  login: 'access', logout: 'access', impersonate: 'access',
  // Data
  create: 'data', edit: 'data', delete: 'data', import: 'data', export: 'data',
  // Status
  block: 'status', unblock: 'status', activate: 'status', expire: 'status',
  suspend: 'status', reactivate: 'status',
  // System
  sync: 'system', flag: 'system', ai_config: 'system', lifecycle: 'system',
  config: 'system', deploy: 'system',
};

export const AUDIT_CATEGORY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  access: { color: 'var(--nexus-audit-login, #10b981)', bg: 'rgba(16,185,129,0.1)', label: 'Acesso' },
  data:   { color: 'var(--nexus-audit-edit, #60a5fa)',   bg: 'rgba(96,165,250,0.1)',  label: 'Dados' },
  status: { color: 'var(--nexus-audit-block, #ef4444)',  bg: 'rgba(239,68,68,0.1)',   label: 'Status' },
  system: { color: 'var(--nexus-audit-config, #a78bfa)', bg: 'rgba(167,139,250,0.1)', label: 'Sistema' },
};

export function getAuditCategory(action: string): string {
  // Try exact match first
  if (AUDIT_ACTION_CATEGORY[action]) return AUDIT_ACTION_CATEGORY[action];
  // Try partial match
  for (const [key, cat] of Object.entries(AUDIT_ACTION_CATEGORY)) {
    if (action.toLowerCase().includes(key)) return cat;
  }
  return 'system';
}

export function getAuditStyle(action: string) {
  const category = getAuditCategory(action);
  return AUDIT_CATEGORY_STYLE[category] ?? AUDIT_CATEGORY_STYLE.system;
}
