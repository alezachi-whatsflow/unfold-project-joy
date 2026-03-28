import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { conversation_id, tenant_id } = await req.json();
    if (!conversation_id) return new Response(JSON.stringify({ error: "conversation_id required" }), { status: 400, headers: corsHeaders });

    // 1. Fetch messages
    const { data: messages } = await supabase
      .from("whatsapp_messages")
      .select("body, direction, type, created_at, sender_name")
      .eq("remote_jid", conversation_id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (!messages || messages.length < 2) {
      return new Response(JSON.stringify({ skipped: true, reason: "not enough messages" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Build conversation text for AI
    const transcript = messages.map(m => {
      const role = m.direction === "incoming" ? "Cliente" : "Atendente";
      return `[${role}] ${m.body || `[${m.type}]`}`;
    }).join("\n");

    // 3. Call AI
    const { callAI } = await import("../_shared/ai.ts");

    const prompt = `Analise esta conversa de atendimento ao cliente e retorne APENAS um JSON valido:

Conversa:
${transcript}

Analise e retorne:
1. "is_resolved_first_contact": boolean - O problema/duvida do cliente foi resolvido nesta conversa sem ele precisar voltar?
2. "sentiment": "positive" | "neutral" | "negative" | "complaint" - Qual o sentimento geral do cliente?
3. "first_yes_index": number | null - Em qual indice de mensagem (0-based) o cliente expressou concordancia/aceite pela primeira vez? (ex: "sim", "ok", "pode ser", "fechado", "quero"). null se nao houve.
4. "summary": string - Resumo de 1 frase da conversa.

Retorne APENAS JSON puro, sem markdown.`;

    const raw = await callAI({
      messages: [
        { role: "system", content: "Voce e um analista de qualidade de atendimento. Retorne apenas JSON valido." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 300,
      tenantId: tenant_id,
    });

    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const analysis = JSON.parse(cleaned);

    // 4. Calculate time_to_first_yes_minutes
    let timeToYes: number | null = null;
    if (analysis.first_yes_index !== null && analysis.first_yes_index !== undefined) {
      const firstMsg = messages[0];
      const yesMsg = messages[Math.min(analysis.first_yes_index, messages.length - 1)];
      if (firstMsg && yesMsg) {
        timeToYes = (new Date(yesMsg.created_at).getTime() - new Date(firstMsg.created_at).getTime()) / 60000;
      }
    }

    // 5. Update whatsapp_leads
    const { error: updateErr } = await supabase
      .from("whatsapp_leads")
      .update({
        is_resolved_first_contact: analysis.is_resolved_first_contact ?? null,
        ai_sentiment_score: analysis.sentiment ?? null,
        time_to_first_yes_minutes: timeToYes,
        resolved_at: new Date().toISOString(),
      })
      .eq("chat_id", conversation_id);

    if (updateErr) console.error("[analyze-conversation] Update error:", updateErr.message);

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        ...analysis,
        time_to_first_yes_minutes: timeToYes,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[analyze-conversation] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
