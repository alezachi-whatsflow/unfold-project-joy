export interface Certificate {
  id: string;
  cnpj: string;
  razaoSocial: string;
  tipo: "A1" | "A3";
  emissora: string;
  validoAte: string; // ISO date
  status: "ativo" | "vencido" | "revogado";
  fileName?: string;
}

export type CertificateEnvironment = "homologacao" | "producao";
