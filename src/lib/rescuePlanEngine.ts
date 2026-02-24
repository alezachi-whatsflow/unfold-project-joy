import { WebScrap, ProfileAnalysis } from "@/types/intelligence";
import { RescuePlan, ChannelRescuePlan, RescueAction, UrgencyLevel } from "@/types/rescuePlan";
import { ChannelThreshold } from "@/types/rescuePlan";
import {
  getWebsiteThreshold,
  getInstagramThreshold,
  calculateOverallScore,
  detectNicheBenchmark,
} from "./thresholdScoring";

// ─── Main entry: generate rescue plan from collected data ───
export function generateLocalRescuePlan(
  websiteData: WebScrap | null,
  instagramData: ProfileAnalysis | null,
  _gmnData: any,
  websiteScore: number | null,
  instagramScore: number | null,
  gmnScore: number | null
): RescuePlan {
  const wsThreshold = websiteScore !== null ? getWebsiteThreshold(websiteScore) : null;
  const igThreshold = instagramScore !== null ? getInstagramThreshold(instagramScore) : null;
  const overall = calculateOverallScore(websiteScore, instagramScore, gmnScore);

  const niche = websiteData?.niche || detectNicheFromData(websiteData, instagramData);
  const { key: nicheKey, benchmark } = detectNicheBenchmark(niche);

  const urgencia = getUrgency(overall.score, wsThreshold, igThreshold);

  const websitePlan = wsThreshold && (wsThreshold.status !== "green")
    ? buildWebsitePlan(websiteData, wsThreshold, benchmark.website)
    : undefined;

  const instagramPlan = igThreshold && (igThreshold.status !== "green")
    ? buildInstagramPlan(instagramData, igThreshold, benchmark.instagram)
    : undefined;

  const motivo = buildMotivo(wsThreshold, igThreshold, null, overall);

  return {
    ativado: true,
    motivo,
    urgencia,
    nicho_detectado: nicheKey !== "default" ? nicheKey : (niche || "Serviços Gerais"),
    benchmark_mercado: benchmark,
    website: websitePlan,
    instagram: instagramPlan,
  };
}

// ─── Detect niche from scraped data ───
function detectNicheFromData(ws: WebScrap | null, ig: ProfileAnalysis | null): string | null {
  const text = [
    ws?.title, ws?.description, ws?.niche, ws?.value_proposition,
    ig?.bio, ig?.content_strategy_notes,
  ].filter(Boolean).join(" ").toLowerCase();

  const nicheKeywords: Record<string, string[]> = {
    "educação": ["escola", "curso", "educação", "ensino", "professor", "aluno", "universidade", "faculdade"],
    "saúde": ["clínica", "médico", "saúde", "hospital", "odonto", "dentista", "fisioterapia", "psicólogo", "nutrição"],
    "varejo": ["loja", "varejo", "ecommerce", "e-commerce", "produto", "comprar", "shop"],
    "restaurante": ["restaurante", "pizzaria", "hamburgueria", "comida", "delivery", "gastronomia", "menu", "cardápio"],
    "alimentação": ["alimento", "food", "padaria", "café", "cafeteria", "confeitaria"],
    "b2b": ["b2b", "enterprise", "corporativo", "empresarial"],
    "saas": ["saas", "software", "plataforma", "app", "dashboard", "sistema"],
    "serviços": ["serviço", "consultoria", "agência", "freelancer", "profissional"],
  };

  for (const [niche, keywords] of Object.entries(nicheKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) return niche;
  }
  return null;
}

// ─── Urgency ───
function getUrgency(
  overallScore: number,
  ws: ChannelThreshold | null,
  ig: ChannelThreshold | null
): UrgencyLevel {
  const hasRed = [ws, ig].some((t) => t?.status === "red");
  if (overallScore < 4.0 || hasRed) return "Crítica";
  if (overallScore < 5.5) return "Alta";
  return "Moderada";
}

