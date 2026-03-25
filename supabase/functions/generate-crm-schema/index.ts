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

    // 4. Call OpenAI Assistant via shared utility
    //    callAssistant reads api_key from ai_configurations (global OpenAI config)
    console.log("generate-crm-schema: calling assistant for user", user.id);

    const rawResponse = await callAssistant({
      assistantId,
      message: answers,
      maxWaitMs: 90000,   // 90s timeout (assistant may think deeply)
      pollIntervalMs: 2000,
    });

    console.log("generate-crm-schema: raw response length:", rawResponse.length);

    // 5. Parse the JSON from assistant response
    //    The assistant should return valid JSON with pipeline_name, stages, card_schema
    let parsed: {
      pipeline_name: string;
      stages: Array<{ name: string; color?: string; order: number }>;
      card_schema: Array<{
        key: string;
        label: string;
        type: string;
        options?: string[];
        required: boolean;
      }>;
    };

    try {
      // Strip markdown code fences if present
      const cleaned = rawResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("generate-crm-schema: failed to parse assistant response:", rawResponse.substring(0, 500));
      return json({
        error: "Falha ao interpretar resposta da I.A.",
        raw: rawResponse.substring(0, 1000),
      }, 502);
    }

    // 6. Validate required fields
    if (!parsed.pipeline_name || !Array.isArray(parsed.stages) || !Array.isArray(parsed.card_schema)) {
      return json({
        error: "Resposta da I.A. incompleta — faltam pipeline_name, stages ou card_schema",
        parsed,
      }, 502);
    }

    console.log("generate-crm-schema: success —", parsed.pipeline_name, "with", parsed.stages.length, "stages and", parsed.card_schema.length, "fields");

    return json({
      pipeline_name: parsed.pipeline_name,
      stages: parsed.stages,
      card_schema: parsed.card_schema,
    });
  } catch (err) {
    console.error("generate-crm-schema error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
