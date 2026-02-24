// ─── Threshold Scoring Types ───

export type ThresholdStatus = "green" | "yellow" | "red";
export type UrgencyLevel = "Crítica" | "Alta" | "Moderada";

export interface ChannelThreshold {
  score: number;
  status: ThresholdStatus;
  label: string;
}

export interface RescueAction {
  ordem: number;
  acao: string;
  onde_fazer: string;
  como_fazer: string;
  impacto_esperado: string;
  tempo_estimado: string;
  custo: string;
}

export interface GMNChecklistItem {
  item: string;
  status_atual: "ausente" | "incompleto" | "ok";
  instrucao_exata: string;
  impacto_no_ranking_local: "Alto" | "Médio" | "Baixo";
}

export interface ChannelRescuePlan {
  ativado: boolean;
  status: string;
  score: number;
  abaixo_em: string[];
  plano_imediato: RescueAction[];
  quick_wins: string[];
  checklist_resgate_gmn?: GMNChecklistItem[];
}

export interface RescuePlan {
  ativado: boolean;
  motivo: string;
  urgencia: UrgencyLevel;
  website?: ChannelRescuePlan;
  instagram?: ChannelRescuePlan;
  google_meu_negocio?: ChannelRescuePlan;
  nicho_detectado?: string;
  benchmark_mercado?: {
    website: number;
    instagram: number;
    gmn: number;
  };
}

export interface ThresholdResult {
  website: ChannelThreshold | null;
  instagram: ChannelThreshold | null;
  google_meu_negocio: ChannelThreshold | null;
  overall: ChannelThreshold;
  rescuePlan: RescuePlan | null;
}

// ─── Quick Win Progress ───
export interface QuickWinProgress {
  channel: "website" | "instagram" | "google_meu_negocio";
  index: number;
  completed: boolean;
}
