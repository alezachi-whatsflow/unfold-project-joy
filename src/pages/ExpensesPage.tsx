import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Plus, Bot } from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { DespesaSummaryCards } from "./Despesas/components/DespesaSummaryCards";
import { DespesaFilterBar, type Filters } from "./Despesas/components/DespesaFilterBar";
import { DespesaTable, type Despesa } from "./Despesas/components/DespesaTable";
import { ModalNovaDespesa } from "./Despesas/components/ModalNovaDespesa";
import { ModalExtrator } from "./Despesas/components/ModalExtrator";

/* ─── Mock data (Phase 1) ─── */
const MOCK_DESPESAS: Despesa[] = [
  { id: "1", date: "2026-03-25", supplier: "Uber Corporativo", description: "Corrida escritório → cliente", category: "Transporte", value: 47.90, status: "pago", origin: "IA", attachment_url: "#" },
  { id: "2", date: "2026-03-24", supplier: "AWS", description: "Servidores EC2 - março/2026", category: "Tecnologia", value: 1280.00, status: "pago", origin: "Manual", attachment_url: null },
  { id: "3", date: "2026-03-23", supplier: "Kalunga", description: "Material de escritório", category: "Escritório", value: 189.50, status: "pendente", origin: "Manual", attachment_url: null },
  { id: "4", date: "2026-03-22", supplier: "Vivo Empresas", description: "Plano corporativo - 10 linhas", category: "Telecom", value: 599.90, status: "pago", origin: "IA", attachment_url: "#" },
  { id: "5", date: "2026-03-20", supplier: "iFood Corporativo", description: "Almoço reunião de equipe", category: "Alimentação", value: 312.00, status: "pendente", origin: "Manual", attachment_url: null },
  { id: "6", date: "2026-03-18", supplier: "Google Cloud", description: "Cloud Run + Storage - março", category: "Tecnologia", value: 890.00, status: "pago", origin: "IA", attachment_url: "#" },
  { id: "7", date: "2026-03-15", supplier: "99 Táxi", description: "Corrida aeroporto", category: "Transporte", value: 78.50, status: "rejeitado", origin: "Manual", attachment_url: null },
  { id: "8", date: "2026-03-12", supplier: "Vercel", description: "Pro plan - hosting frontend", category: "Tecnologia", value: 120.00, status: "pago", origin: "Manual", attachment_url: "#" },
  { id: "9", date: "2026-03-10", supplier: "Supabase", description: "Database Pro - março/2026", category: "Tecnologia", value: 250.00, status: "pendente", origin: "IA", attachment_url: "#" },
  { id: "10", date: "2026-03-05", supplier: "Papelaria Central", description: "Impressão de contratos", category: "Escritório", value: 45.00, status: "pago", origin: "Manual", attachment_url: null },
];

const DEFAULT_FILTERS: Filters = { search: "", periodo: "", categoria: "", status: "", origem: "" };