// ─── Motivo ───
function buildMotivo(
  ws: ChannelThreshold | null,
  ig: ChannelThreshold | null,
  _gmn: ChannelThreshold | null,
  overall: ChannelThreshold
): string {
  const parts: string[] = [];
  if (ws && ws.status !== "green") parts.push(`Website em ${ws.score.toFixed(1)}/10 (${ws.label})`);
  if (ig && ig.status !== "green") parts.push(`Instagram em ${ig.score.toFixed(1)}/10 (${ig.label})`);
  if (parts.length === 0) parts.push(`Score geral ${overall.score.toFixed(1)}/10`);
  return `Plano ativado: ${parts.join("; ")}. Limiar de aprovação: 6.5.`;
}

// ─── Website Plan ───
function buildWebsitePlan(
  data: WebScrap | null,
  threshold: ChannelThreshold,
  benchmarkScore: number
): ChannelRescuePlan {
  const weakPoints: string[] = [];
  const actions: RescueAction[] = [];
  const quickWins: string[] = [];
  let order = 1;

  const title = data?.title || "";
  const description = data?.description || "";
  const keywords = data?.keywords || [];
  const markdown = data?.raw_markdown || "";

  // Check meta description
  if (!description || description.length < 50) {
    weakPoints.push("Meta Description ausente ou curta");
    actions.push({
      ordem: order++,
      acao: description
        ? `Sua meta description tem apenas ${description.length} caracteres ("${description.substring(0, 60)}..."). Reescreva com 150-160 caracteres incluindo sua proposta de valor.`
        : `O site "${data?.url || ""}" não possui meta description. Crie uma com 150-160 caracteres descrevendo o negócio.`,
      onde_fazer: "HTML do site → tag <meta name=\"description\"> no <head>",
      como_fazer: "1. Acesse o painel do seu site (WordPress, Wix, etc.)\n2. Vá em Configurações de SEO\n3. Preencha o campo Meta Description\n4. Inclua palavra-chave principal + proposta de valor\n5. Salve e publique",
      impacto_esperado: "Melhora o CTR nos resultados de busca em 15-30%",
      tempo_estimado: "15 minutos",
      custo: "Gratuito",
    });
    quickWins.push(
      description
        ? `Expanda sua meta description de ${description.length} para 150+ caracteres`
        : `Adicione uma meta description ao site ${data?.url || ""}`
    );
  }

  // Check title
  if (!title || title.length < 20) {
    weakPoints.push("Título da página fraco ou ausente");
    actions.push({
      ordem: order++,
      acao: title
        ? `Seu título "${title}" tem ${title.length} caracteres. Reescreva com 50-60 caracteres, incluindo palavra-chave do nicho no início.`
        : `O site não possui um título otimizado. Crie um com 50-60 caracteres.`,
      onde_fazer: "HTML do site → tag <title> no <head>",
      como_fazer: "1. Identifique sua palavra-chave principal\n2. Coloque-a no início do título\n3. Adicione diferencial ou localidade\n4. Mantenha entre 50-60 caracteres\n5. Exemplo: '[Palavra-chave] - [Diferencial] | [Nome]'",
      impacto_esperado: "Melhora posicionamento e CTR orgânico",
      tempo_estimado: "10 minutos",
      custo: "Gratuito",
    });
  }

  // Check keywords
  if (keywords.length === 0) {
    weakPoints.push("Nenhuma keyword identificada");
    actions.push({
      ordem: order++,
      acao: "Nenhuma palavra-chave foi identificada no site. Defina 5-10 keywords relevantes para o nicho e distribua nos títulos, subtítulos e conteúdo.",
      onde_fazer: "Conteúdo de todas as páginas do site",
      como_fazer: "1. Use o Google Keyword Planner (gratuito)\n2. Pesquise termos do seu nicho\n3. Selecione 5-10 com bom volume\n4. Insira no H1, H2 e primeiro parágrafo\n5. Não repita excessivamente (1-2% de densidade)",
      impacto_esperado: "Base para ranqueamento orgânico — sem keywords não há SEO",
      tempo_estimado: "1 hora",
      custo: "Gratuito",
    });
    quickWins.push("Pesquise 5 keywords do seu nicho no Google Keyword Planner e anote");
  }

  // Check content length
  if (markdown.length < 1000) {
    weakPoints.push("Conteúdo textual insuficiente");
    actions.push({
      ordem: order++,
      acao: `O conteúdo do site tem apenas ~${markdown.length} caracteres. Sites bem posicionados no seu nicho têm pelo menos 2000-3000 caracteres por página principal.`,
      onde_fazer: "Página inicial e páginas de serviço/produto",
      como_fazer: "1. Escreva sobre os problemas que você resolve\n2. Adicione seção de perguntas frequentes\n3. Inclua depoimentos de clientes\n4. Descreva seus diferenciais\n5. Publique e indexe no Google Search Console",
      impacto_esperado: "Páginas com mais conteúdo relevante ranqueiam 2-3x melhor",
      tempo_estimado: "2-3 horas",
      custo: "Gratuito",
    });
  }

  // Check value proposition
  if (!data?.value_proposition) {
    weakPoints.push("Proposta de valor não identificada");
    actions.push({
      ordem: order++,
      acao: "Não foi possível identificar uma proposta de valor clara no site. Adicione um headline principal (H1) que diga exatamente o que você faz e para quem.",
      onde_fazer: "Seção hero/topo da página inicial",
      como_fazer: "1. Responda: 'O que eu faço + para quem + resultado'\n2. Escreva em 1 frase de até 10 palavras\n3. Coloque como H1 na página inicial\n4. Adicione um subtítulo com mais detalhes\n5. Teste: alguém entende seu negócio em 5 segundos?",
      impacto_esperado: "Reduz taxa de rejeição e aumenta conversão em até 30%",
      tempo_estimado: "30 minutos",
      custo: "Gratuito",
    });
    quickWins.push("Escreva um H1 claro com: o que faz + para quem + resultado");
  }

  // Ensure at least 3 quick wins
  if (quickWins.length < 3) {
    const extras = [
      `Verifique se ${data?.url || "seu site"} é responsivo no celular usando Google Mobile-Friendly Test`,
      "Cadastre seu site no Google Search Console (gratuito) para monitorar indexação",
      "Adicione um CTA (botão de ação) visível acima da dobra na página inicial",
    ];
    for (const e of extras) {
      if (quickWins.length >= 3) break;
      quickWins.push(e);
    }
  }

  return {
    ativado: true,
    status: threshold.label,
    score: threshold.score,
    abaixo_em: weakPoints,
    plano_imediato: actions,
    quick_wins: quickWins.slice(0, 3),
  };
}

