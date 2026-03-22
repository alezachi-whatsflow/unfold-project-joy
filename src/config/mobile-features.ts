export interface MobileFeatureConfig {
  available: ('desktop' | 'tablet' | 'mobile')[];
  title: string;
  message: string;
  action?: { label: string; href: string | null };
  fallback?: string;
}

export const MOBILE_RESTRICTED_FEATURES: Record<string, MobileFeatureConfig> = {
  nexus_analytics_layout: {
    available: ['desktop', 'tablet'],
    title: 'Disponível apenas no computador',
    message: 'A visualização analítica com gráficos requer uma tela maior. No celular, você tem acesso ao Layout de Cartões e ao Layout Operacional.',
    action: { label: 'Entendi', href: null },
  },
  advanced_reports: {
    available: ['desktop', 'tablet'],
    title: 'Relatórios avançados',
    message: 'Os relatórios detalhados são mais úteis em telas maiores. No celular, você pode acompanhar o resumo no Dashboard.',
    action: { label: 'Ver Dashboard', href: '/app/{slug}' },
  },
  wl_branding_editor: {
    available: ['desktop'],
    title: 'Editor de identidade visual',
    message: 'Configure o branding da sua WhiteLabel no computador para ter a melhor experiência.',
    action: { label: 'Entendi', href: null },
  },
  csv_import: {
    available: ['desktop', 'tablet'],
    title: 'Importação de CSV',
    message: 'Para importar arquivos, acesse pelo computador. No celular, você pode cadastrar individualmente.',
    action: { label: 'Entendi', href: null },
  },
  kanban_drag_drop: {
    available: ['desktop', 'tablet'],
    title: 'Pipeline Kanban',
    message: 'No celular, o Pipeline exibe a visualização em lista. Arraste e solte está disponível no computador.',
    fallback: 'pipeline_list_view',
    action: { label: 'Entendi', href: null },
  },
  webhook_config: {
    available: ['desktop'],
    title: 'Configuração de webhooks',
    message: 'As configurações técnicas de integração ficam disponíveis no computador.',
    action: { label: 'Entendi', href: null },
  },
};
