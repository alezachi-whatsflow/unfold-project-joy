import { useState, useMemo } from "react";
import { toast } from "sonner";
import { loadNotas, saveNotas, getNextNFNumber } from "@/lib/notasFiscaisData";
import { NotaFiscal, NFStatus, NFTipo } from "@/types/notasFiscais";
import NFDashboardCards from "./notas/NFDashboardCards";
import NFFilters from "./notas/NFFilters";
import NFTable from "./notas/NFTable";
import NFViewDialog from "./notas/NFViewDialog";
import NFCancelDialog from "./notas/NFCancelDialog";
import NFEmitirDialog from "./notas/NFEmitirDialog";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { DateRange } from "react-day-picker";

export default function NotasFiscaisTab() {
  const [notas, setNotas] = useState<NotaFiscal[]>(loadNotas);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<NFStatus | "todas">("todas");
  const [tipoFilter, setTipoFilter] = useState<NFTipo | "todos">("todos");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [viewNF, setViewNF] = useState<NotaFiscal | null>(null);
  const [cancelNF, setCancelNF] = useState<NotaFiscal | null>(null);
  const [emitirOpen, setEmitirOpen] = useState(false);

  const persist = (updated: NotaFiscal[]) => { setNotas(updated); saveNotas(updated); };

  const filtered = useMemo(() => {
    let result = notas;
    if (statusFilter !== "todas") result = result.filter((n) => n.status === statusFilter);
    if (tipoFilter !== "todos") result = result.filter((n) => n.tipo === tipoFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((n) => n.numero.includes(q) || n.clienteNome.toLowerCase().includes(q) || n.clienteCpfCnpj.includes(q));
    }
    if (dateRange?.from) {
      const start = dateRange.from;
      const end = dateRange.to || dateRange.from;
      result = result.filter((n) => {
        const d = new Date(n.dataEmissao);
        return isWithinInterval(d, { start, end: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59) });
      });
    }
    return result;
  }, [notas, statusFilter, tipoFilter, search, dateRange]);

  const handleCancel = (nfId: string, motivo: string) => {
    persist(notas.map((n) => (n.id === nfId ? { ...n, status: "cancelada" as const, motivoCancelamento: motivo } : n)));
    toast.success("Nota fiscal cancelada");
  };

  const handleEmit = (data: Omit<NotaFiscal, "id" | "numero" | "dataEmissao">) => {
    const newNF: NotaFiscal = {
      ...data,
      id: crypto.randomUUID(),
      numero: getNextNFNumber(notas),
      dataEmissao: new Date().toISOString(),
    };
    persist([newNF, ...notas]);
  };

  const handleExportCSV = () => {
    const header = "Numero,Tipo,Cliente,CNPJ,Valor,Impostos,Emissao,Status\n";
    const rows = filtered.map((n) => `${n.numero},${n.tipo},"${n.clienteNome}",${n.clienteCpfCnpj},${n.valor},${n.impostos},${n.dataEmissao},${n.status}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notas_fiscais.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const handleDownloadPDF = (nf: NotaFiscal) => {
    toast.info(`Download PDF da NF ${nf.numero} (simulado)`);
  };

  const handleResend = (nf: NotaFiscal) => {
    toast.success(`E-mail reenviado para ${nf.clienteEmail || "cliente"}`);
  };

  return (
    <div className="space-y-5">
      <NFDashboardCards notas={notas} />
      <NFFilters
        search={search} onSearchChange={setSearch}
        statusFilter={statusFilter} onStatusChange={setStatusFilter}
        tipoFilter={tipoFilter} onTipoChange={setTipoFilter}
        dateRange={dateRange} onDateRangeChange={setDateRange}
        onExportCSV={handleExportCSV}
        onEmitir={() => setEmitirOpen(true)}
      />
      <NFTable
        notas={filtered}
        onView={setViewNF}
        onDownloadPDF={handleDownloadPDF}
        onResend={handleResend}
        onCancel={setCancelNF}
      />

      <NFViewDialog nf={viewNF} open={!!viewNF} onOpenChange={(v) => { if (!v) setViewNF(null); }} />
      <NFCancelDialog nf={cancelNF} open={!!cancelNF} onOpenChange={(v) => { if (!v) setCancelNF(null); }} onConfirm={handleCancel} />
      <NFEmitirDialog open={emitirOpen} onOpenChange={setEmitirOpen} onEmit={handleEmit} nextNumero={getNextNFNumber(notas)} />
    </div>
  );
}