// ─── Instagram Plan ───
function buildInstagramPlan(
  data: ProfileAnalysis | null,
  threshold: ChannelThreshold,
  benchmarkScore: number
): ChannelRescuePlan {
  const weakPoints: string[] = [];
  const actions: RescueAction[] = [];
  const quickWins: string[] = [];
  let order = 1;

  const bio = data?.bio || "";
  const followers = data?.followers || 0;
  const following = data?.following || 0;
  const posts = data?.posts_count || 0;
  const engagement = data?.avg_engagement_rate || 0;
  const username = data?.username || "";

  // Check bio
  if (!bio || bio.length < 30) {
    weakPoints.push("Bio fraca ou ausente");
    actions.push({
      ordem: order++,
      acao: bio
        ? `Sua bio "@${username}" tem apenas ${bio.length} caracteres: "${bio}". Reescreva com: nicho + proposta de valor + CTA + link.`
        : `O perfil @${username} não possui bio. Crie uma com: o que faz, para quem, CTA e link.`,
      onde_fazer: "Instagram → Editar perfil → Bio",
      como_fazer: "1. Linha 1: O que você faz (ex: 'Consultor de Marketing Digital')\n2. Linha 2: Para quem (ex: 'Ajudo PMEs a venderem online')\n3. Linha 3: Prova social (ex: '+200 clientes atendidos')\n4. Linha 4: CTA (ex: '👇 Agende uma consulta grátis')\n5. Link: Use Linktree ou similar",
      impacto_esperado: "Bio otimizada aumenta conversão de visitante em seguidor em 20-40%",
      tempo_estimado: "15 minutos",
      custo: "Gratuito",
    });
    quickWins.push(`Reescreva a bio do @${username} com nicho + proposta + CTA`);
  }

  // Check follower/following ratio
  if (following > 0 && followers > 0 && following / followers > 1.5) {
    weakPoints.push("Proporção seguidores/seguindo desfavorável");
    actions.push({
      ordem: order++,
      acao: `@${username} segue ${following} perfis mas tem apenas ${followers} seguidores (proporção ${(following / followers).toFixed(1)}:1). Reduza quem segue e foque em conteúdo para atrair seguidores orgânicos.`,
      onde_fazer: "Instagram → Lista de seguindo",
      como_fazer: "1. Revise perfis que segue\n2. Deixe de seguir contas inativas ou irrelevantes\n3. Mantenha proporção ideal abaixo de 0.8:1\n4. Foque em criar conteúdo de valor\n5. Use hashtags do nicho para alcance",
      impacto_esperado: "Melhora percepção de autoridade e credibilidade",
      tempo_estimado: "30 minutos",
      custo: "Gratuito",
    });
  }

  // Check engagement
  if (engagement < 2 && posts > 0) {
    weakPoints.push("Taxa de engajamento baixa");
    actions.push({
      ordem: order++,
      acao: `A taxa de engajamento de @${username} é ${engagement.toFixed(1)}%. A média do mercado é 3-5%. Melhore interatividade nos posts.`,
      onde_fazer: "Instagram → Conteúdo dos posts",
      como_fazer: "1. Use CTAs em toda legenda ('comente', 'salve', 'compartilhe')\n2. Faça perguntas no final dos posts\n3. Responda TODOS os comentários em até 1h\n4. Use carrosseis (têm 2x mais engajamento)\n5. Poste nos melhores horários (veja Insights)",
      impacto_esperado: "Engajamento acima de 3% melhora alcance orgânico no algoritmo",
      tempo_estimado: "Contínuo (15 min/dia)",
      custo: "Gratuito",
    });
  }

  // Check post count
  if (posts < 30) {
    weakPoints.push("Poucos posts publicados");
    actions.push({
      ordem: order++,
      acao: `@${username} tem apenas ${posts} posts. Perfis de autoridade no nicho têm 100+ posts. Crie um calendário editorial.`,
      onde_fazer: "Instagram → Criar publicação",
      como_fazer: "1. Defina 3-4 pilares de conteúdo do nicho\n2. Crie calendário com 3-5 posts/semana\n3. Alterne: educativo, bastidores, prova social, entretenimento\n4. Use templates no Canva para agilizar\n5. Agende com Meta Business Suite (gratuito)",
      impacto_esperado: "Consistência é o fator #1 para crescimento orgânico",
      tempo_estimado: "2h/semana",
      custo: "Gratuito",
    });
    quickWins.push(`Planeje os próximos 7 posts de @${username} com temas do nicho`);
  }

  // Ensure quick wins
  if (quickWins.length < 3) {
    const extras = [
      `Atualize a foto de perfil de @${username} para uma imagem profissional de alta qualidade`,
      `Adicione destaques organizados por tema (Sobre, Serviços, Depoimentos) no perfil @${username}`,
      `Responda todos os comentários e DMs pendentes de @${username} hoje`,
    ];
    for (const e of extras) {
      if (quickWins.length >= 3) break;
      if (!quickWins.includes(e)) quickWins.push(e);
    }
  }

  return {
    ativado: true,
    status: threshold.label,
    score: threshold.score,
    abaixo_em: weakPoints,
    plano_imediato: actions,
    quick_wins: quickWins.slice(0, 3),
  };
}
