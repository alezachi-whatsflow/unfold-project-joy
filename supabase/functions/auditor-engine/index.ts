import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * AUDITOR ENGINE — Analisa UMA conversa e gera avaliação completa.
 * FRONTEIRA: NÃO executa. NÃO responde ao cliente. Apenas analisa e orienta.
 */

interface AuditorPayload {
  license_id: string
  conversation_id: string
  messages: Array<{ sender: string; content: string; timestamp: string }>
  attendant_id?: string
  config: {
    criteria?: Array<{ key: string; label: string; weight: number }>
    alert_threshold?: number
  }
  period_date: string
  source?: string
}

const DEFAULT_CRITERIA = [
  { key: 'tempo_resposta', label: 'Tempo de Resposta', weight: 15 },
  { key: 'qualidade_resposta', label: 'Qualidade da Resposta', weight: 20 },
  { key: 'empatia', label: 'Empatia e Rapport', weight: 15 },
  { key: 'tecnica_vendas', label: 'Técnica de Vendas', weight: 20 },
  { key: 'followup', label: 'Follow-up e Próximos Passos', weight: 15 },
  { key: 'uso_base', label: 'Uso da Base de Conhecimento', weight: 15 },
]

function getScoreLabel(score: number): string {
  if (score >= 8.5) return 'excelente'
  if (score >= 7.0) return 'bom'
  if (score >= 5.0) return 'regular'
  return 'critico'
}

function buildAuditorPrompt(messages: AuditorPayload['messages'], criteria: typeof DEFAULT_CRITERIA): string {
  return `Você é um especialista em análise de qualidade de atendimento comercial via WhatsApp.

CONVERSA A ANALISAR:
${messages.map(m => `[${m.sender}] ${m.content}`).join('\n')}

CRITÉRIOS DE AVALIAÇÃO (score 0-10 para cada):
${criteria.map(c => `- ${c.label} (peso: ${c.weight}%)`).join('\n')}

INSTRUÇÕES:
1. Avalie cada critério com score de 0 a 10 e justificativa objetiva
2. Identifique erros cometidos com momento exato e sugestão do que deveria ter sido feito
3. Identifique oportunidades perdidas de avanço ou conversão
4. Gere 1-3 recomendações práticas de melhoria
5. Escreva um resumo executivo de 2 parágrafos

Responda APENAS em JSON com esta estrutura exata:
{
  "overall_score": 7.5,
  "criteria_scores": [
    { "criterion": "tempo_resposta", "label": "Tempo de Resposta", "score": 8.5, "weight": 15, "justification": "..." }
  ],
  "errors": [
    { "type": "objecao_mal_respondida", "label": "Objeção mal respondida", "severity": "high", "moment": "14:32", "description": "...", "suggestion": "..." }
  ],
  "opportunities": [
    { "type": "upsell_perdido", "description": "...", "suggestion": "..." }
  ],
  "recommendations": ["..."],
  "summary": "..."
}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload: AuditorPayload = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const criteria = payload.config?.criteria?.length ? payload.config.criteria : DEFAULT_CRITERIA
    const prompt = buildAuditorPrompt(payload.messages, criteria)

    // Call AI using configured provider (OpenAI/Anthropic/Gemini)
    const { callAI } = await import("../_shared/ai.ts");

    const rawContent = await callAI({
      messages: [
        { role: 'system', content: 'Você é um auditor de qualidade de atendimento. Responda APENAS em JSON válido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    // Parse JSON from AI response (handle markdown code blocks)
    let jsonStr = rawContent
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) jsonStr = jsonMatch[1]

    let evaluation: any
    try {
      evaluation = JSON.parse(jsonStr.trim())
    } catch {
      // Fallback: generate a basic evaluation
      evaluation = {
        overall_score: 5.0,
        criteria_scores: criteria.map(c => ({
          criterion: c.key,
          label: c.label,
          score: 5.0,
          weight: c.weight,
          justification: 'Avaliação não pôde ser processada automaticamente',
        })),
        errors: [],
        opportunities: [],
        recommendations: ['Revisar a conversa manualmente'],
        summary: 'A avaliação automática não pôde ser processada. Revisão manual recomendada.',
      }
    }

    // Calculate weighted overall score
    if (evaluation.criteria_scores?.length) {
      const totalWeight = evaluation.criteria_scores.reduce((sum: number, c: any) => sum + (c.weight || 0), 0)
      if (totalWeight > 0) {
        evaluation.overall_score = evaluation.criteria_scores.reduce(
          (sum: number, c: any) => sum + (c.score * (c.weight || 0)),
          0
        ) / totalWeight
        evaluation.overall_score = Math.round(evaluation.overall_score * 100) / 100
      }
    }

    // Save to audit_evaluations
    const { error: insertError } = await supabase.from('audit_evaluations').insert({
      license_id: payload.license_id,
      conversation_id: payload.conversation_id,
      attendant_id: payload.attendant_id || null,
      period_date: payload.period_date,
      overall_score: evaluation.overall_score,
      score_label: getScoreLabel(evaluation.overall_score),
      criteria_scores: evaluation.criteria_scores,
      errors_found: evaluation.errors || [],
      opportunities_missed: evaluation.opportunities || [],
      recommendations: evaluation.recommendations || [],
      ai_summary: evaluation.summary || '',
      source: payload.source || 'human',
    })

    if (insertError) {
      throw new Error(`DB insert error: ${insertError.message}`)
    }

    return new Response(
      JSON.stringify({ status: 'evaluated', score: evaluation.overall_score, label: getScoreLabel(evaluation.overall_score) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Auditor engine error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
