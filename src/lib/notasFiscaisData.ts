import { NotaFiscal } from "@/types/notasFiscais";

const STORAGE_KEY = "fiscal_notas_fiscais";

export function loadNotas(): NotaFiscal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getSampleNotas();
}

export function saveNotas(notas: NotaFiscal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
}

export function getNextNFNumber(notas: NotaFiscal[]): string {
  const nums = notas.map((n) => parseInt(n.numero)).filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return String(next).padStart(6, "0");
}

function getSampleNotas(): NotaFiscal[] {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();

  return [
    {
      id: "nf-1",
      numero: "000001",
      tipo: "NFS-e",
      clienteNome: "Tech Solutions Ltda",
      clienteCpfCnpj: "12.345.678/0001-90",
      clienteEmail: "contato@techsolutions.com",
      clienteEndereco: "Rua das Flores, 123 - São Paulo/SP",
      valor: 5500,
      impostos: 412.5,
      dataEmissao: new Date(y, m, 5).toISOString(),
      status: "emitida",
      itens: [{ id: "i1", descricao: "Consultoria em TI", quantidade: 1, valorUnitario: 5500, codigoServico: "1.01", aliquotaISS: 5 }],
      tributos: { issPercent: 5, issValor: 275, pisPercent: 0.65, pisValor: 35.75, cofinsPercent: 3, cofinsValor: 165, irpjPercent: 0, irpjValor: 0, csllPercent: 0, csllValor: 0, totalBruto: 5500, totalImpostos: 475.75, totalLiquido: 5024.25 },
      observacoes: "",
    },
    {
      id: "nf-2",
      numero: "000002",
      tipo: "NFS-e",
      clienteNome: "Marketing Digital Pro",
      clienteCpfCnpj: "98.765.432/0001-10",
      clienteEmail: "nf@marketingpro.com.br",
      clienteEndereco: "Av. Paulista, 1000 - São Paulo/SP",
      valor: 3200,
      impostos: 240,
      dataEmissao: new Date(y, m, 10).toISOString(),
      status: "emitida",
      itens: [{ id: "i2", descricao: "Desenvolvimento de chatbot", quantidade: 1, valorUnitario: 3200, codigoServico: "1.04", aliquotaISS: 5 }],
      tributos: { issPercent: 5, issValor: 160, pisPercent: 0.65, pisValor: 20.8, cofinsPercent: 3, cofinsValor: 96, irpjPercent: 0, irpjValor: 0, csllPercent: 0, csllValor: 0, totalBruto: 3200, totalImpostos: 276.8, totalLiquido: 2923.2 },
      observacoes: "",
    },
    {
      id: "nf-3",
      numero: "000003",
      tipo: "NFS-e",
      clienteNome: "Loja Virtual Express",
      clienteCpfCnpj: "11.222.333/0001-44",
      clienteEmail: "fiscal@lojavirtual.com",
      clienteEndereco: "Rua do Comércio, 500 - Curitiba/PR",
      valor: 1800,
      impostos: 135,
      dataEmissao: new Date(y, m, 15).toISOString(),
      status: "pendente",
      itens: [{ id: "i3", descricao: "Suporte técnico mensal", quantidade: 1, valorUnitario: 1800, codigoServico: "1.07", aliquotaISS: 5 }],
      tributos: { issPercent: 5, issValor: 90, pisPercent: 0.65, pisValor: 11.7, cofinsPercent: 3, cofinsValor: 54, irpjPercent: 0, irpjValor: 0, csllPercent: 0, csllValor: 0, totalBruto: 1800, totalImpostos: 155.7, totalLiquido: 1644.3 },
      observacoes: "",
    },
    {
      id: "nf-4",
      numero: "000004",
      tipo: "NF-e",
      clienteNome: "Distribuidora ABC",
      clienteCpfCnpj: "55.666.777/0001-88",
      clienteEmail: "compras@abc.com.br",
      clienteEndereco: "Rua Industrial, 200 - Belo Horizonte/MG",
      valor: 8900,
      impostos: 667.5,
      dataEmissao: new Date(y, m, 3).toISOString(),
      status: "cancelada",
      itens: [{ id: "i4", descricao: "Licença de software anual", quantidade: 1, valorUnitario: 8900, codigoServico: "1.05", aliquotaISS: 5 }],
      tributos: { issPercent: 5, issValor: 445, pisPercent: 0.65, pisValor: 57.85, cofinsPercent: 3, cofinsValor: 267, irpjPercent: 0, irpjValor: 0, csllPercent: 0, csllValor: 0, totalBruto: 8900, totalImpostos: 769.85, totalLiquido: 8130.15 },
      observacoes: "",
      motivoCancelamento: "Erro nos dados do destinatário, NF reemitida com número 000005",
    },
  ];
}
