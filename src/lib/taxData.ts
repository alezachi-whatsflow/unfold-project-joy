// ── Brazilian UFs with default ICMS rates ──
export interface UFData {
  uf: string;
  nome: string;
  icmsInterno: number;
  icmsInterestadual: number;
  difal: boolean;
  substituicaoTributaria: boolean;
  regimeTributario: "simples" | "presumido" | "real";
}

export const UF_LIST: UFData[] = [
  { uf: "AC", nome: "Acre", icmsInterno: 19, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "AL", nome: "Alagoas", icmsInterno: 19, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "AP", nome: "Amapá", icmsInterno: 18, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "AM", nome: "Amazonas", icmsInterno: 20, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "BA", nome: "Bahia", icmsInterno: 20.5, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "CE", nome: "Ceará", icmsInterno: 20, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "DF", nome: "Distrito Federal", icmsInterno: 20, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "ES", nome: "Espírito Santo", icmsInterno: 17, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "GO", nome: "Goiás", icmsInterno: 19, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "MA", nome: "Maranhão", icmsInterno: 22, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "MT", nome: "Mato Grosso", icmsInterno: 17, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "MS", nome: "Mato Grosso do Sul", icmsInterno: 17, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "MG", nome: "Minas Gerais", icmsInterno: 18, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "PA", nome: "Pará", icmsInterno: 19, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "PB", nome: "Paraíba", icmsInterno: 20, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "PR", nome: "Paraná", icmsInterno: 19.5, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "PE", nome: "Pernambuco", icmsInterno: 20.5, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "PI", nome: "Piauí", icmsInterno: 21, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "RJ", nome: "Rio de Janeiro", icmsInterno: 22, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "RN", nome: "Rio Grande do Norte", icmsInterno: 20, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "RS", nome: "Rio Grande do Sul", icmsInterno: 17, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "RO", nome: "Rondônia", icmsInterno: 19.5, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "RR", nome: "Roraima", icmsInterno: 20, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "SC", nome: "Santa Catarina", icmsInterno: 17, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "SP", nome: "São Paulo", icmsInterno: 18, icmsInterestadual: 7, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "SE", nome: "Sergipe", icmsInterno: 19, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
  { uf: "TO", nome: "Tocantins", icmsInterno: 20, icmsInterestadual: 12, difal: false, substituicaoTributaria: false, regimeTributario: "simples" },
];

// ── LC 116/2003 main service items ──
export const LC116_SERVICES = [
  "1.01 – Análise e desenvolvimento de sistemas",
  "1.02 – Programação",
  "1.03 – Processamento de dados e congêneres",
  "1.04 – Elaboração de programas de computadores",
  "1.05 – Licenciamento de software",
  "1.06 – Assessoria e consultoria em informática",
  "1.07 – Suporte técnico em informática",
  "1.08 – Planejamento, confecção, manutenção de páginas eletrônicas",
  "7.01 – Engenharia, agronomia, agrimensura",
  "7.02 – Execução de obras de construção civil",
  "10.01 – Agenciamento, corretagem de câmbio",
  "10.02 – Agenciamento, corretagem de seguros",
  "14.01 – Lubrificação, limpeza, lustração, revisão",
  "17.01 – Assessoria ou consultoria de qualquer natureza",
  "17.02 – Datilografia, digitação, estenografia",
  "17.06 – Propaganda e publicidade",
  "25.01 – Funerais",
  "Outro (especificar)",
];

// ── Municipal ISS entry ──
export interface MunicipalISS {
  id: string;
  municipio: string;
  codigoIBGE: string;
  aliquotaISS: number;
  servicoLC116: string;
  issRetido: boolean;
  observacoes: string;
}

// ── Simples Nacional table ──
export interface SimplesNacionalFaixa {
  anexo: string;
  faixaReceita: string;
  aliquota: number;
  irpj: number;
  csll: number;
  cofins: number;
  pis: number;
  iss: number;
}

export const SIMPLES_NACIONAL_DEFAULT: SimplesNacionalFaixa[] = [
  { anexo: "III", faixaReceita: "Até R$ 180.000,00", aliquota: 6.00, irpj: 4.00, csll: 3.50, cofins: 12.82, pis: 2.78, iss: 33.50 },
  { anexo: "III", faixaReceita: "De R$ 180.000,01 a R$ 360.000,00", aliquota: 11.20, irpj: 4.00, csll: 3.50, cofins: 14.05, pis: 3.05, iss: 32.00 },
  { anexo: "III", faixaReceita: "De R$ 360.000,01 a R$ 720.000,00", aliquota: 13.50, irpj: 4.00, csll: 3.50, cofins: 13.64, pis: 2.96, iss: 32.50 },
  { anexo: "III", faixaReceita: "De R$ 720.000,01 a R$ 1.800.000,00", aliquota: 16.00, irpj: 4.00, csll: 3.50, cofins: 13.64, pis: 2.96, iss: 32.50 },
  { anexo: "III", faixaReceita: "De R$ 1.800.000,01 a R$ 3.600.000,00", aliquota: 21.00, irpj: 4.00, csll: 3.50, cofins: 12.82, pis: 2.78, iss: 33.50 },
  { anexo: "III", faixaReceita: "De R$ 3.600.000,01 a R$ 4.800.000,00", aliquota: 33.00, irpj: 35.00, csll: 15.00, cofins: 16.03, pis: 3.47, iss: 0.00 },
];

// ── Lucro Presumido / Real defaults ──
export interface FederalConfig {
  regime: "presumido" | "real";
  irpj: number;
  csll: number;
  pis: number;
  cofins: number;
}

export const FEDERAL_DEFAULTS: Record<string, FederalConfig> = {
  presumido: { regime: "presumido", irpj: 15, csll: 9, pis: 0.65, cofins: 3 },
  real: { regime: "real", irpj: 15, csll: 9, pis: 1.65, cofins: 7.6 },
};
