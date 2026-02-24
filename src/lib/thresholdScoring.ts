import { ChannelThreshold, ThresholdStatus } from "@/types/rescuePlan";

// ─── Website Thresholds ───
export function getWebsiteThreshold(score: number): ChannelThreshold {
  if (score >= 7.5) return { score, status: "green", label: "Autoridade Estabelecida" };
  if (score >= 5.5) return { score, status: "yellow", label: "Em Desenvolvimento" };
  return { score, status: "red", label: "Abaixo da Média" };
}

// ─── Instagram Thresholds ───
export function getInstagramThreshold(score: number): ChannelThreshold {
  if (score >= 7.0) return { score, status: "green", label: "Perfil Forte" };
  if (score >= 5.0) return { score, status: "yellow", label: "Perfil Médio" };
  return { score, status: "red", label: "Perfil Fraco" };
}

// ─── Google Meu Negócio Thresholds ───
export function getGMNThreshold(score: number): ChannelThreshold {
  if (score >= 7.5) return { score, status: "green", label: "Bem Posicionado Localmente" };
  if (score >= 5.0) return { score, status: "yellow", label: "Visibilidade Parcial" };
  return { score, status: "red", label: "Invisível no Local" };
}

// ─── New Module Thresholds ───
export function getMetaVerificationThreshold(score: number): ChannelThreshold {
  if (score >= 7.0) return { score, status: "green", label: "Pronto para Verificação" };
  if (score >= 4.0) return { score, status: "yellow", label: "Parcialmente Pronto" };
  return { score, status: "red", label: "Não Pronto" };
}

export function getWhatsAppThreshold(score: number): ChannelThreshold {
  if (score >= 7.0) return { score, status: "green", label: "Botão Otimizado" };
  if (score >= 5.0) return { score, status: "yellow", label: "Botão Parcial" };
  return { score, status: "red", label: "WhatsApp Ausente/Fraco" };
}

export function getNeuromarketingThreshold(score: number): ChannelThreshold {
  if (score >= 7.0) return { score, status: "green", label: "Design Otimizado" };
  if (score >= 5.5) return { score, status: "yellow", label: "Design Médio" };
  return { score, status: "red", label: "Design Contra-produtivo" };
}

// ─── Overall Score (Weighted Average) ───
export function calculateOverallScore(
  websiteScore: number | null,
  instagramScore: number | null,
  gmnScore: number | null,
  metaScore: number | null = null,
  whatsappScore: number | null = null,
  neuroScore: number | null = null
): ChannelThreshold {
  // Redistributed weights: Website 25%, Instagram 20%, GMN 20%, Meta 15%, WhatsApp 10%, Neuro 10%
  const weights: Record<string, number> = {
    website: 0.25,
    instagram: 0.20,
    gmn: 0.20,
    meta: 0.15,
    whatsapp: 0.10,
    neuro: 0.10,
  };
  const scores: Record<string, number | null> = {
    website: websiteScore,
    instagram: instagramScore,
    gmn: gmnScore,
    meta: metaScore,
    whatsapp: whatsappScore,
    neuro: neuroScore,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, score] of Object.entries(scores)) {
    if (score !== null) {
      weightedSum += score * weights[key];
      totalWeight += weights[key];
    }
  }

  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

  if (score >= 6.5) {
    return { score, status: "green", label: "Presença Digital Qualificada" };
  }
  return { score, status: "red", label: "Presença Digital Abaixo da Média" };
}

// ─── Check if rescue plan should be activated ───
export function shouldActivateRescue(
  websiteThreshold: ChannelThreshold | null,
  instagramThreshold: ChannelThreshold | null,
  gmnThreshold: ChannelThreshold | null,
  overallThreshold: ChannelThreshold
): boolean {
  const hasRed = [websiteThreshold, instagramThreshold, gmnThreshold].some(
    (t) => t && (t.status === "red" || t.status === "yellow")
  );
  return hasRed || overallThreshold.status === "red";
}

// ─── Status color mapping ───
export function getStatusColor(status: ThresholdStatus): string {
  switch (status) {
    case "green": return "text-primary";
    case "yellow": return "text-warning";
    case "red": return "text-destructive";
  }
}

export function getStatusBgColor(status: ThresholdStatus): string {
  switch (status) {
    case "green": return "bg-primary/10 border-primary/20";
    case "yellow": return "bg-warning/10 border-warning/20";
    case "red": return "bg-destructive/10 border-destructive/20";
  }
}

// ─── Niche Benchmarks ───
export const NICHE_BENCHMARKS: Record<string, { website: number; instagram: number; gmn: number }> = {
  "educação": { website: 6.8, instagram: 6.2, gmn: 7.0 },
  "saúde": { website: 6.5, instagram: 6.5, gmn: 7.5 },
  "varejo": { website: 5.8, instagram: 6.8, gmn: 7.8 },
  "b2b": { website: 7.2, instagram: 5.5, gmn: 5.0 },
  "saas": { website: 7.2, instagram: 5.5, gmn: 5.0 },
  "restaurante": { website: 5.5, instagram: 7.2, gmn: 8.5 },
  "alimentação": { website: 5.5, instagram: 7.2, gmn: 8.5 },
  "serviços": { website: 5.5, instagram: 6.0, gmn: 7.0 },
  "default": { website: 6.0, instagram: 6.0, gmn: 7.0 },
};

export function detectNicheBenchmark(niche: string | null): { key: string; benchmark: { website: number; instagram: number; gmn: number } } {
  if (!niche) return { key: "default", benchmark: NICHE_BENCHMARKS["default"] };
  const lower = niche.toLowerCase();
  for (const [key, val] of Object.entries(NICHE_BENCHMARKS)) {
    if (key !== "default" && lower.includes(key)) return { key, benchmark: val };
  }
  return { key: "default", benchmark: NICHE_BENCHMARKS["default"] };
}
