export type NegocioStatus =
  | 'prospeccao'
  | 'qualificado'
  | 'proposta'
  | 'negociacao'
  | 'fechado_ganho'
  | 'fechado_perdido';

export type NegocioOrigem =
  | 'indicacao'
  | 'outbound'
  | 'inbound'
  | 'representante'
  | 'renovacao'
  | 'upsell'
  | 'digital_intelligence'
  | 'google_ads'
  | 'meta_ads'
  | 'tiktok_ads'
  | 'linkedin_ads'
  | 'whatsapp';

/* ── Metadata-Driven UI: Dynamic CRM Fields ────────────── */

/** Field types supported by the dynamic card schema */
export type CardFieldType = 'text' | 'number' | 'currency' | 'date' | 'select' | 'boolean' | 'url' | 'email' | 'phone';

/** Schema definition for a single custom field in a pipeline */
export interface CardFieldSchema {
  key: string;           // Unique identifier (snake_case), maps to custom_fields key
  label: string;         // Display label in Portuguese
  type: CardFieldType;   // Input type for rendering
  options?: string[];    // Only for type 'select' — dropdown choices
  required: boolean;     // Whether the field is mandatory
  placeholder?: string;  // Optional input placeholder
  defaultValue?: string | number | boolean; // Optional default
}

/** The card_schema column on sales_pipelines */
export type PipelineCardSchema = CardFieldSchema[];

/** The custom_fields column on negocios */
export type NegocioCustomFields = Record<string, string | number | boolean | null>;

/* ── End Dynamic Fields ────────────────────────────────── */

export interface NegocioProduto {
  produtoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  desconto: number;
  valorTotal: number;
}

export interface HistoricoItem {
  id: string;
  data: string;
  tipo: 'nota' | 'email' | 'ligacao' | 'reuniao' | 'status_change' | 'proposta' | 'cobranca' | 'nf';
  descricao: string;
  usuarioId: string;
  usuarioNome: string;
}

export interface Negocio {
  id: string;
  tenant_id: string;
  titulo: string;
  status: NegocioStatus;
  origem: NegocioOrigem;
  cliente_id: string | null;
  cliente_nome: string | null;
  consultor_id: string | null;
  consultor_nome: string | null;
  produtos: NegocioProduto[];
  valor_total: number;
  desconto: number;
  desconto_tipo: 'percent' | 'fixed';
  valor_liquido: number;
  data_criacao: string;
  data_previsao_fechamento: string | null;
  data_fechamento: string | null;
  gerar_nf: boolean;
  nf_emitida_id: string | null;
  gerar_cobranca: boolean;
  cobranca_id: string | null;
  forma_pagamento: string;
  condicao_pagamento: string;
  probabilidade: number;
  notas: string | null;
  tags: string[];
  historico: HistoricoItem[];
  motivo_perda: string | null;
  motivo_perda_detalhe: string | null;
  custom_fields: NegocioCustomFields;
  created_at: string;
  updated_at: string;
}

export const NEGOCIO_STATUS_CONFIG: Record<NegocioStatus, { label: string; color: string; ordem: number }> = {
  prospeccao:      { label: 'Prospecção',        color: '#60a5fa', ordem: 1 },
  qualificado:     { label: 'Qualificado',       color: '#a78bfa', ordem: 2 },
  proposta:        { label: 'Proposta Enviada',   color: '#f59e0b', ordem: 3 },
  negociacao:      { label: 'Em Negociação',      color: '#fb923c', ordem: 4 },
  fechado_ganho:   { label: 'Fechado — Ganho',    color: '#4ade80', ordem: 5 },
  fechado_perdido: { label: 'Fechado — Perdido',  color: '#f87171', ordem: 6 },
};

export const NEGOCIO_ORIGEM_LABELS: Record<NegocioOrigem, string> = {
  indicacao: 'Indicação',
  outbound: 'Outbound',
  inbound: 'Inbound',
  representante: 'Representante',
  renovacao: 'Renovação',
  upsell: 'Upsell',
  digital_intelligence: 'Digital Intelligence',
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok Ads',
  linkedin_ads: 'LinkedIn Ads',
  whatsapp: 'WhatsApp',
};

export const PAID_TRAFFIC_ORIGINS: NegocioOrigem[] = ['google_ads', 'meta_ads', 'tiktok_ads', 'linkedin_ads'];

export const FORMAS_PAGAMENTO = [
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'a_definir', label: 'A definir' },
];

export const MOTIVOS_PERDA = [
  'Preço',
  'Concorrência',
  'Sem budget',
  'Timing',
  'Sem interesse',
  'Outro',
];

export const ALL_STATUSES: NegocioStatus[] = [
  'prospeccao', 'qualificado', 'proposta', 'negociacao', 'fechado_ganho', 'fechado_perdido',
];

export const ACTIVE_STATUSES: NegocioStatus[] = [
  'prospeccao', 'qualificado', 'proposta', 'negociacao',
];
