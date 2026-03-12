import type { NavCategory, SidebarPreferences } from '@/types/sidebar';

export const DEFAULT_NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: 'DollarSign',
    items: [
      { id: 'inserir',    label: 'Inserir Dados', icon: 'PenLine',        route: '/input',       module: 'inserir_dados' },
      { id: 'receitas',   label: 'Receitas',      icon: 'TrendingUp',     route: '/revenue',     module: 'receitas'      },
      { id: 'despesas',   label: 'Despesas',      icon: 'DollarSign',     route: '/expenses',    module: 'despesas'      },
      { id: 'cobrancas',  label: 'Cobranças',     icon: 'Receipt',        route: '/cobrancas',   module: 'cobrancas'     },
      { id: 'fiscal',     label: 'Fiscal',        icon: 'FileText',       route: '/fiscal',      module: 'fiscal'        },
      { id: 'comissoes',  label: 'Comissões',     icon: 'UserCheck',      route: '/comissoes',   module: 'comissoes'     },
    ],
  },
  {
    id: 'clientes_produtos',
    label: 'Clientes & Produtos',
    icon: 'Users',
    items: [
      { id: 'clientes',    label: 'Clientes',      icon: 'Users',           route: '/customers',    module: 'clientes'      },
      { id: 'produtos',    label: 'Produtos',      icon: 'Package',         route: '/products',     module: 'produtos'      },
      { id: 'vendas',      label: 'Vendas',        icon: 'ShoppingCart',    route: '/vendas',       module: 'vendas'        },
      { id: 'conversas',   label: 'Conversas',     icon: 'MessageSquare',   route: '/conversas',    module: 'mensageria'    },
      { id: 'mensageria',  label: 'Mensageria',    icon: 'MessageCircle',   route: '/mensageria',   module: 'mensageria'    },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'Radar',
    items: [
      { id: 'dashboard',    label: 'Dashboard',           icon: 'LayoutDashboard', route: '/dashboard',    module: 'dashboard'     },
      { id: 'analytics',    label: 'Analytics',           icon: 'BarChart3',       route: '/analytics',    module: 'dashboard'     },
      { id: 'intelligence', label: 'Inteligência Digital', icon: 'Radar',           route: '/intelligence', module: 'intelligence'  },
      { id: 'relatorios',   label: 'Relatórios',          icon: 'FileBarChart',    route: '/reports',      module: 'relatorios'    },
    ],
  },
  {
    id: 'configuracoes_sistema',
    label: 'Configurações',
    icon: 'Settings',
    items: [
      { id: 'usuarios',       label: 'Usuários',       icon: 'Users',         route: '/usuarios',       module: 'usuarios'      },
      { id: 'integracoes',     label: 'Integrações',    icon: 'Puzzle',        route: '/integracoes',    module: 'mensageria'    },
      { id: 'assinatura',      label: 'Assinatura',     icon: 'CreditCard',    route: '/assinatura',     module: 'dashboard'     },
      { id: 'configuracoes',   label: 'Configurações',  icon: 'Settings',      route: '/settings',       module: 'configuracoes' },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: 'Settings2',
    items: [
      { id: 'comunidade',   label: 'Comunidade',           icon: 'Users2',     route: '/sistema/comunidade', module: 'dashboard' },
      { id: 'tutoriais',    label: 'Tutoriais',            icon: 'PlayCircle', route: '/sistema/tutoriais',  module: 'dashboard' },
      { id: 'manual_uso',   label: 'Manual de Uso',        icon: 'BookOpen',   route: '/sistema/manual',     module: 'dashboard' },
      { id: 'onboarding',   label: 'Onboarding Interativo', icon: 'Rocket',    route: '/sistema/onboarding', module: 'dashboard' },
    ],
  },
];

export const DEFAULT_SIDEBAR_PREFS: SidebarPreferences = {
  layout: 'grouped_cards',
  density: 'default',
  width: 'default',
  collapsed: false,
  showLabels: true,
  showQuickActions: false,
  quickActions: ['vendas', 'cobrancas', 'inserir'],
  categoryOrganization: 'default',
  theme: 'dark',
  keyboardShortcuts: true,
  collapseOnMobileNav: true,
  highlightActiveIcon: true,
  pinnedItems: [],
};
