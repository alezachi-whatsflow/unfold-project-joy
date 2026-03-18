// ICP criteria templates by segment
export interface ICPCriterionTemplate {
  id: string;
  label: string;
  type: 'boolean' | 'scale' | 'multiple_choice' | 'text';
  weight: number;
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  positive_values?: string[];
  disqualifier?: boolean;
  hint?: string;
}

export interface SegmentTemplate {
  segment: string;
  hot_threshold: number;
  warm_threshold: number;
  criteria: ICPCriterionTemplate[];
  funnel_stages: { name: string; color: string; sla_days?: number }[];
  questionnaire_hint: string;
}

const uuid = () => crypto.randomUUID();

export const SEGMENT_TEMPLATES: Record<string, SegmentTemplate> = {
  saude: {
    segment: 'saude',
    hot_threshold: 72,
    warm_threshold: 40,
    criteria: [
      { id: uuid(), label: 'Tem WhatsApp Business ativo', type: 'boolean', weight: 20, positive_values: ['true', 'sim'], hint: 'Sim ou Não — se a clínica/consultório já possui WhatsApp Business.' },
      { id: uuid(), label: 'Quantidade de atendentes', type: 'scale', weight: 18, scale_min: 1, scale_max: 10, hint: 'Escala de 1 a 10 — quantidade de profissionais que atendem pacientes.' },
      { id: uuid(), label: 'Volume mensal de mensagens', type: 'multiple_choice', weight: 16, options: ['Até 500', '500-2000', '2000-5000', 'Acima de 5000'], hint: 'Selecione a faixa de mensagens trocadas por mês.' },
      { id: uuid(), label: 'Já perdeu pacientes por demora', type: 'boolean', weight: 14, positive_values: ['true', 'sim'], hint: 'Sim ou Não — se houve perda de pacientes por tempo de resposta.' },
      { id: uuid(), label: 'Orçamento disponível', type: 'scale', weight: 15, scale_min: 1, scale_max: 5, hint: 'Escala de 1 a 5 — capacidade de investimento imediato.' },
      { id: uuid(), label: 'Número de unidades/filiais', type: 'scale', weight: 10, scale_min: 1, scale_max: 10, hint: 'Escala de 1 a 10 — quantas unidades ou filiais o prospect possui.' },
      { id: uuid(), label: 'Experiência com automação', type: 'boolean', weight: 7, positive_values: ['true', 'sim'], hint: 'Sim ou Não — se já utilizou chatbot ou automação anteriormente.' },
    ],
    funnel_stages: [
      { name: 'Prospecção', color: '#60a5fa', sla_days: 3 },
      { name: 'Qualificado', color: '#a78bfa', sla_days: 5 },
      { name: 'Proposta', color: '#f59e0b', sla_days: 3 },
      { name: 'Negociação', color: '#fb923c', sla_days: 5 },
      { name: 'Fechado — Ganho', color: '#4ade80' },
      { name: 'Fechado — Perdido', color: '#f87171' },
    ],
    questionnaire_hint: 'Foco em dores de atendimento ao paciente e volume de comunicação.',
  },
  educacao: {
    segment: 'educacao',
    hot_threshold: 68,
    warm_threshold: 38,
    criteria: [
      { id: uuid(), label: 'Número de alunos ativos', type: 'scale', weight: 20, scale_min: 1, scale_max: 10 },
      { id: uuid(), label: 'Usa WhatsApp para comunicação', type: 'boolean', weight: 18, positive_values: ['true', 'sim'] },
      { id: uuid(), label: 'Frequência de matrículas/mês', type: 'multiple_choice', weight: 16, options: ['Até 10', '10-50', '50-200', 'Acima de 200'] },
      { id: uuid(), label: 'Time de atendimento dedicado', type: 'boolean', weight: 15, positive_values: ['true', 'sim'] },
      { id: uuid(), label: 'Orçamento para tecnologia', type: 'scale', weight: 14, scale_min: 1, scale_max: 5 },
      { id: uuid(), label: 'Modalidade', type: 'multiple_choice', weight: 10, options: ['Presencial', 'Online', 'Híbrida'] },
      { id: uuid(), label: 'Já usou chatbot ou automação', type: 'boolean', weight: 7, positive_values: ['true', 'sim'] },
    ],
    funnel_stages: [
      { name: 'Lead', color: '#60a5fa', sla_days: 2 },
      { name: 'Diagnóstico', color: '#a78bfa', sla_days: 5 },
      { name: 'Demonstração', color: '#f59e0b', sla_days: 3 },
      { name: 'Proposta', color: '#fb923c', sla_days: 5 },
      { name: 'Matrícula', color: '#4ade80' },
      { name: 'Perdido', color: '#f87171' },
    ],
    questionnaire_hint: 'Foco em volume de alunos e comunicação escolar.',
  },
  outro: {
    segment: 'outro',
    hot_threshold: 65,
    warm_threshold: 35,
    criteria: [
      { id: uuid(), label: 'Usa WhatsApp para atendimento', type: 'boolean', weight: 20, positive_values: ['true', 'sim'], hint: 'Sim ou Não — indica se o prospect já utiliza WhatsApp como canal de atendimento.' },
      { id: uuid(), label: 'Volume de atendimentos/mês', type: 'scale', weight: 18, scale_min: 1, scale_max: 10, hint: 'Escala de 1 a 10 — quanto maior, mais atendimentos mensais. Ex.: 1 = até 50, 10 = acima de 5.000.' },
      { id: uuid(), label: 'Tem equipe dedicada a vendas', type: 'boolean', weight: 16, positive_values: ['true', 'sim'], hint: 'Sim ou Não — se a empresa possui um time dedicado exclusivamente a vendas.' },
      { id: uuid(), label: 'Ticket médio da operação', type: 'multiple_choice', weight: 15, options: ['Até R$500', 'R$500-2000', 'R$2000-10000', 'Acima de R$10000'], hint: 'Selecione a faixa de valor médio por venda/contrato do prospect.' },
      { id: uuid(), label: 'Urgência em resolver o problema', type: 'scale', weight: 15, scale_min: 1, scale_max: 5, hint: 'Escala de 1 a 5 — nível de urgência que o prospect sente para resolver a dor atual.' },
      { id: uuid(), label: 'Orçamento disponível', type: 'scale', weight: 10, scale_min: 1, scale_max: 5, hint: 'Escala de 1 a 5 — capacidade de investimento imediato do prospect.' },
      { id: uuid(), label: 'Decisor presente na conversa', type: 'boolean', weight: 6, positive_values: ['true', 'sim'], hint: 'Sim ou Não — se quem participa da negociação tem poder de decisão.' },
    ],
    funnel_stages: [
      { name: 'Prospecção', color: '#60a5fa', sla_days: 3 },
      { name: 'Qualificado', color: '#a78bfa', sla_days: 5 },
      { name: 'Proposta', color: '#f59e0b', sla_days: 3 },
      { name: 'Negociação', color: '#fb923c', sla_days: 5 },
      { name: 'Fechado — Ganho', color: '#4ade80' },
      { name: 'Fechado — Perdido', color: '#f87171' },
    ],
    questionnaire_hint: 'Critérios genéricos adaptáveis a qualquer segmento.',
  },
};

