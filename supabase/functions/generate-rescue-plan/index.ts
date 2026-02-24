const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { websiteData, instagramData, gmnData, websiteScore, instagramScore, gmnScore } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um consultor de marketing digital especialista em diagnóstico de presença digital.
Analise os dados coletados e gere um Plano de Resgate com ações ESPECÍFICAS baseadas nos dados reais.

REGRAS OBRIGATÓRIAS:
1. NUNCA gere ações genéricas como "melhore seu conteúdo" ou "poste mais". Sempre cite dados reais.
2. Cada ação deve referenciar dados coletados (ex: "Seu título atual é 'X' — substitua por 'Y'").
3. Quick wins devem ser ações de menos de 1 hora, gratuitas ou quase.
4. Para Google Meu Negócio, indique o caminho exato no painel (ex: "business.google.com → aba Informações → campo Descrição").
5. Ordene ações por impacto/facilidade (maior impacto + menor esforço primeiro).
6. Detecte o nicho do negócio pelos dados e aplique benchmarks de mercado.

Retorne APENAS o JSON usando a tool function fornecida.`;

    const userPrompt = buildUserPrompt(websiteData, instagramData, gmnData, websiteScore, instagramScore, gmnScore);

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_rescue_plan",
          description: "Gera o plano de resgate completo com ações específicas por canal",
          parameters: {
            type: "object",
            properties: {
              ativado: { type: "boolean" },
              motivo: { type: "string" },
              urgencia: { type: "string", enum: ["Crítica", "Alta", "Moderada"] },
              nicho_detectado: { type: "string" },
              benchmark_mercado: {
                type: "object",
                properties: {
                  website: { type: "number" },
                  instagram: { type: "number" },
                  gmn: { type: "number" },
                },
                required: ["website", "instagram", "gmn"],
              },
              website: channelSchema(),
              instagram: channelSchema(),
              google_meu_negocio: {
                ...channelSchema(),
                properties: {
                  ...channelSchema().properties,
                  checklist_resgate_gmn: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item: { type: "string" },
                        status_atual: { type: "string", enum: ["ausente", "incompleto", "ok"] },
                        instrucao_exata: { type: "string" },
                        impacto_no_ranking_local: { type: "string", enum: ["Alto", "Médio", "Baixo"] },
                      },
                      required: ["item", "status_atual", "instrucao_exata", "impacto_no_ranking_local"],
                    },
                  },
                },
              },
            },
            required: ["ativado", "motivo", "urgencia", "nicho_detectado"],
          },
        },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "generate_rescue_plan" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response from AI");
    }

    const rescuePlan = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, rescuePlan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-rescue-plan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function channelSchema() {
  return {
    type: "object" as const,
    properties: {
      ativado: { type: "boolean" as const },
      status: { type: "string" as const },
      score: { type: "number" as const },
      abaixo_em: { type: "array" as const, items: { type: "string" as const } },
      plano_imediato: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            ordem: { type: "number" as const },
            acao: { type: "string" as const },
            onde_fazer: { type: "string" as const },
            como_fazer: { type: "string" as const },
            impacto_esperado: { type: "string" as const },
            tempo_estimado: { type: "string" as const },
            custo: { type: "string" as const },
          },
          required: ["ordem", "acao", "onde_fazer", "como_fazer", "impacto_esperado", "tempo_estimado", "custo"],
        },
      },
      quick_wins: { type: "array" as const, items: { type: "string" as const } },
    },
    required: ["ativado", "status", "score"],
  };
}

function buildUserPrompt(
  websiteData: any,
  instagramData: any,
  gmnData: any,
  websiteScore: number | null,
  instagramScore: number | null,
  gmnScore: number | null
): string {
  let prompt = "Analise os seguintes dados coletados e gere o plano de resgate:\n\n";

  if (websiteData) {
    prompt += `## WEBSITE (Score: ${websiteScore}/10)\n`;
    prompt += `- URL: ${websiteData.url}\n`;
    prompt += `- Título: ${websiteData.title || "Não encontrado"}\n`;
    prompt += `- Descrição: ${websiteData.description || "Ausente"}\n`;
    prompt += `- Keywords: ${websiteData.keywords?.join(", ") || "Nenhuma"}\n`;
    prompt += `- Proposta de Valor: ${websiteData.value_proposition || "Não identificada"}\n`;
    prompt += `- Nicho: ${websiteData.niche || "Não identificado"}\n`;
    prompt += `- Conteúdo (primeiros 2000 chars): ${(websiteData.raw_markdown || "").substring(0, 2000)}\n\n`;
  }

  if (instagramData) {
    prompt += `## INSTAGRAM (Score: ${instagramScore}/10)\n`;
    prompt += `- Username: @${instagramData.username}\n`;
    prompt += `- Nome: ${instagramData.display_name || "N/A"}\n`;
    prompt += `- Bio: ${instagramData.bio || "Ausente"}\n`;
    prompt += `- Seguidores: ${instagramData.followers || 0}\n`;
    prompt += `- Seguindo: ${instagramData.following || 0}\n`;
    prompt += `- Posts: ${instagramData.posts_count || 0}\n`;
    prompt += `- Engajamento: ${instagramData.avg_engagement_rate || 0}%\n`;
    prompt += `- Notas de Estratégia: ${instagramData.content_strategy_notes || "N/A"}\n\n`;
  }

  if (gmnData) {
    prompt += `## GOOGLE MEU NEGÓCIO (Score: ${gmnScore}/10)\n`;
    prompt += `- Nome: ${gmnData.name}\n`;
    prompt += `- Endereço: ${gmnData.address || "Não informado"}\n`;
    prompt += `- Telefone: ${gmnData.phone || "Ausente"}\n`;
    prompt += `- Website: ${gmnData.website || "Ausente"}\n`;
    prompt += `- Avaliação: ${gmnData.rating || 0}/5 (${gmnData.reviews_count || 0} avaliações)\n`;
    prompt += `- Categoria: ${gmnData.category || "Não definida"}\n\n`;
  }

  prompt += `\nLimiares de referência:
- Website: verde >= 7.5, amarelo >= 5.5, vermelho < 5.5
- Instagram: verde >= 7.0, amarelo >= 5.0, vermelho < 5.0  
- Google Meu Negócio: verde >= 7.5, amarelo >= 5.0, vermelho < 5.0
- Geral (média ponderada): aprovação >= 6.5

Gere ações ESPECÍFICAS citando dados reais coletados. Cada ação deve mencionar elementos concretos do site/perfil analisado.`;

  return prompt;
}
