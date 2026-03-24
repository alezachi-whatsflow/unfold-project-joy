/**
 * instagram-ai-analysis
 * Receives Instagram profile data and runs deep AI analysis
 * using the 7 authority pillars framework.
 */
import { callAI } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um consultor sênior de posicionamento digital e autoridade no Instagram.

Sua função é analisar perfis do Instagram com profundidade estratégica, identificando falhas de posicionamento, clareza de mensagem, autoridade percebida e capacidade de conversão.

Seu estilo: direto, honesto, estratégico, prático, sem elogios vazios, mentor exigente mas útil.

## ANALISE USANDO ESTES 7 PILARES (nota 0 a 10 cada):

1. POSICIONAMENTO — clareza de nicho, público-alvo, promessa, diferenciação
2. BIO E PRIMEIRA IMPRESSÃO — clareza em 5 segundos, CTA, link, foto, proposta de valor
3. CONTEÚDO — frequência, formatos, profundidade, equilíbrio autoridade/conexão/prova/conversão
4. ENGAJAMENTO — relação seguidores/interação, qualidade dos comentários, comunidade real
5. AUTORIDADE PERCEBIDA — prova social, depoimentos, cases, linguagem de especialista
6. CONSISTÊNCIA E IDENTIDADE — coerência visual/verbal, tom de voz, linha editorial
7. CONVERSÃO E ESTRUTURA COMERCIAL — CTA, destaques estratégicos, funil, clareza da oferta

## FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
{
  "score_geral": 5.5,
  "pilares": {
    "posicionamento": { "score": 6.0, "diagnostico": "..." },
    "bio_primeira_impressao": { "score": 4.5, "diagnostico": "..." },
    "conteudo": { "score": 7.0, "diagnostico": "..." },
    "engajamento": { "score": 5.0, "diagnostico": "..." },
    "autoridade_percebida": { "score": 3.5, "diagnostico": "..." },
    "consistencia_identidade": { "score": 6.0, "diagnostico": "..." },
    "conversao_estrutura": { "score": 4.0, "diagnostico": "..." }
  },
  "diagnostico_geral": "Resumo direto em 3-6 linhas do principal problema",
  "enfraquece_autoridade": ["ponto 1", "ponto 2", "ponto 3"],
  "pontos_positivos": ["ponto 1", "ponto 2"],
  "melhorias_prioritarias": [
    { "acao": "...", "prioridade": "imediata", "impacto": "alto" },
    { "acao": "...", "prioridade": "importante", "impacto": "medio" },
    { "acao": "...", "prioridade": "estrategica", "impacto": "alto" }
  ],
  "sugestoes_bio": ["Opção 1 de bio reescrita", "Opção 2"],
  "sugestoes_conteudo": [
    { "tipo": "reel|carrossel|story|post", "titulo": "...", "foco": "autoridade|prova|conexao|conversao" }
  ],
  "urgencia": "critico|atencao|bom|excelente",
  "nicho_detectado": "...",
  "veredito": "Esse perfil transmite autoridade real? Resposta direta."
}

REGRAS:
- Responda APENAS em JSON válido, sem markdown
- Português brasileiro
- Seja específico, nunca genérico
- Conecte cada crítica com impacto em percepção, confiança e conversão
- Não confunda estética com autoridade
- Não confunda engajamento com influência real`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile } = await req.json();
    if (!profile) throw new Error("profile data is required");

    // Build analysis input from profile data
    const input = `Analise este perfil do Instagram:

- Username: @${profile.username || "desconhecido"}
- Nome: ${profile.display_name || "N/A"}
- Bio: ${profile.bio || "Sem bio"}
- Seguidores: ${profile.followers || 0}
- Seguindo: ${profile.following || 0}
- Posts: ${profile.posts_count || 0}
- Taxa de engajamento: ${profile.avg_engagement_rate ? profile.avg_engagement_rate + "%" : "N/A"}
- Verificado: ${profile.verified ? "Sim" : "Não"}
- É business: ${profile.is_business ? "Sim" : "Não/desconhecido"}
- URL do perfil: ${profile.profile_url || "N/A"}
- Notas sobre conteúdo: ${profile.content_strategy_notes || "N/A"}
${profile.bio_links ? "- Links na bio: " + JSON.stringify(profile.bio_links) : ""}
${profile.latest_posts_summary ? "- Resumo dos últimos posts: " + profile.latest_posts_summary : ""}

Faça a análise completa usando os 7 pilares. Seja direto, crítico e prático.`;

    const rawContent = await callAI({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });

    // Parse JSON from AI response
    let analysis;
    try {
      let jsonStr = rawContent.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error("[instagram-ai-analysis] Failed to parse AI response:", rawContent.substring(0, 200));
      analysis = { score_geral: 0, diagnostico_geral: rawContent, error: "AI response was not valid JSON" };
    }

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
