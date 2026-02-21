// ─── Enums ───
export type AnalysisStatus = "pending" | "scraping" | "analyzing" | "completed" | "error";
export type SourceType = "website" | "instagram" | "linkedin" | "google_maps";

// ─── Web Scraping ───
export interface WebScrap {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  keywords: string[] | null;
  technologies: string[] | null;
  value_proposition: string | null;
  niche: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  raw_markdown: string | null;
  scraped_at: string;
  status: AnalysisStatus;
}

// ─── Social Profile Analysis ───
export interface ProfileAnalysis {
  id: string;
  source: SourceType;
  username: string;
  display_name: string | null;
  bio: string | null;
  followers: number | null;
  following: number | null;
  posts_count: number | null;
  avg_engagement_rate: number | null;
  profile_url: string;
  profile_image_url: string | null;
  content_strategy_notes: string | null;
  authority_score: number | null;
  analyzed_at: string;
  status: AnalysisStatus;
}

// ─── Google Maps / Business Lead ───
export interface BusinessLead {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews_count: number | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  scraped_at: string;
  status: AnalysisStatus;
}

// ─── 7 Pillars Diagnostic ───
export interface PillarScore {
  pillar: string;
  score: number; // 0-10
  notes: string;
}

export interface AuthorityDiagnostic {
  overallScore: number;
  pillars: PillarScore[];
  summary: string;
}

export const AUTHORITY_PILLARS = [
  "Clareza de Nicho e Proposta de Valor",
  "Autoridade e Prova Social",
  "Copy e Escrita Persuasiva",
  "Estética Estratégica",
  "Estrutura de Conversão",
  "Consistência e Estratégia de Conteúdo",
  "Presença Omnichannel",
] as const;

// ─── Search Form ───
export interface IntelligenceSearchInput {
  query: string;
  sourceType: SourceType;
}
