/**
 * instagram-ai-analysis
 * Sends Instagram profile data to the OpenAI Assistant
 * "Whatsflow Intelligence Analyst" for deep 7-pillar analysis.
 * The prompt/instructions live in the Assistant, not here.
 */
import { callAssistant } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile } = await req.json();
    if (!profile) throw new Error("profile data is required");

    const assistantId = Deno.env.get("OPENAI_ASSISTANT_ID");
    if (!assistantId) throw new Error("OPENAI_ASSISTANT_ID not configured");

    // Build the message with profile data — the Assistant has the analysis instructions
    const message = `Analise este perfil do Instagram com foco em autoridade digital, posicionamento e conversão.

Dados do perfil:
- Username: @${profile.username || "desconhecido"}
- Nome: ${profile.display_name || "N/A"}
- Bio: ${profile.bio || "Sem bio"}
- Seguidores: ${profile.followers || 0}
- Seguindo: ${profile.following || 0}
- Posts: ${profile.posts_count || 0}
- Taxa de engajamento: ${profile.avg_engagement_rate ? profile.avg_engagement_rate + "%" : "N/A"}
- Verificado: ${profile.verified ? "Sim" : "Não"}
- É business: ${profile.is_business ? "Sim" : "Não/desconhecido"}
- URL: ${profile.profile_url || "N/A"}
${profile.content_strategy_notes ? "- Notas sobre conteúdo: " + profile.content_strategy_notes : ""}
${profile.bio_links ? "- Links na bio: " + JSON.stringify(profile.bio_links) : ""}
${profile.latest_posts_summary ? "- Resumo dos últimos posts: " + profile.latest_posts_summary : ""}

Faça a análise completa usando os 7 pilares definidos nas suas instruções.
Seja direto, crítico, estratégico e prático.
Responda em JSON válido.`;

    console.log(`[instagram-ai-analysis] Calling Assistant ${assistantId} for @${profile.username}`);

    const rawContent = await callAssistant({
      assistantId,
      message,
      maxWaitMs: 90000, // 90s max wait
      pollIntervalMs: 2000,
    });

    // Parse JSON from Assistant response
    let analysis;
    try {
      let jsonStr = rawContent.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      analysis = JSON.parse(jsonStr);
    } catch {
      console.warn("[instagram-ai-analysis] Response not JSON, wrapping as text");
      analysis = {
        score_geral: 0,
        diagnostico_geral: rawContent,
        parse_error: true,
      };
    }

    console.log(`[instagram-ai-analysis] Analysis complete for @${profile.username}, score: ${analysis.score_geral}`);

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[instagram-ai-analysis]", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
