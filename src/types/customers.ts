export interface Customer {
  id: string;
  whitelabel: string;
  nome: string;
  email: string;
  status: string;
  dataAtivacao: string;
  dataCancelado: string | null;
  dataBloqueio: string | null;
  dataDesbloqueio: string | null;
  dataVencimento: string | null;
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
  data_cancelado: string | null;
  data_bloqueio: string | null;
  data_desbloqueio: string | null;
  data_vencimento: string | null;
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

export interface ExpenseEntry {
  id: string;
  month: string;
  [key: string]: string | number;
}
