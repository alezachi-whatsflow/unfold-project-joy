import { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const base = {
  fill: 'none' as const,
  stroke: 'currentColor' as const,
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconHome({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M3 8.5L10 3l7 5.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" />
      <path d="M7.5 18V12.5a.5.5 0 01.5-.5h4a.5.5 0 01.5.5V18" />
    </svg>
  )
}

export function IconDashboard({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <rect x="2.5" y="11" width="3" height="7" rx="1" />
      <rect x="8.5" y="7" width="3" height="11" rx="1" />
      <rect x="14.5" y="3" width="3" height="15" rx="1" />
    </svg>
  )
}

export function IconFinance({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.5v1m0 7v1M7.5 8.5c0-.83.67-1.5 1.5-1.5h2a1.5 1.5 0 010 3H9a1.5 1.5 0 000 3h2a1.5 1.5 0 001.5-1.5" />
    </svg>
  )
}

export function IconClients({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <circle cx="8" cy="7" r="3" />
      <path d="M2 17c0-3.31 2.69-5 6-5s6 1.69 6 5" />
      <path d="M14.5 5.5a3 3 0 010 5M17.5 17c0-2.5-1.5-4.2-3-5" />
    </svg>
  )
}

export function IconSales({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M2.5 3h1.8l2.4 9.5a1 1 0 00.97.75h7.3a1 1 0 00.97-.76L17.5 7H5.5" />
      <circle cx="7.5" cy="16.5" r="1.25" />
      <circle cx="14" cy="16.5" r="1.25" />
    </svg>
  )
}

export function IconMessages({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M17.5 10c0 4.14-3.36 7.5-7.5 7.5a7.44 7.44 0 01-3.75-1L2.5 17.5l1.06-3.75A7.44 7.44 0 012.5 10C2.5 5.86 5.86 2.5 10 2.5s7.5 3.36 7.5 7.5z" />
      <path d="M7 10h.01M10 10h.01M13 10h.01" strokeWidth={2} />
    </svg>
  )
}

export function IconDocuments({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M11.5 2.5H5a1 1 0 00-1 1V17a1 1 0 001 1h10a1 1 0 001-1V7.5L11.5 2.5z" />
      <path d="M11.5 2.5v5H16.5" />
      <path d="M7 11h6M7 14h4" />
    </svg>
  )
}

export function IconSettings({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.22 4.22l1.06 1.06M14.72 14.72l1.06 1.06M4.22 15.78l1.06-1.06M14.72 5.28l1.06-1.06" />
    </svg>
  )
}

export function IconInsertData({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M10 3v10M6 9l4 4 4-4" />
      <path d="M4 16h12" />
    </svg>
  )
}

export function IconRevenue({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M3 13l4-4 3 3 4-5 3 2" />
      <path d="M3 17h14" />
    </svg>
  )
}

export function IconExpenses({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="M2.5 8.5h15" />
      <circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconFiscal({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M5 2.5h10a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1v-13a1 1 0 011-1z" />
      <path d="M7 7h6M7 10h6M7 13h4" />
    </svg>
  )
}

export function IconCommissions({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <circle cx="7" cy="7" r="2" />
      <circle cx="13" cy="13" r="2" />
      <path d="M5.5 14.5l9-9" />
    </svg>
  )
}

export function IconProducts({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M10 2L3 6v8l7 4 7-4V6L10 2z" />
      <path d="M10 2v12M3 6l7 4 7-4" />
    </svg>
  )
}

export function IconConversations({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M4 4.5h8a1 1 0 011 1v5a1 1 0 01-1 1H7l-3 2v-2H4a1 1 0 01-1-1v-5a1 1 0 011-1z" />
      <path d="M13 7.5h2a1 1 0 011 1v4a1 1 0 01-1 1h-.5v1.5l-2-1.5H9.5" />
    </svg>
  )
}

export function IconAnalytics({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 10L6 7.5M10 10l3.5-1M10 10v-4" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconDigital({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <rect x="3" y="3" width="14" height="10" rx="1.5" />
      <path d="M7 17h6M10 13v4" />
    </svg>
  )
}

export function IconReports({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M4 2.5h8.5L16 6v11.5a1 1 0 01-1 1H4a1 1 0 01-1-1v-14a1 1 0 011-1z" />
      <path d="M12.5 2.5V6H16" />
      <path d="M6.5 9.5h7M6.5 12h7M6.5 14.5h4" />
    </svg>
  )
}

export function IconBilling({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M7 7h6M7 10h3M13 10l-1.5 1.5L13 13" />
    </svg>
  )
}

export function IconUsers({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <circle cx="10" cy="7" r="3.5" />
      <path d="M3 18c0-3.87 3.13-6 7-6s7 2.13 7 6" />
    </svg>
  )
}

export function IconIntegrations({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M8 2.5v3a1 1 0 01-1 1H4M12 2.5v3a1 1 0 001 1h3M8 17.5v-3a1 1 0 00-1-1H4M12 17.5v-3a1 1 0 011-1h3" />
      <rect x="6" y="6" width="8" height="8" rx="2" />
    </svg>
  )
}

export function IconSubscription({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <rect x="2.5" y="4" width="15" height="12" rx="2" />
      <path d="M2.5 8h15" />
      <path d="M6 12h2M12 12h2" />
    </svg>
  )
}

export function IconCommunity({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <circle cx="10" cy="6" r="2.5" />
      <circle cx="5" cy="9" r="2" />
      <circle cx="15" cy="9" r="2" />
      <path d="M4 17c0-2.5 2.5-4 6-4s6 1.5 6 4" />
    </svg>
  )
}

export function IconTutorials({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M8.5 7l4.5 3-4.5 3V7z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconManual({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M3 4c2-1 4-1 7 0v13c-3-1-5-1-7 0V4z" />
      <path d="M17 4c-2-1-4-1-7 0v13c3-1 5-1 7 0V4z" />
    </svg>
  )
}

export function IconOnboarding({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} {...props}>
      <path d="M10 3l-1 5h2l-1 5" />
      <path d="M6 15l4 2 4-2" />
      <path d="M10 2v1M10 17v1" />
      <circle cx="10" cy="10" r="7.5" />
    </svg>
  )
}

// Map navigation icon names to custom sidebar icons
export const sidebarIconMap: Record<string, React.ComponentType<IconProps>> = {
  // Financeiro
  PenLine: IconInsertData,
  TrendingUp: IconRevenue,
  DollarSign: IconExpenses,
  Receipt: IconBilling,
  FileText: IconFiscal,
  UserCheck: IconCommissions,
  // Clientes & Produtos
  Users: IconClients,
  Package: IconProducts,
  ShoppingCart: IconSales,
  MessageSquare: IconConversations,
  MessageCircle: IconMessages,
  // Analytics
  LayoutDashboard: IconDashboard,
  BarChart3: IconAnalytics,
  Radar: IconDigital,
  FileBarChart: IconReports,
  // Configurações
  Puzzle: IconIntegrations,
  CreditCard: IconSubscription,
  Settings: IconSettings,
  // Sistema
  Users2: IconCommunity,
  PlayCircle: IconTutorials,
  BookOpen: IconManual,
  Rocket: IconOnboarding,
}
