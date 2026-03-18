import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * ORQUESTRADOR DE IA — Ponto central do módulo composable.
 * Chamado pelo webhook da Mensageria a cada mensagem recebida.
 * Lê as skills ativas da licença e decide quem processar.
 * 
 * FRONTEIRAS INVIOLÁVEIS:
 * - AUDITOR → NÃO executa. NÃO responde ao cliente. Apenas analisa e orienta.
 * - COPILOTO → NÃO automatiza sozinho. NÃO aparece para o cliente. Apenas apoia o atendente.
 * - CLOSER → Executa COM REGRAS E CONTEXTO. Escalonamento humano é obrigatório.
 */

interface OrchestratorPayload {
  license_id: string
  conversation_id: string
  message: string
  attendant_id: string | null
  contact_phone: string
  timestamp: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload: OrchestratorPayload = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Buscar skills ativas da licença
    const { data: license, error } = await supabase
      .from('licenses')
      .select('id, ai_active_skills, ai_config, tenant_id')
      .eq('id', payload.license_id)
      .single()

    if (error || !license) {
      return new Response(
        JSON.stringify({ error: 'License not found', details: error?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const skills = license.ai_active_skills ?? {}
    const config = license.ai_config ?? {}
    const promises: Promise<Response>[] = []
    const baseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 2. COPILOTO — ativo em tempo real se atendente presente
    if (skills.copilot && payload.attendant_id) {
      promises.push(
        fetch(`${baseUrl}/functions/v1/copilot-engine`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            config: config.copilot ?? {},
          }),
        })
      )
    }

    // 3. CLOSER — ativo se não há atendente na conversa
    if (skills.closer && !payload.attendant_id) {
      promises.push(
        fetch(`${baseUrl}/functions/v1/closer-engine`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            config: config.closer ?? {},
          }),
        })
      )
    }

    // 4. AUDITOR — passivo, apenas registra para processamento noturno via CRON
    // Não é chamado aqui em tempo real.

    const results = await Promise.allSettled(promises)

    const routedSkills = []
    if (skills.copilot && payload.attendant_id) routedSkills.push('copilot')
    if (skills.closer && !payload.attendant_id) routedSkills.push('closer')

    return new Response(
      JSON.stringify({
        status: 'routed',
        skills_called: routedSkills,
        results: results.map((r, i) => ({
          skill: routedSkills[i],
          status: r.status,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Orchestrator error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
