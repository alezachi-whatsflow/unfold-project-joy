import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, XCircle, DollarSign } from "lucide-react";
import { NotaFiscal } from "@/types/notasFiscais";

interface Props {
  notas: NotaFiscal[];
}

export default function NFDashboardCards({ notas }: Props) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = notas.filter((n) => {
    const d = new Date(n.dataEmissao);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const emitidas = thisMonth.filter((n) => n.status === "emitida");
  const pendentes = notas.filter((n) => n.status === "pendente");
  const canceladas = thisMonth.filter((n) => n.status === "cancelada");
  const valorTotal = emitidas.reduce((s, n) => s + n.valor, 0);

  const cards = [
    { label: "Emitidas (mês)", value: `${emitidas.length}`, sub: `R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Pendentes", value: `${pendentes.length}`, sub: "Aguardando processamento", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Canceladas", value: `${canceladas.length}`, sub: "No mês atual", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
    { label: "Valor Total Mês", value: `R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, sub: `${emitidas.length} nota(s) emitida(s)`, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/40" style={{ borderRadius: 12 }}>
          <CardContent className="p-4 flex items-start gap-3">
            <div className={`p-2.5 ${c.bg}`}>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-bold text-foreground">{c.value}</p>
              <p className="text-[11px] text-muted-foreground/70 truncate">{c.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
