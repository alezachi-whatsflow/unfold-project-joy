export type UserRole =
  | 'superadmin'       // SuperAdmin Whatsflow
  | 'admin'           // Administrador do Tenant
  | 'gestor'          // Gestor
  | 'financeiro'      // Financeiro
  | 'consultor'       // Consultor Interno
  | 'representante';  // Representante Externo

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin:     'SuperAdmin Whatsflow',
  admin:          'Administrador',
  gestor:         'Gestor',
  financeiro:     'Financeiro',
  consultor:      'Consultor Interno',
  representante:  'Representante Externo',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  superadmin:    '#ef4444',  // vermelho
  admin:         '#4ade80',  // verde
  gestor:        '#60a5fa',  // azul
  financeiro:    '#f59e0b',  // âmbar
  consultor:     '#a78bfa',  // roxo
  representante: '#fb923c',  // laranja
};

// All roles (including superadmin for internal use)
export const ALL_ROLES: UserRole[] = ['superadmin', 'admin', 'gestor', 'financeiro', 'consultor', 'representante'];

// Roles available for client portal assignment (no superadmin)
export const CLIENT_ROLES: UserRole[] = ['admin', 'gestor', 'financeiro', 'consultor', 'representante'];
