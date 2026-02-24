import { NeuromarketingAnalysis, NeuroElement, CialdiniTrigger, NeuroImprovement } from "@/types/analysisModules";

// Color psychology mapping
const COLOR_EMOTIONS: Record<string, string> = {
  azul: "Confiança, segurança, profissionalismo",
  verde: "Saúde, crescimento, natureza, dinheiro",
  vermelho: "Urgência, paixão, energia, alerta",
  laranja: "Entusiasmo, criatividade, acessibilidade",
  amarelo: "Otimismo, atenção, cautela",
  roxo: "Luxo, criatividade, sabedoria",
  preto: "Sofisticação, exclusividade, poder",
  branco: "Simplicidade, limpeza, minimalismo",
  rosa: "Feminilidade, romance, suavidade",
};

const NICHE_COLORS: Record<string, string[]> = {
  "saúde": ["azul", "verde", "branco"],
  "educação": ["azul", "verde", "laranja"],
  "varejo": ["vermelho", "laranja", "amarelo"],
  "restaurante": ["vermelho", "laranja", "amarelo"],
  "b2b": ["azul", "preto", "verde"],
  "saas": ["azul", "roxo", "verde"],
  default: ["azul", "verde"],
};

export function analyzeNeuromarketing(rawMarkdown: string | null, niche: string | null): NeuromarketingAnalysis {
  const md = rawMarkdown || "";
  const lower = md.toLowerCase();
  const contentLength = md.length;

  // ─── Content analysis ───
  const hasCTA = /(?:comprar|agendar|contato|saiba mais|começar|cadastr|inscreva|experimente|teste|grátis|gratis)/i.test(lower);
  const ctaCount = (lower.match(/(?:comprar|agendar|contato|saiba mais|começar|cadastr|inscreva|experimente|botão|button|btn)/gi) || []).length;
  const hasVideo = lower.includes("video") || lower.includes("youtube") || lower.includes("vimeo") || lower.includes("<video");
  const hasFaces = lower.includes("equipe") || lower.includes("time") || lower.includes("sobre nós") || lower.includes("depoimento");
  const hasTestimonials = lower.includes("depoimento") || lower.includes("testemunho") || lower.includes("avaliação") || lower.includes("estrela") || lower.includes("review");
  const hasLogos = lower.includes("parceiro") || lower.includes("cliente") || lower.includes("marca") || lower.includes("empresa que confia");
  const hasUrgency = lower.includes("oferta") || lower.includes("limitad") || lower.includes("últimas vagas") || lower.includes("desconto") || lower.includes("promoção");
  const hasScarcity = lower.includes("vagas limitadas") || lower.includes("últimas unidades") || lower.includes("restam apenas") || lower.includes("esgotando");
  const hasGuarantee = lower.includes("garantia") || lower.includes("satisfação") || lower.includes("dinheiro de volta") || lower.includes("selo");
  const hasFAQ = lower.includes("faq") || lower.includes("perguntas frequentes") || lower.includes("dúvidas");
  const hasStory = lower.includes("história") || lower.includes("jornada") || lower.includes("missão") || lower.includes("valores") || lower.includes("fundador");

  // Count H tags for hierarchy
  const h1Count = (lower.match(/#\s/g) || []).length;
  const h2Count = (lower.match(/##\s/g) || []).length;
  const h3Count = (lower.match(/###\s/g) || []).length;
  const hasGoodHierarchy = h1Count >= 1 && h2Count >= 2;

  // Menu items heuristic
  const menuLinks = (lower.match(/\[([^\]]+)\]\(/g) || []).length;
  const tooManyMenuItems = menuLinks > 10;

  // ─── Brain scores ───
  // Reptilian: urgency, CTA, scarcity
  const reptElements: NeuroElement[] = [
    {
      elemento: "CTA Principal",
      status: hasCTA ? "Detectado" : "Ausente",
      achado: hasCTA ? `${ctaCount} CTAs encontrados no conteúdo` : "Nenhum CTA claro detectado",
      recomendacao: hasCTA ? (ctaCount < 3 ? "Adicione mais CTAs distribuídos ao longo da página" : "Boa distribuição") : "Adicione CTAs claros como 'Agendar agora', 'Fale conosco'",
    },
    {
      elemento: "Urgência e Escassez",
      status: hasUrgency || hasScarcity ? "Presente" : "Ausente",
      achado: hasUrgency ? "Elementos de urgência detectados" : "Nenhum gatilho de urgência encontrado",
      recomendacao: !hasUrgency ? "Adicione elementos de urgência: ofertas por tempo limitado, contadores regressivos" : "Mantenha a urgência de forma autêntica",
    },
  ];
  const reptScore = Math.min(10, (hasCTA ? 4 : 0) + (hasUrgency ? 2 : 0) + (hasScarcity ? 2 : 0) + Math.min(ctaCount * 0.5, 2));

  // Limbic: emotions, faces, colors, storytelling
  const limbElements: NeuroElement[] = [
    {
      elemento: "Imagens e rostos humanos",
      status: hasFaces ? "Indicado" : "Não detectado",
      achado: hasFaces ? "Referências a equipe/pessoas encontradas" : "Sem evidências de imagens de pessoas",
      recomendacao: !hasFaces ? "Adicione fotos reais da equipe — rostos humanos geram confiança" : "Continue humanizando a marca",
    },
    {
      elemento: "Paleta de cores e psicologia das cores",
      status: "Análise heurística",
      achado: "Cores analisadas via conteúdo textual",
      recomendacao: "Verifique se as cores transmitem a emoção correta para o nicho",
    },
    {
      elemento: "Storytelling e narrativa",
      status: hasStory ? "Presente" : "Ausente",
      achado: hasStory ? "Elementos narrativos encontrados (história, missão, jornada)" : "Sem storytelling detectado",
      recomendacao: !hasStory ? "Adicione a história da empresa ou uma narrativa de transformação do cliente" : "Boa base narrativa",
    },
  ];
  const limbScore = Math.min(10, (hasFaces ? 3 : 0) + (hasStory ? 3 : 0) + (hasVideo ? 2 : 0) + 2);

  // Neocortex: hierarchy, cognitive load, social proof, FAQ
  const neoElements: NeuroElement[] = [
    {
      elemento: "Hierarquia visual e padrão F/Z de leitura",
      status: hasGoodHierarchy ? "Adequada" : "Deficiente",
      achado: `${h1Count} H1, ${h2Count} H2, ${h3Count} H3 detectados`,
      recomendacao: !hasGoodHierarchy ? "Organize o conteúdo com H1 > H2 > H3 claros — guie o olhar do visitante" : "Hierarquia bem estruturada",
    },
    {
      elemento: "Carga cognitiva — simplicidade do layout",
      status: tooManyMenuItems ? "Alta" : "Adequada",
      achado: `~${menuLinks} links de navegação detectados`,
      recomendacao: tooManyMenuItems ? "Reduza itens do menu para 5-7. Excesso de opções causa paralisia de decisão (Lei de Hick)" : "Quantidade adequada de opções",
    },
    {
      elemento: "Prova social e autoridade",
      status: hasTestimonials || hasLogos ? "Presente" : "Ausente",
      achado: hasTestimonials ? "Depoimentos/avaliações detectados" : "Sem prova social visível",
      recomendacao: !hasTestimonials ? "Adicione depoimentos reais com foto + nome + resultado obtido" : "Continue reforçando a prova social",
    },
    {
      elemento: "FAQ e objeções respondidas",
      status: hasFAQ ? "Presente" : "Ausente",
      achado: hasFAQ ? "Seção de FAQ encontrada" : "Nenhuma FAQ detectada",
      recomendacao: !hasFAQ ? "Adicione FAQ respondendo as 5-7 principais objeções dos seus clientes" : "Boa prática — ajuda na decisão",
    },
  ];
  const neoScore = Math.min(10, (hasGoodHierarchy ? 3 : 1) + (hasTestimonials ? 2 : 0) + (hasLogos ? 1.5 : 0) + (hasFAQ ? 2 : 0) + (!tooManyMenuItems ? 1.5 : 0));

  // ─── Cialdini ───
  const gatilhos = {
    reciprocidade: makeTrigger(
      lower.includes("grátis") || lower.includes("gratuito") || lower.includes("e-book") || lower.includes("download"),
      "Conteúdo gratuito ou isca digital detectado",
      "Ofereça algo de valor gratuitamente: e-book, checklist, consultoria inicial"
    ),
    prova_social: makeTrigger(hasTestimonials || hasLogos, "Depoimentos ou logos de clientes", "Adicione depoimentos com foto, nome e resultado específico"),
    autoridade: makeTrigger(
      lower.includes("certificad") || lower.includes("prêmio") || lower.includes("especialista") || lower.includes("anos de experiência"),
      "Indicadores de autoridade encontrados",
      "Destaque certificações, prêmios, tempo de mercado e números"
    ),
    escassez: makeTrigger(hasScarcity, "Elementos de escassez", "Use contadores ou indicadores de estoque/vagas limitadas"),
    urgencia: makeTrigger(hasUrgency, "Gatilhos de urgência", "Adicione prazos reais para ofertas — ex: 'válido até sexta-feira'"),
    compromisso: makeTrigger(
      lower.includes("quiz") || lower.includes("teste") || lower.includes("avaliação gratuita") || lower.includes("primeira etapa"),
      "Micro-compromissos detectados",
      "Crie um quiz ou avaliação gratuita como primeiro passo"
    ),
  };

  // ─── Eye tracking simulado ───
  const eyePattern = hasGoodHierarchy ? "F-pattern" as const : h1Count > 0 ? "Z-pattern" as const : "Indefinido" as const;
  const distracoes: string[] = [];
  if (tooManyMenuItems) distracoes.push("Menu com muitas opções dispersa a atenção");
  if (ctaCount > 8) distracoes.push("Excesso de CTAs pode confundir o visitante");

  // ─── Above the fold ───
  const firstSection = md.substring(0, Math.min(md.length, 500));
  const hasATFCTA = /(?:comprar|agendar|contato|saiba mais|começar|cadastr|inscreva)/i.test(firstSection.toLowerCase());
  const hasATFProposal = firstSection.length > 50;
  const atfScore = Math.min(10, (hasATFProposal ? 3 : 0) + (hasATFCTA ? 3 : 0) + (hasFaces ? 2 : 0) + (hasGuarantee ? 2 : 0));

  // ─── Psicologia das cores ───
  const detectedColor = detectPredominantColor(lower);
  const nicheKey = niche?.toLowerCase() || "default";
  const idealColors = NICHE_COLORS[nicheKey] || NICHE_COLORS.default;
  const colorAdequacy = idealColors.includes(detectedColor) ? "Adequada" as const : "Neutra" as const;

  // ─── Overall score ───
  const scoreGeral = Math.round(((reptScore * 0.3 + limbScore * 0.3 + neoScore * 0.4)) * 10) / 10;
  const nivel = scoreGeral >= 7.5 ? "Otimizado para Conversão" as const
    : scoreGeral >= 5 ? "Em Desenvolvimento" as const
    : scoreGeral >= 3 ? "Neutro" as const : "Contra-produtivo" as const;

  // ─── Top 5 improvements ───
  const improvements: NeuroImprovement[] = [];
  let pos = 1;
  if (!hasCTA) improvements.push({ posicao: pos++, melhoria: "Adicionar CTAs claros e contrastantes", principio: "Cérebro Reptiliano", impacto_conversao_estimado: "+25-40% de conversão", como_implementar: "Adicione botões com cores contrastantes e textos imperativos (Agendar, Comprar, Fale conosco)", dificuldade: "Fácil", custo: "Gratuito" });
  if (!hasTestimonials) improvements.push({ posicao: pos++, melhoria: "Adicionar depoimentos com foto e resultado", principio: "Prova Social", impacto_conversao_estimado: "+15-25% de confiança", como_implementar: "Adicione 3-5 depoimentos reais com foto, nome e resultado obtido", dificuldade: "Fácil", custo: "Gratuito" });
  if (!hasFAQ) improvements.push({ posicao: pos++, melhoria: "Criar seção de FAQ", principio: "Carga Cognitiva", impacto_conversao_estimado: "+10-20% de permanência", como_implementar: "Liste 5-7 dúvidas mais comuns e responda de forma direta", dificuldade: "Fácil", custo: "Gratuito" });
  if (!hasUrgency) improvements.push({ posicao: pos++, melhoria: "Adicionar elementos de urgência autênticos", principio: "Urgência", impacto_conversao_estimado: "+15-30% de conversão imediata", como_implementar: "Adicione prazos reais para ofertas ou destaque a escassez genuína", dificuldade: "Fácil", custo: "Gratuito" });
  if (!hasStory) improvements.push({ posicao: pos++, melhoria: "Implementar storytelling da marca", principio: "Cérebro Límbico", impacto_conversao_estimado: "+10-20% de conexão emocional", como_implementar: "Conte a história da empresa focando na transformação que proporciona ao cliente", dificuldade: "Médio", custo: "Gratuito" });
  if (!hasGoodHierarchy && pos <= 5) improvements.push({ posicao: pos++, melhoria: "Reestruturar hierarquia visual H1>H2>H3", principio: "Neocórtex", impacto_conversao_estimado: "+10-15% de escaneabilidade", como_implementar: "Organize com H1 principal, H2 para seções e H3 para subseções", dificuldade: "Fácil", custo: "Gratuito" });

  return {
    score_geral: scoreGeral,
    nivel,
    cerebro_reptiliano: { score: Math.round(reptScore * 10) / 10, descricao: "Instinto, sobrevivência, ação imediata", elementos_analisados: reptElements, principios_aplicados: hasCTA || hasUrgency || hasScarcity ? ["urgência", "escassez", "dor vs prazer"].filter((_, i) => i === 0 ? hasUrgency : i === 1 ? hasScarcity : hasCTA) : [], gaps: reptElements.filter((e) => e.status === "Ausente").map((e) => e.elemento) },
    cerebro_limbico: { score: Math.round(limbScore * 10) / 10, descricao: "Emoções, memória, conexão", elementos_analisados: limbElements, gaps: limbElements.filter((e) => e.status === "Ausente" || e.status === "Não detectado").map((e) => e.elemento) },
    neocortex: { score: Math.round(neoScore * 10) / 10, descricao: "Lógica, racionalização, justificativa da decisão", elementos_analisados: neoElements, gaps: neoElements.filter((e) => e.status === "Ausente" || e.status === "Deficiente").map((e) => e.elemento) },
    gatilhos_cialdini: gatilhos,
    eye_tracking_simulado: {
      padrao_detectado: eyePattern,
      cta_na_zona_quente: hasATFCTA,
      whatsapp_na_zona_quente: false,
      distracoes_detectadas: distracoes,
      recomendacoes_layout: distracoes.length > 0
        ? ["Simplifique o layout para guiar o olhar até o CTA principal", "Mantenha o CTA acima da dobra"]
        : ["Layout adequado — mantenha o foco visual no CTA"],
    },
    psicologia_das_cores: {
      cor_predominante: detectedColor || "Não detectada",
      emocao_evocada: COLOR_EMOTIONS[detectedColor] || "Não determinada",
      adequacao_para_nicho: colorAdequacy,
      cor_cta_principal: "Não detectada via markdown",
      contraste_cta_adequado: hasCTA,
      sugestao_cores: `Para o nicho ${niche || "geral"}, considere: ${idealColors.join(", ")}`,
    },
    above_the_fold: {
      score: atfScore,
      tem_proposta_valor_clara: hasATFProposal,
      tem_cta_visivel: hasATFCTA,
      tem_imagem_de_pessoa: hasFaces,
      tem_elemento_confianca: hasGuarantee || hasLogos,
      tempo_compreensao_estimado: contentLength < 500 ? "3-5 segundos" : contentLength < 2000 ? "5-8 segundos" : "8+ segundos — acima da média",
      recomendacoes: [
        ...(!hasATFCTA ? ["Adicione um CTA visível acima da dobra"] : []),
        ...(!hasATFProposal ? ["Inclua proposta de valor clara no primeiro bloco"] : []),
        ...(!hasFaces ? ["Adicione foto de pessoa real para gerar conexão"] : []),
      ],
    },
    mobile_neuro: {
      score: Math.min(10, atfScore + (hasCTA ? 1 : 0)),
      thumb_zone_cta: hasCTA,
      velocidade_percepcao: contentLength < 1000 ? "Rápida" : "Moderada",
      gaps_mobile: [
        ...(!hasCTA ? ["CTA não detectado — dificulta conversão mobile"] : []),
        ...(tooManyMenuItems ? ["Menu extenso prejudica navegação mobile"] : []),
      ],
    },
    top5_melhorias_neuromarketing: improvements.slice(0, 5),
  };
}

function makeTrigger(present: boolean, exemplo: string, sugestao: string): CialdiniTrigger {
  return { presente: present, exemplo: present ? exemplo : "Não detectado", sugestao: present ? "Já implementado — continue reforçando" : sugestao };
}

function detectPredominantColor(text: string): string {
  const colors = ["azul", "verde", "vermelho", "laranja", "amarelo", "roxo", "preto", "branco", "rosa"];
  const counts = colors.map((c) => ({ color: c, count: (text.match(new RegExp(c, "g")) || []).length }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0]?.count > 0 ? counts[0].color : "azul";
}
