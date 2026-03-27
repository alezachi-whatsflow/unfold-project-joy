/**
 * generate-crm-schema — Onboarding Zero Fricção
 *
 * Receives onboarding answers, sends to OpenAI Assistant,
 * returns a tailored pipeline config (name, stages, card_schema).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAssistant } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // 1. Authenticate user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 2. Parse request body
    const { answers } = await req.json();
    if (!answers || typeof answers !== "string") {
      return json({ error: "Campo 'answers' (string) é obrigatório" }, 400);
    }

    // 3. Get Assistant ID from secrets
    const assistantId = Deno.env.get("OPENAI_CRM_ASSISTANT_ID");
    if (!assistantId) {
      return json({ error: "OPENAI_CRM_ASSISTANT_ID not configured" }, 500);
    }

    // 4. Call OpenAI Assistant for pipeline + card schema
    console.log("generate-crm-schema: calling assistant for user", user.id);

    const rawResponse = await callAssistant({
      assistantId,
      message: answers,
      maxWaitMs: 90000,
      pollIntervalMs: 2000,
    });

    console.log("generate-crm-schema: raw response length:", rawResponse.length);

    // 5. Parse pipeline JSON from assistant
    let parsed: {
      pipeline_name: string;
      stages: Array<{ name: string; color?: string; order: number }>;
      card_schema: Array<{ key: string; label: string; type: string; options?: string[]; required: boolean }>;
    };

    try {
      const cleaned = rawResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("generate-crm-schema: failed to parse assistant response:", rawResponse.substring(0, 500));
      return json({ error: "Falha ao interpretar resposta da I.A.", raw: rawResponse.substring(0, 1000) }, 502);
    }

    if (!parsed.pipeline_name || !Array.isArray(parsed.stages) || !Array.isArray(parsed.card_schema)) {
      return json({ error: "Resposta da I.A. incompleta — faltam pipeline_name, stages ou card_schema", parsed }, 502);
    }

    // 6. Generate extras via chat completions (departments, tags, quick replies, etc.)
    let extras: {
      departments: Array<{ name: string; color: string; description: string }>;
      tags: Array<{ name: string; color: string; category: string }>;
      quick_replies: Array<{ title: string; shortcut: string; body: string }>;
      welcome_message: string;
      away_message: string;
      business_hours: string;
      follow_ups: Array<{ title: string; body: string }>;
    } = {
      departments: [],
      tags: [],
      quick_replies: [],
      welcome_message: "",
      away_message: "",
      business_hours: "",
      follow_ups: [],
    };

    try {
      const { callAI } = await import("../_shared/ai.ts");

      const extrasPrompt = `Com base nas informações do negócio abaixo, gere um JSON com as seguintes chaves:

1. "departments": array com 3-5 setores/departamentos relevantes para este tipo de negócio. Cada item: { "name": string, "color": hex string, "description": breve descrição }.
2. "tags": array com 8-12 tags úteis para classificar leads/contatos. Cada item: { "name": string, "color": hex string, "category": "lead_status" | "priority" | "source" | "general" }.
3. "quick_replies": array com exatamente 5 respostas rápidas prontas para uso no WhatsApp. Cada item: { "title": nome curto, "shortcut": atalho com / (ex: "/ola"), "body": texto completo da mensagem }.
4. "welcome_message": mensagem de boas-vindas para o Webchat/WhatsApp (1-2 frases, profissional).
5. "away_message": mensagem de ausência fora do horário (1-2 frases).
6. "business_hours": horário de funcionamento sugerido (ex: "Seg-Sex 08:00-18:00, Sáb 08:00-12:00").
7. "follow_ups": array com 3 templates de follow-up pós-contato. Cada item: { "title": nome curto, "body": texto completo }.

Informações do negócio:
${answers}

Pipeline gerado: ${parsed.pipeline_name} com etapas: ${parsed.stages.map(s => s.name).join(', ')}

Retorne APENAS JSON válido, sem markdown, sem explicações.`;

      const extrasRaw = await callAI({
        messages: [
          { role: "system", content: "Você é um configurador de CRM especializado. Gera configurações práticas e profissionais para empresas brasileiras. Sempre retorna JSON puro sem markdown." },
          { role: "user", content: extrasPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      });

      const extrasClean = extrasRaw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const extrasParsed = JSON.parse(extrasClean);
      extras = {
        departments: Array.isArray(extrasParsed.departments) ? extrasParsed.departments : [],
        tags: Array.isArray(extrasParsed.tags) ? extrasParsed.tags : [],
        quick_replies: Array.isArray(extrasParsed.quick_replies) ? extrasParsed.quick_replies.slice(0, 5) : [],
        welcome_message: extrasParsed.welcome_message || "",
        away_message: extrasParsed.away_message || "",
        business_hours: extrasParsed.business_hours || "",
        follow_ups: Array.isArray(extrasParsed.follow_ups) ? extrasParsed.follow_ups.slice(0, 3) : [],
      };

      console.log("generate-crm-schema: extras generated —", extras.departments.length, "departments,", extras.tags.length, "tags,", extras.quick_replies.length, "quick_replies");
    } catch (extrasErr: any) {
      console.warn("generate-crm-schema: extras generation failed (non-fatal):", extrasErr.message);
      // Non-fatal: pipeline is still valid without extras
    }

    console.log("generate-crm-schema: success —", parsed.pipeline_name, "with", parsed.stages.length, "stages and", parsed.card_schema.length, "fields");

    return json({
      pipeline_name: parsed.pipeline_name,
      stages: parsed.stages,
      card_schema: parsed.card_schema,
      ...extras,
    });
  } catch (err) {
    console.error("generate-crm-schema error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
