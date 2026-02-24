import { WhatsAppButtonAnalysis, WhatsAppRecommendation } from "@/types/analysisModules";

const WA_PATTERNS = ["wa.me", "api.whatsapp.com", "whatsapp://", "whatsapp.com", "whatsa"];

export function analyzeWhatsAppButton(rawMarkdown: string | null, rawHtml?: string | null): WhatsAppButtonAnalysis {
  const md = (rawMarkdown || "").toLowerCase();
  const html = (rawHtml || rawMarkdown || "").toLowerCase();

  // Detect WhatsApp links
  const found = WA_PATTERNS.some((p) => md.includes(p) || html.includes(p));
  const waLinkCount = WA_PATTERNS.reduce((sum, p) => sum + (md.split(p).length - 1), 0);

  // Detect type
  const hasFixedPosition = html.includes("position:fixed") || html.includes("position: fixed");
  const tipo = !found ? "Ausente" as const : hasFixedPosition ? "Flutuante" as const : "Inline" as const;

  // Heuristic checks
  const hasLabel = found && (md.includes("fale conosco") || md.includes("whatsapp") || md.includes("entre em contato") || md.includes("chamar"));
  const hasNumber = /\+55\s?\d{2}\s?\d{4,5}[-\s]?\d{4}/.test(md);

  const problemas: string[] = [];
  const boasPraticas: string[] = [];
  const recomendacoes: WhatsAppRecommendation[] = [];

  if (!found) {
    problemas.push("Nenhum botão ou link de WhatsApp encontrado no site");
    recomendacoes.push({
      acao: "Adicionar botão WhatsApp flutuante",
      por_que: "WhatsApp é o principal canal de conversão no Brasil — 96% dos smartphones têm o app instalado",
      impacto_conversao: "Alto",
      como_implementar: "Adicione um botão fixo no canto inferior direito com link wa.me/55SEUNUMERO. Use z-index 9999.",
    });
  } else {
    if (tipo === "Inline") {
      problemas.push("Botão WhatsApp não é flutuante — pode não ser visto ao rolar a página");
      recomendacoes.push({
        acao: "Tornar o botão WhatsApp flutuante (position: fixed)",
        por_que: "Botões flutuantes têm 3-5x mais cliques que links inline",
        impacto_conversao: "Alto",
        como_implementar: "Aplique CSS: position:fixed; bottom:20px; right:20px; z-index:9999;",
      });
    }
    if (!hasLabel) {
      boasPraticas.push("Adicionar texto/label acompanhando o ícone do WhatsApp");
      recomendacoes.push({
        acao: "Adicionar label 'Fale conosco' ao botão",
        por_que: "Labels textuais aumentam a clareza e taxa de clique em 15-25%",
        impacto_conversao: "Médio",
        como_implementar: "Adicione um tooltip ou texto ao lado do ícone que apareça ao passar o mouse.",
      });
    }
    if (!hasNumber) {
      boasPraticas.push("Incluir número com DDD e código do país (+55) no link");
    }
    if (waLinkCount < 2) {
      boasPraticas.push("Adicionar WhatsApp em mais pontos estratégicos (header, após CTAs, rodapé)");
    }
  }

  // Score calculation
  let score = 0;
  if (found) score += 4;
  if (tipo === "Flutuante") score += 2;
  if (hasLabel) score += 1.5;
  if (hasNumber) score += 1;
  if (waLinkCount >= 2) score += 0.5;
  if (tipo === "Inline") score += 1;
  score = Math.min(10, Math.round(score * 10) / 10);

  return {
    encontrado: found,
    score_acessibilidade: score,
    configuracao_atual: {
      tipo,
      posicao: tipo === "Flutuante" ? "Canto inferior (detectado via CSS)" : tipo === "Inline" ? "Dentro do conteúdo" : "N/A",
      visivel_mobile: found,
      visivel_desktop: found,
      tamanho_adequado: found,
      contraste_adequado: found,
      tem_label_texto: hasLabel,
      tempo_para_aparecer: found ? "Imediato" : "N/A",
    },
    problemas_detectados: problemas,
    boas_praticas_faltando: boasPraticas,
    recomendacoes,
    configuracao_ideal: {
      posicao: "Canto inferior direito, fixo na tela",
      tamanho: "Mínimo 56x56px desktop, 64x64px mobile",
      z_index: "Z-index alto (9999) para nunca ficar coberto",
      delay: "Aparecer após 3-5s ou após rolagem de 30%",
      label: "Exibir texto 'Fale conosco' ao passar o mouse",
      animacao: "Pulso suave a cada 8s para chamar atenção",
      mobile: "Sempre visível em mobile sem sobreposição ao conteúdo",
      numero: "Incluir DDD e código do país (+55)",
    },
  };
}
