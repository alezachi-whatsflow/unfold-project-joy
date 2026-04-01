export const getPctVariant = (pct: number): 'low' | 'medium' | 'high' => {
  if (pct >= 70) return 'high'
  if (pct >= 40) return 'medium'
  return 'low'
}

export const PIPELINE_COLORS: Record<string, string> = {
  prospeccao:  'hsl(var(--pipeline-prospeccao))',
  qualificado: 'hsl(var(--pipeline-qualificado))',
  proposta:    'hsl(var(--pipeline-proposta))',
  negociacao:  'hsl(var(--pipeline-negociacao))',
  fechado:     'hsl(var(--pipeline-fechado))',
}
