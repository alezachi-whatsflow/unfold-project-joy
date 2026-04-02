import type { UserRole } from '@/types/roles';

// Extended actions: original 5 + scope + operational
export type PermissionAction =
  | 'view' | 'create' | 'edit' | 'delete' | 'export'  // legacy
  | 'view_all' | 'view_owned'                          // scope visibility
  | 'transfer';                                         // operational

export type ModulePermission = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  // Extended (optional — backward compat)
  view_all?: boolean;
  view_owned?: boolean;
  transfer?: boolean;
};

export type PermissionMatrix = Record<string, ModulePermission>;

// Modules that support scope-based visibility
export const SCOPED_MODULES = ['mensageria', 'vendas', 'atividades', 'suporte', 'caixa_entrada'] as const;
export type ScopedModule = (typeof SCOPED_MODULES)[number];

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
  'atividades',
  'suporte',
] as const;

export type AppModule = (typeof ALL_MODULES)[number];

export const MODULE_LABELS: Record<string, string> = {
  dashboard:      'Dashboard',
  vendas:         'Vendas',
  cobrancas:      'Cobrancas',
  comissoes:      'Comissoes',
  receitas:       'Receitas',
  despesas:       'Despesas',
  clientes:       'Clientes',
  produtos:       'Produtos',
  fiscal:         'Fiscal',
  intelligence:   'Intelligence',
  relatorios:     'Relatorios',
  configuracoes:  'Configuracoes',
  usuarios:       'Usuarios',
  inserir_dados:  'Inserir Dados',
  mensageria:     'Mensageria',
  caixa_entrada:  'Caixa de Entrada',
  integracoes:    'Integracoes',
  ia_composable:  'IA Composable',
  assinatura:     'Assinatura',
  analytics:      'Analytics',
  atividades:     'Atividades',
  suporte:        'Suporte',
};

const full: ModulePermission = { view: true, create: true, edit: true, delete: true, export: true, view_all: true, view_owned: true, transfer: true };
const viewExport: ModulePermission = { view: true, create: false, edit: false, delete: false, export: true, view_all: true };
const viewOnly: ModulePermission = { view: true, create: false, edit: false, delete: false, export: false, view_all: true };
const noAccess: ModulePermission = { view: false, create: false, edit: false, delete: false, export: false };
const crudNoDelete = (exp: boolean): ModulePermission => ({ view: true, create: true, edit: true, delete: false, export: exp, view_all: true, transfer: false });
const ownedCrud = (exp: boolean): ModulePermission => ({ view: true, create: true, edit: true, delete: false, export: exp, view_all: false, view_owned: true, transfer: false });

export const DEFAULT_PERMISSIONS: Record<UserRole, PermissionMatrix> = {
  superadmin: Object.fromEntries(ALL_MODULES.map(m => [m, full])),

  admin: Object.fromEntries(ALL_MODULES.map(m => [m, full])),

  gestor: {
    dashboard:      viewExport,
    vendas:         { ...crudNoDelete(true), view_all: true, transfer: true },
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
    usuarios:       { view: true, create: true, edit: true, delete: false, export: false, view_all: true },
    inserir_dados:  { view: true, create: true, edit: true, delete: false, export: false },
    mensageria:     { ...crudNoDelete(false), view_all: true, transfer: true },
    caixa_entrada:  { ...crudNoDelete(false), view_all: true, transfer: true },
    integracoes:    viewOnly,
    ia_composable:  viewOnly,
    assinatura:     viewOnly,
    analytics:      viewExport,
    atividades:     { ...crudNoDelete(false), view_all: true, transfer: true },
    suporte:        { ...crudNoDelete(false), view_all: true, transfer: true },
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
    atividades:     viewOnly,
    suporte:        viewOnly,
  },

  consultor: {
    dashboard:      viewOnly,
    vendas:         { ...ownedCrud(false), transfer: false },
    cobrancas:      viewOnly,
    comissoes:      viewOnly,
    receitas:       viewOnly,
    despesas:       noAccess,
    clientes:       { ...ownedCrud(false) },
    produtos:       viewOnly,
    fiscal:         noAccess,
    intelligence:   viewOnly,
    relatorios:     { view: true, create: false, edit: false, delete: false, export: true },
    configuracoes:  noAccess,
    usuarios:       noAccess,
    inserir_dados:  noAccess,
    mensageria:     { ...ownedCrud(false) },
    caixa_entrada:  { ...ownedCrud(false) },
    integracoes:    noAccess,
    ia_composable:  viewOnly,
    assinatura:     noAccess,
    analytics:      viewOnly,
    atividades:     { ...ownedCrud(false) },
    suporte:        { ...ownedCrud(false) },
  },

  representante: {
    dashboard:      viewOnly,
    vendas:         { ...ownedCrud(true) },
    cobrancas:      viewOnly,
    comissoes:      { view: true, create: false, edit: false, delete: false, export: true, view_owned: true },
    receitas:       viewOnly,
    despesas:       noAccess,
    clientes:       { ...ownedCrud(true) },
    produtos:       viewOnly,
    fiscal:         noAccess,
    intelligence:   noAccess,
    relatorios:     { view: true, create: false, edit: false, delete: false, export: true },
    configuracoes:  noAccess,
    usuarios:       noAccess,
    inserir_dados:  { view: true, create: true, edit: false, delete: false, export: false },
    mensageria:     { ...ownedCrud(false) },
    caixa_entrada:  { ...ownedCrud(false) },
    integracoes:    noAccess,
    ia_composable:  noAccess,
    assinatura:     noAccess,
    analytics:      viewOnly,
    atividades:     { ...ownedCrud(false) },
    suporte:        { ...ownedCrud(false) },
  },
};
