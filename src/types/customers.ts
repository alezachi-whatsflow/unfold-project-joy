export interface Customer {
  id: string;
  whitelabel: string;
  nome: string;
  email: string;
  status: string;
  dataAtivacao: string;
  dataDesativacao: string | null;
  dataCobranca: string | null;
  dispositivosOficial: number;
  dispositivosNaoOficial: number;
  atendentes: number;
  adicional: number;
  checkout: string;
  receita: string;
  tipoPagamento: string;
  condicao: string;
  valorUltimaCobranca: number;
}

export interface CustomerRow {
  id: string;
  whitelabel: string;
  nome: string;
  email: string;
  status: string;
  data_ativacao: string;
  data_desativacao: string | null;
  data_cobranca: string | null;
  dispositivos_oficial: number;
  dispositivos_nao_oficial: number;
  atendentes: number;
  adicional: number;
  checkout: string;
  receita: string;
  tipo_pagamento: string;
  condicao: string;
  valor_ultima_cobranca: number;
  created_at: string;
  updated_at: string;
}

// Placeholder type for future expenses CSV import
export interface ExpenseEntry {
  id: string;
  month: string;
  // Fields will be defined when the expenses CSV structure is provided
  [key: string]: string | number;
}
