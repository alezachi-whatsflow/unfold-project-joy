export type NFStatus = "emitida" | "pendente" | "cancelada" | "rejeitada";
export type NFTipo = "NFS-e" | "NF-e" | "NFC-e";

export interface NFItem {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  codigoServico: string;
  aliquotaISS: number;
}

export interface NFTributos {
  issPercent: number;
  issValor: number;
  pisPercent: number;
  pisValor: number;
  cofinsPercent: number;
  cofinsValor: number;
  irpjPercent: number;
  irpjValor: number;
  csllPercent: number;
  csllValor: number;
  totalBruto: number;
  totalImpostos: number;
  totalLiquido: number;
}

export interface NotaFiscal {
  id: string;
  numero: string;
  tipo: NFTipo;
  clienteNome: string;
  clienteCpfCnpj: string;
  clienteEmail: string;
  clienteEndereco: string;
  valor: number;
  impostos: number;
  dataEmissao: string;
  status: NFStatus;
  itens: NFItem[];
  tributos: NFTributos;
  observacoes: string;
  motivoCancelamento?: string;
  xmlContent?: string;
}

export interface NFFormDestinatario {
  nome: string;
  cpfCnpj: string;
  email: string;
  endereco: string;
}

export const statusColors: Record<NFStatus, string> = {
  emitida: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pendente: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cancelada: "bg-red-500/15 text-red-400 border-red-500/30",
  rejeitada: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const statusLabels: Record<NFStatus, string> = {
  emitida: "Emitida",
  pendente: "Pendente",
  cancelada: "Cancelada",
  rejeitada: "Rejeitada",
};
