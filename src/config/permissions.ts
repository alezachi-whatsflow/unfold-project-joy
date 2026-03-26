import type { UserRole } from '@/types/roles';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export type ModulePermission = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
};

export type PermissionMatrix = Record<string, ModulePermission>;

export const ALL_MODULES = [
  'dashboard',
  'vendas',
  'cobrancas',
  'comissoes',
  'receitas',
  'despesas',
  'clientes',
  'produtos',
  'fiscal',
  'intelligence',
  'relatorios',
  'configuracoes',
  'usuarios',
  'inserir_dados',
  'mensageria',
  'caixa_entrada',
  'integracoes',
  'ia_composable',
  'assinatura',
  'analytics',
] as const;

export type AppModule = (typeof ALL_MODULES)[number];

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard:      'Dashboard',
  vendas:         'Vendas',
  cobrancas:      'Cobranças',
  comissoes:      'Comissões',
  receitas:       'Receitas',
  despesas:       'Despesas',
  clientes:       'Clientes',
  produtos:       'Produtos',
  fiscal:         'Fiscal',
  intelligence:   'Intelligence',
  relatorios:     'Relatórios',
  configuracoes:  'Configurações',
  usuarios:       'Usuários',
  inserir_dados:  'Inserir Dados',
  mensageria:     'Mensageria',
  caixa_entrada:  'Caixa de Entrada',
  integracoes:    'Integrações',
  ia_composable:  'IA Composable',
  assinatura:     'Assinatura',
  analytics:      'Analytics',
};

const full: ModulePermission = { view: true, create: true, edit: true, delete: true, export: true };
const viewExport: ModulePermission = { view: true, create: false, edit: false, delete: false, export: true };
const viewOnly: ModulePermission = { view: true, create: false, edit: false, delete: false, export: false };
const noAccess: ModulePermission = { view: false, create: false, edit: false, delete: false, export: false };
const crudNoDelete = (exp: boolean): ModulePermission => ({ view: true, create: true, edit: true, delete: false, export: exp });

export const DEFAULT_PERMISSIONS: Record<UserRole, PermissionMatrix> = {
  superadmin: {
    dashboard:      full,
    vendas:         full,
    cobrancas:      full,
    comissoes:      full,
    receitas:       full,
    despesas:       full,
    clientes:       full,
    produtos:       full,
    fiscal:         full,
    intelligence:   full,
    relatorios:     full,
    configuracoes:  full,
    usuarios:       full,
    inserir_dados:  full,
    mensageria:     full,
    caixa_entrada:  full,
    integracoes:    full,
    ia_composable:  full,
    assinatura:     full,
    analytics:      full,
  },

  admin: {
    dashboard:      full,
    vendas:         full,
    cobrancas:      full,
    comissoes:      full,
    receitas:       full,
    despesas:       full,
    clientes:       full,
    produtos:       full,
    fiscal:         full,
    intelligence:   full,
    relatorios:     full,
    configuracoes:  full,
    usuarios:       full,
    inserir_dados:  full,
    mensageria:     full,
    caixa_entrada:  full,
    integracoes:    full,
    ia_composable:  full,
    assinatura:     full,
    analytics:      full,
  },

  gestor: {
    dashboard:      viewExport,
    vendas:         crudNoDelete(true),
    cobrancas:      crudNoDelete(true),
    comissoes:      crudNoDelete(true),
    receitas:       crudNoDelete(true),
    despesas:       crudNoDelete(true),
    clientes:       crudNoDelete(true),
    produtos:       crudNoDelete(true),
    fiscal:         viewExport,
    intelligence:   viewExport,
    relatorios:     viewExport,
    configuracoes:  noAccess,
    usuarios:       { view: true, create: true, edit: true, delete: false, export: false },
    inserir_dados:  { view: true, create: true, edit: true, delete: false, export: false },
    mensageria:     crudNoDelete(false),
    caixa_entrada:  crudNoDelete(false),
    integracoes:    viewOnly,
    ia_composable:  viewOnly,
    assinatura:     viewOnly,
    analytics:      viewExport,
  },

  financeiro: {
    dashboard:      viewExport,
    vendas:         viewExport,
    cobrancas:      crudNoDelete(true),
    comissoes:      viewExport,
    receitas:       crudNoDelete(true),
    despesas:       crudNoDelete(true),
    clientes:       viewOnly,
    produtos:       viewOnly,
    fiscal:         crudNoDelete(true),
    intelligence:   viewExport,
    relatorios:     viewExport,
    configuracoes:  noAccess,
    usuarios:       noAccess,
    inserir_dados:  { view: true, create: true, edit: false, delete: false, export: false },
    mensageria:     viewOnly,
    caixa_entrada:  viewOnly,
    integracoes:    noAccess,
    ia_composable:  noAccess,
    assinatura:     viewOnly,
    analytics:      viewExport,
  },

  consultor: {
    dashboard:      viewOnly,
    vendas:         { view: true, create: true, edit: true, delete: false, export: false },
    cobrancas:      viewOnly,
    comissoes:      viewOnly,
    receitas:       viewOnly,
    despesas:       noAccess,
    clientes:       { view: true, create: true, edit: true, delete: false, export: false },
    produtos:       viewOnly,
    fiscal:         noAccess,
    intelligence:   viewOnly,
    relatorios:     { view: true, create: false, edit: false, delete: false, export: true },
    configuracoes:  noAccess,
    usuarios:       noAccess,
    inserir_dados:  noAccess,
    mensageria:     crudNoDelete(false),
    caixa_entrada:  crudNoDelete(false),
    integracoes:    noAccess,
    ia_composable:  viewOnly,
    assinatura:     noAccess,
    analytics:      viewOnly,
  },

  representante: {
    dashboard:      viewOnly,                                                         // Vê seus KPIs
    vendas:         { view: true, create: true, edit: true, delete: false, export: true }, // Gerencia seus negócios
    cobrancas:      viewOnly,                                                         // Vê cobranças dos seus clientes
    comissoes:      { view: true, create: false, edit: false, delete: false, export: true }, // Vê e exporta suas comissões
    receitas:       viewOnly,                                                         // Vê receitas dos seus negócios
    despesas:       noAccess,
    clientes:       { view: true, create: true, edit: true, delete: false, export: true },  // Gerencia seus clientes
    produtos:       viewOnly,                                                         // Consulta catálogo
    fiscal:         noAccess,
    intelligence:   noAccess,
    relatorios:     { view: true, create: false, edit: false, delete: false, export: true }, // Vê e exporta relatórios
    configuracoes:  noAccess,
    usuarios:       noAccess,
    inserir_dados:  { view: true, create: true, edit: false, delete: false, export: false },
    mensageria:     viewOnly,                                                         // Vê mensagens dos seus leads
    caixa_entrada:  viewOnly,                                                         // Vê conversas atribuídas a ele
    integracoes:    noAccess,
    ia_composable:  noAccess,
    assinatura:     noAccess,
    analytics:      viewOnly,                                                         // Vê analytics dos seus dados
  },
};
