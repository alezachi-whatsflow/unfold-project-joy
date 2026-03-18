import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * AUDITOR REPORT — Gera relatório consolidado (diário ou semanal).
 * Agrega dados de audit_evaluations e salva em audit_reports.
 */

interface ReportPayload {
  license_id: string
  period_start: string // YYYY-MM-DD
  period_end: string   // YYYY-MM-DD
  report_type: 'daily' | 'weekly' | 'executive'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload: ReportPayload = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Fetch evaluations for the period
    const { data: evaluations, error: evalError } = await supabase
      .from('audit_evaluations')
      .select('*')
      .eq('license_id', payload.license_id)
      .gte('period_date', payload.period_start)
      .lte('period_date', payload.period_end)
      .order('period_date', { ascending: true })

    if (evalError) throw new Error(`Fetch evaluations error: ${evalError.message}`)

    const evals = evaluations ?? []
    const totalConversations = evals.length

    if (totalConversations === 0) {
      return new Response(
        JSON.stringify({ status: 'no_data', message: 'No evaluations found for this period' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Calculate avg overall score
    const avgScore = evals.reduce((sum, e) => sum + (Number(e.overall_score) || 0), 0) / totalConversations
    const roundedAvg = Math.round(avgScore * 100) / 100

    // 3. Calculate below threshold %
    const threshold = 6.0
    const belowCount = evals.filter(e => (Number(e.overall_score) || 0) < threshold).length
    const belowPct = Math.round((belowCount / totalConversations) * 10000) / 100

    // 4. Top errors
    const errorMap = new Map<string, { type: string; count: number }>()
    for (const e of evals) {
      const errors = Array.isArray(e.errors_found) ? e.errors_found : []
      for (const err of errors) {
        const key = (err as any).type || 'unknown'
        const existing = errorMap.get(key) || { type: key, count: 0 }
        existing.count++
        errorMap.set(key, existing)
      }
    }
    const topErrors = Array.from(errorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(e => ({ ...e, pct: Math.round((e.count / totalConversations) * 10000) / 100 }))

    // 5. Attendant ranking
    const attMap = new Map<string, { id: string; scores: number[]; count: number }>()
    for (const e of evals) {
      const attId = e.attendant_id || 'unknown'
      const existing = attMap.get(attId) || { id: attId, scores: [], count: 0 }
      existing.scores.push(Number(e.overall_score) || 0)
      existing.count++
      attMap.set(attId, existing)
    }
    const attendantRanking = Array.from(attMap.values())
      .map(a => ({
        attendant_id: a.id,
        avg_score: Math.round((a.scores.reduce((s, v) => s + v, 0) / a.count) * 100) / 100,
        conversations: a.count,
      }))
      .sort((a, b) => b.avg_score - a.avg_score)

    // 6. Daily trend
    const dayMap = new Map<string, { scores: number[]; count: number }>()
    for (const e of evals) {
      const day = e.period_date
      const existing = dayMap.get(day) || { scores: [], count: 0 }
      existing.scores.push(Number(e.overall_score) || 0)
      existing.count++
      dayMap.set(day, existing)
    }
    const dailyTrend = Array.from(dayMap.entries())
      .map(([date, d]) => ({
        date,
        avg_score: Math.round((d.scores.reduce((s, v) => s + v, 0) / d.count) * 100) / 100,
        conversations: d.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 7. Generate text summary
    const textSummary = `📊 Relatório de Qualidade — ${payload.period_start} a ${payload.period_end}

📈 Score médio: ${roundedAvg}/10
💬 Conversas analisadas: ${totalConversations}
⚠ Abaixo do mínimo (${threshold}): ${belowCount} conversas (${belowPct}%)

🔴 Top erros:
${topErrors.map((e, i) => `${i + 1}. ${e.type} (${e.pct}% das conversas)`).join('\n')}

🏆 Ranking:
${attendantRanking.map((a, i) => `${i + 1}. ${a.attendant_id} — ${a.avg_score}/10 (${a.conversations} atendimentos)`).join('\n')}`

    // 8. Save report
    const { error: insertError } = await supabase.from('audit_reports').insert({
      license_id: payload.license_id,
      report_type: payload.report_type,
      period_start: payload.period_start,
      period_end: payload.period_end,
      total_conversations: totalConversations,
      avg_overall_score: roundedAvg,
      below_threshold_pct: belowPct,
      top_errors: topErrors,
      attendant_ranking: attendantRanking,
      daily_trend: dailyTrend,
      text_summary: textSummary,
    })

    if (insertError) throw new Error(`Insert report error: ${insertError.message}`)

    return new Response(
      JSON.stringify({
        status: 'generated',
        report: {
          total_conversations: totalConversations,
          avg_score: roundedAvg,
          below_threshold_pct: belowPct,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Report generation error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
