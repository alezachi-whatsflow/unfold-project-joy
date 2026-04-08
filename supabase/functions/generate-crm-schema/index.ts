/**
 * generate-crm-schema — Onboarding Zero Friccao
 *
 * Receives onboarding answers, calls OpenAI to generate
 * a tailored pipeline config (name, stages, card_schema, extras).
 * Uses callAI (chat completions) — no Assistant ID needed.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `Voce e um especialista em CRM e vendas B2B/B2C para empresas brasileiras.

Com base nas informacoes do negocio fornecidas, gere um JSON com EXATAMENTE esta estrutura:

{
  "pipeline_name": "Nome do pipeline (ex: Vendas Clinica, Pipeline Consultoria)",
  "stages": [
    { "name": "Prospeccao", "color": "#60a5fa", "order": 1 },
    { "name": "Qualificado", "color": "#a78bfa", "order": 2 },
    { "name": "Proposta Enviada", "color": "#f59e0b", "order": 3 },
    { "name": "Negociacao", "color": "#fb923c", "order": 4 },
    { "name": "Fechado Ganho", "color": "#4ade80", "order": 5 },
    { "name": "Fechado Perdido", "color": "#f87171", "order": 6 }
  ],
  "card_schema": [
    { "key": "orcamento", "label": "Orcamento", "type": "currency", "required": true },
    { "key": "prazo_decisao", "label": "Prazo de Decisao", "type": "date", "required": false },
    { "key": "origem_lead", "label": "Origem do Lead", "type": "select", "options": ["Google", "Instagram", "Indicacao"], "required": true }
  ],
  "departments": [
    { "name": "Comercial", "color": "#478BFF", "description": "Equipe de vendas" }
  ],
  "tags": [
    { "name": "Lead Quente", "color": "#ef4444", "category": "lead_status" }
  ],
  "quick_replies": [
    { "title": "Boas-vindas", "shortcut": "/ola", "body": "Ola! Tudo bem? Como posso ajudar?" }
  ],
  "welcome_message": "Ola! Seja bem-vindo. Como posso ajudar?",
  "away_message": "No momento estamos fora do horario. Retornaremos em breve!",
  "business_hours": "Seg-Sex 08:00-18:00",
  "follow_ups": [
    { "title": "Follow-up 1", "body": "Ola! Gostaria de saber se teve alguma duvida sobre nossa proposta." }
  ]
}

Regras:
- stages DEVE ter pelo menos 4 etapas + "Fechado Ganho" + "Fechado Perdido"
- card_schema deve ter 3-6 campos relevantes para o tipo de negocio
- types permitidos: text, number, currency, date, select, boolean, url, email, phone
- tags deve ter 8-12 itens com categorias: lead_status, priority, source, general
- quick_replies deve ter exatamente 5 respostas praticas
- follow_ups deve ter 3 templates
- Personalize TUDO para o segmento especifico do negocio
- Retorne APENAS JSON valido, sem markdown, sem explicacoes`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { answers } = await req.json();
    if (!answers || typeof answers !== "string") {
      return json({ error: "Campo 'answers' (string) e obrigatorio" }, 400);
    }

    console.log("[generate-crm-schema] Generating for user:", user.id, "answers length:", answers.length);

    // Single AI call with structured prompt
    const rawResponse = await callAI({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: answers },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    console.log("[generate-crm-schema] Response length:", rawResponse.length);

    // Parse JSON response
    const cleaned = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[generate-crm-schema] Failed to parse:", cleaned.substring(0, 500));
      return json({ error: "Falha ao interpretar resposta da I.A.", raw: cleaned.substring(0, 500) }, 502);
    }

    if (!parsed.pipeline_name || !Array.isArray(parsed.stages)) {
      return json({ error: "Resposta incompleta — faltam pipeline_name ou stages" }, 502);
    }

    console.log("[generate-crm-schema] Success:", parsed.pipeline_name, "-", parsed.stages?.length, "stages,", parsed.card_schema?.length, "fields");

    return json({
      pipeline_name: parsed.pipeline_name,
      stages: parsed.stages || [],
      card_schema: parsed.card_schema || [],
      departments: parsed.departments || [],
      tags: parsed.tags || [],
      quick_replies: (parsed.quick_replies || []).slice(0, 5),
      welcome_message: parsed.welcome_message || "",
      away_message: parsed.away_message || "",
      business_hours: parsed.business_hours || "",
      follow_ups: (parsed.follow_ups || []).slice(0, 3),
    });
  } catch (err) {
    console.error("[generate-crm-schema] Error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