export default function ExpensesPage() {
  const [despesas, setDespesas] = useState<Despesa[]>(MOCK_DESPESAS);
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [extratorOpen, setExtratorOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Despesa | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters.search]);

  const handleFilterChange = useCallback((partial: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  // Filter logic
  const filtered = useMemo(() => {
    let result = despesas;

    // Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (d) => d.supplier.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
      );
    }

    // Periodo
    if (filters.periodo) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      let start: Date;
      if (filters.periodo === "mes_atual") {
        start = new Date(year, month, 1);
      } else if (filters.periodo === "mes_anterior") {
        start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        result = result.filter((d) => {
          const dt = new Date(d.date + "T00:00:00");
          return dt >= start && dt <= end;
        });
        // early return for mes_anterior since it has an end date
      } else {
        // 3_meses
        start = new Date(year, month - 2, 1);
      }
      if (filters.periodo !== "mes_anterior") {
        result = result.filter((d) => new Date(d.date + "T00:00:00") >= start);
      }
    }

    // Categoria
    if (filters.categoria) {
      result = result.filter((d) => d.category === filters.categoria);
    }

    // Status
    if (filters.status) {
      result = result.filter((d) => d.status === filters.status);
    }

    // Origem
    if (filters.origem) {
      result = result.filter((d) => d.origin === filters.origem);
    }

    return result;
  }, [despesas, debouncedSearch, filters.periodo, filters.categoria, filters.status, filters.origem]);

  // Summary
  const summary = useMemo(() => {
    const total = filtered.reduce((s, d) => s + d.value, 0);
    const pendentes = filtered.filter((d) => d.status === "pendente");
    const pagos = filtered.filter((d) => d.status === "pago");
    const iaCount = filtered.filter((d) => d.origin === "IA").length;
    return {
      total,
      totalCount: filtered.length,
      pendente: pendentes.reduce((s, d) => s + d.value, 0),
      pendenteCount: pendentes.length,
      pago: pagos.reduce((s, d) => s + d.value, 0),
      pagoCount: pagos.length,
      iaCount,
    };
  }, [filtered]);

  const totalValue = useMemo(() => filtered.reduce((s, d) => s + d.value, 0), [filtered]);

  // Actions
  const handleMarkAsPaid = useCallback((id: string) => {
    setDespesas((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "pago" } : d))
    );
    toast.success("Despesa marcada como paga");
  }, []);

  const handleEdit = useCallback((d: Despesa) => {
    setEditingExpense(d);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDespesas((prev) => prev.filter((d) => d.id !== id));
    toast.success("Despesa excluída");
  }, []);

  const handleSave = useCallback(
    (data: { supplier: string; value: number; category: string; date: string; description: string; status: string; file: File | null }) => {
      if (editingExpense) {
        setDespesas((prev) =>
          prev.map((d) =>
            d.id === editingExpense.id
              ? { ...d, supplier: data.supplier, value: data.value, category: data.category, date: data.date, description: data.description, status: data.status }
              : d
          )
        );
        toast.success("Despesa atualizada");
      } else {
        const newDespesa: Despesa = {
          id: String(Date.now()),
          date: data.date,
          supplier: data.supplier,
          description: data.description,
          category: data.category,
          value: data.value,
          status: data.status,
          origin: "Manual",
          attachment_url: data.file ? "#" : null,
        };
        setDespesas((prev) => [newDespesa, ...prev]);
        toast.success("Despesa criada");
      }
      setEditingExpense(null);
    },
    [editingExpense]
  );

  const handleExtratorSave = useCallback(
    (data: { supplier: string; value: number; category: string; date: string; description: string; file: File }) => {
      const newDespesa: Despesa = {
        id: String(Date.now()),
        date: data.date,
        supplier: data.supplier,
        description: data.description,
        category: data.category,
        value: data.value,
        status: "pago",
        origin: "IA",
        attachment_url: "#",
      };
      setDespesas((prev) => [newDespesa, ...prev]);
      toast.success("Despesa extraída e salva com sucesso");
    },
    []
  );

  // Export CSV
  const handleExportCSV = useCallback(() => {
    const header = "Data,Fornecedor,Descrição,Categoria,Valor,Status,Origem\n";
    const rows = filtered
      .map(
        (d) =>
          `${d.date},"${d.supplier}","${d.description}","${d.category}",${d.value},${d.status},${d.origin}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "despesas.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }, [filtered]);

  // Export PDF (basic)
  const handleExportPDF = useCallback(() => {
    toast.info("Exportação PDF em breve - utilize CSV por enquanto");
  }, []);

  const openNewModal = () => {
    setEditingExpense(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
            Despesas
          </h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            Gerencie as despesas da empresa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExtratorOpen(true)}
            className="h-9 px-4 rounded-md text-sm font-medium flex items-center gap-2 border transition-colors hover:bg-[hsl(var(--muted))]"
            style={{ borderColor: "#818CF8", color: "#818CF8" }}
          >
            <Bot size={15} /> Assistente IA
          </button>
          <PermissionGate module="despesas" action="create">
            <button
              onClick={openNewModal}
              className="h-9 px-4 rounded-md text-sm font-medium text-white flex items-center gap-2 transition-colors"
              style={{ background: "hsl(var(--primary))" }}
            >
              <Plus size={15} /> Nova Despesa
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Summary Cards */}
      <DespesaSummaryCards data={summary} />

      {/* Filters */}
      <DespesaFilterBar filters={filters} onFilterChange={handleFilterChange} onClear={handleClearFilters} />

      {/* Table */}
      <div
        className="rounded-lg border"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
      >
        <div className="p-4">
          <DespesaTable
            despesas={filtered}
            onMarkAsPaid={handleMarkAsPaid}
            onEdit={handleEdit}
            onDelete={handleDelete}
            totalValue={totalValue}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
          />
        </div>
      </div>

      {/* Modals */}
      <ModalNovaDespesa
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditingExpense(null); }}
        onSave={handleSave}
        editingExpense={editingExpense}
      />
      <ModalExtrator
        open={extratorOpen}
        onOpenChange={setExtratorOpen}
        onSave={handleExtratorSave}
      />
    </div>
  );
}
