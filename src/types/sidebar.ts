export type SidebarLayout =
  | 'grouped_cards'
  | 'dual_rail'
  | 'spotlight'
  | 'custom';

export type SidebarDensity = 'comfortable' | 'default' | 'compact';
export type SidebarWidth = 'narrow' | 'default' | 'wide';

export const WIDTH_MAP: Record<SidebarWidth, number> = {
  narrow: 220,
  default: 248,
  wide: 280,
};

export type NavItem = {
  id: string;
  label: string;
  icon: string;
  route: string;
  module: string;
  badge?: number;
  pinned?: boolean;
  visible?: boolean;
  order?: number;
};

export type NavCategory = {
  id: string;
  label: string;
  icon?: string;
  items: NavItem[];
  collapsed?: boolean;
  visible?: boolean;
  order?: number;
  subcategories?: NavCategory[];
};

export type SidebarPreferences = {
  layout: SidebarLayout;
  density: SidebarDensity;
  width: SidebarWidth;
  collapsed: boolean;
  showLabels: boolean;
  showQuickActions: boolean;
  quickActions: string[];
  categoryOrganization: 'default' | 'custom';
  customCategories?: NavCategory[];
  pinnedItems?: string[];
  theme: 'dark' | 'light' | 'auto';
  keyboardShortcuts: boolean;
  collapseOnMobileNav: boolean;
  highlightActiveIcon: boolean;
};
