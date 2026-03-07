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
] as const;

export type AppModule = (typeof ALL_MODULES)[number];

export const MODULE_LABELS: Record<AppModule, string> = {
  dashboard:     'Dashboard',
  vendas:        'Vendas',
  cobrancas:     'Cobranças',
  comissoes:     'Comissões',
  receitas:      'Receitas',
  despesas:      'Despesas',
  clientes:      'Clientes',
  produtos:      'Produtos',
  fiscal:        'Fiscal',
  intelligence:  'Intelligence',
  relatorios:    'Relatórios',
  configuracoes: 'Configurações',
  usuarios:      'Usuários',
  inserir_dados: 'Inserir Dados',
};

const full: ModulePermission = { view: true, create: true, edit: true, delete: true, export: true };
const viewExport: ModulePermission = { view: true, create: false, edit: false, delete: false, export: true };
const viewOnly: ModulePermission = { view: true, create: false, edit: false, delete: false, export: false };
const noAccess: ModulePermission = { view: false, create: false, edit: false, delete: false, export: false };
const crudNoDelete = (exp: boolean): ModulePermission => ({ view: true, create: true, edit: true, delete: false, export: exp });

export const DEFAULT_PERMISSIONS: Record<UserRole, PermissionMatrix> = {
  admin: {
    dashboard:     full,
    vendas:        full,
    cobrancas:     full,
    comissoes:     full,
    receitas:      full,
    despesas:      full,
    clientes:      full,
    produtos:      full,
    fiscal:        full,
    intelligence:  full,
    relatorios:    full,
    configuracoes: full,
    usuarios:      full,
    inserir_dados: full,
  },

  gestor: {
    dashboard:     viewExport,
    vendas:        crudNoDelete(true),
    cobrancas:     crudNoDelete(true),
    comissoes:     crudNoDelete(true),
    receitas:      crudNoDelete(true),
    despesas:      crudNoDelete(true),
    clientes:      crudNoDelete(true),
    produtos:      crudNoDelete(true),
    fiscal:        viewExport,
    intelligence:  viewExport,
    relatorios:    viewExport,
    configuracoes: noAccess,
    usuarios:      { view: true, create: true, edit: true, delete: false, export: false },
    inserir_dados: { view: true, create: true, edit: true, delete: false, export: false },
  },

  financeiro: {
    dashboard:     viewExport,
    vendas:        viewExport,
    cobrancas:     crudNoDelete(true),
    comissoes:     viewExport,
    receitas:      crudNoDelete(true),
    despesas:      crudNoDelete(true),
    clientes:      viewOnly,
    produtos:      viewOnly,
    fiscal:        crudNoDelete(true),
    intelligence:  viewExport,
    relatorios:    viewExport,
    configuracoes: noAccess,
    usuarios:      noAccess,
    inserir_dados: { view: true, create: true, edit: false, delete: false, export: false },
  },

  consultor: {
    dashboard:     viewOnly,
    cobrancas:     viewOnly,
    comissoes:     viewOnly,
    receitas:      viewOnly,
    despesas:      noAccess,
    clientes:      { view: true, create: true, edit: true, delete: false, export: false },
    produtos:      viewOnly,
    fiscal:        noAccess,
    intelligence:  viewOnly,
    relatorios:    { view: true, create: false, edit: false, delete: false, export: true },
    configuracoes: noAccess,
    usuarios:      noAccess,
    inserir_dados: noAccess,
  },

  representante: {
    dashboard:     viewOnly,
    cobrancas:     noAccess,
    comissoes:     viewOnly,
    receitas:      noAccess,
    despesas:      noAccess,
    clientes:      { view: true, create: true, edit: false, delete: false, export: false },
    produtos:      viewOnly,
    fiscal:        noAccess,
    intelligence:  noAccess,
    relatorios:    viewOnly,
    configuracoes: noAccess,
    usuarios:      noAccess,
    inserir_dados: { view: true, create: true, edit: false, delete: false, export: false },
  },
};
