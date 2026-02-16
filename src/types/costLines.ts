export type CostBlock = "CSP" | "MKT" | "SAL" | "G&A" | "FIN" | "TAX" | "REV-";

export type CostType = "fixed" | "variable" | "mixed";

export interface CostLineTemplate {
  id: string;
  category: string;
  subcategory: string;
  block: CostBlock;
  costType: CostType;
  supplier: string;
  description: string;
  isDefault: boolean; // pré-definido vs customizado
}

export interface CostLineEntry {
  templateId: string;
  month: string; // YYYY-MM
  amount: number;
}

export interface CostLineWithValues extends CostLineTemplate {
  values: Record<string, number>; // month → amount
}

/** Maps cost blocks to existing financial_entries fields */
export const BLOCK_FIELD_MAP: Record<CostBlock, { target: string; field: string }> = {
  CSP: { target: "costs", field: "variableCosts" },
  MKT: { target: "costs", field: "marketing" },
  SAL: { target: "personnel", field: "payroll" },
  "G&A": { target: "costs", field: "fixedCosts" },
  FIN: { target: "costs", field: "infrastructure" },
  TAX: { target: "costs", field: "taxes" },
  "REV-": { target: "revenue", field: "otherRevenue" }, // negativo
};

export const BLOCK_LABELS: Record<CostBlock, string> = {
  CSP: "Custo de Prestação do Serviço",
  MKT: "Marketing / Aquisição",
  SAL: "Salários / Pessoal",
  "G&A": "General & Administrative",
  FIN: "Financeiro",
  TAX: "Impostos",
  "REV-": "Deduções de Receita",
};

export const BLOCK_COLORS: Record<CostBlock, string> = {
  CSP: "text-orange-400",
  MKT: "text-blue-400",
  SAL: "text-emerald-400",
  "G&A": "text-purple-400",
  FIN: "text-yellow-400",
  TAX: "text-red-400",
  "REV-": "text-pink-400",
};

export const COST_TYPE_LABELS: Record<CostType, string> = {
  fixed: "Fixo",
  variable: "Variável",
  mixed: "Misto",
};