// Map segment labels
export const SEGMENTS = [
  { value: 'saude', label: 'Saúde' },
  { value: 'odontologia', label: 'Odontologia' },
  { value: 'educacao', label: 'Educação' },
  { value: 'varejo', label: 'Varejo' },
  { value: 'moda', label: 'Moda' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'imoveis', label: 'Imóveis' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'beleza', label: 'Beleza' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'contabilidade', label: 'Contabilidade' },
  { value: 'logistica', label: 'Logística' },
  { value: 'marketing', label: 'Marketing / Agência' },
  { value: 'rh', label: 'RH / Recrutamento' },
  { value: 'industria', label: 'Indústria' },
  { value: 'agronegocio', label: 'Agronegócio' },
  { value: 'outro', label: 'Outro' },
];

export const CURRENCIES = [
  { value: 'BRL', label: 'R$ (BRL)' },
  { value: 'USD', label: '$ (USD)' },
  { value: 'EUR', label: '€ (EUR)' },
  { value: 'MXN', label: 'MX$ (MXN)' },
  { value: 'COP', label: '$ (COP)' },
  { value: 'ARS', label: '$ (ARS)' },
  { value: 'GBP', label: '£ (GBP)' },
  { value: 'INR', label: '₹ (INR)' },
];

export const BILLING_TYPES = [
  { value: 'recorrente', label: 'Recorrente' },
  { value: 'unico', label: 'Único' },
  { value: 'hibrido', label: 'Híbrido' },
];

export const CLIENT_SIZES = [
  { value: 'mei', label: 'MEI' },
  { value: 'pequena', label: 'Pequena' },
  { value: 'media', label: 'Média' },
  { value: 'grande', label: 'Grande' },
  { value: 'enterprise', label: 'Enterprise' },
];

export const DECISION_MAKERS = [
  { value: 'dono', label: 'Dono / Sócio' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'gestor', label: 'Gestor / Gerente' },
  { value: 'ti', label: 'TI / Tecnologia' },
  { value: 'financeiro', label: 'Financeiro' },
];

export function getTemplateForSegment(segment: string): SegmentTemplate {
  // Map sub-segments to main templates
  if (['saude', 'odontologia'].includes(segment)) return SEGMENT_TEMPLATES.saude;
  if (['educacao'].includes(segment)) return SEGMENT_TEMPLATES.educacao;
  return SEGMENT_TEMPLATES.outro;
}
