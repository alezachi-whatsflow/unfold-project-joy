export type UserRole =
  | 'admin'           // Administrador Geral
  | 'gestor'          // Gestor
  | 'financeiro'      // Financeiro
  | 'consultor'       // Consultor Interno
  | 'representante';  // Representante Externo

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:          'Administrador Geral',
  gestor:         'Gestor',
  financeiro:     'Financeiro',
  consultor:      'Consultor Interno',
  representante:  'Representante Externo',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin:         '#4ade80',  // verde
  gestor:        '#60a5fa',  // azul
  financeiro:    '#f59e0b',  // âmbar
  consultor:     '#a78bfa',  // roxo
  representante: '#fb923c',  // laranja
};

export const ALL_ROLES: UserRole[] = ['admin', 'gestor', 'financeiro', 'consultor', 'representante'];
