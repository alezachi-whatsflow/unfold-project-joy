import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Plus, Bot, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useExpenses } from "@/hooks/useExpenses";
import { useExpensePredictability } from "@/hooks/useExpensePredictability";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { DespesaSummaryCards } from "./Despesas/components/DespesaSummaryCards";
import { DespesaFilterBar, type Filters } from "./Despesas/components/DespesaFilterBar";
import { DespesaTable } from "./Despesas/components/DespesaTable";
import { PredictabilityDashboard } from "./Despesas/components/PredictabilityDashboard";
import { ModalNovaDespesa } from "./Despesas/components/ModalNovaDespesa";
import { ModalExtrator } from "./Despesas/components/ModalExtrator";
import type { Despesa } from "@/types/expenses";

const DEFAULT_FILTERS: Filters = { search: "", periodo: "", categoria: "", status: "", origem: "" };

export default function ExpensesPage() {
  const tenantId = useTenantId();
  const {
    despesas, summary, isLoading,
    createExpense, updateExpense, togglePaid, deleteExpense, updateCategory,
  } = useExpenses();
  const { categories } = useExpenseCategories();

  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [extratorOpen, setExtratorOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Despesa | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(filters.search), 300);
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

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (d) => d.supplier.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
      );
    }

    if (filters.periodo) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      if (filters.periodo === "mes_atual") {
        const start = new Date(year, month, 1);
        result = result.filter((d) => new Date(d.date + "T00:00:00") >= start);
      } else if (filters.periodo === "mes_anterior") {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        result = result.filter((d) => {
          const dt = new Date(d.date + "T00:00:00");
          return dt >= start && dt <= end;
        });
      } else if (filters.periodo === "3_meses") {
        const start = new Date(year, month - 2, 1);
        result = result.filter((d) => new Date(d.date + "T00:00:00") >= start);
      }
    }

    if (filters.categoria) result = result.filter((d) => d.category === filters.categoria);
    if (filters.status) result = result.filter((d) => d.status === filters.status);
    if (filters.origem) result = result.filter((d) => d.origin === filters.origem);

    return result;
  }, [despesas, debouncedSearch, filters.periodo, filters.categoria, filters.status, filters.origem]);

  // Predictability engine runs on ALL despesas (unfiltered)
  const predictability = useExpensePredictability(despesas);

  // Summary for filtered results
  const filteredSummary = useMemo(() => ({
    total: filtered.reduce((s, d) => s + d.value, 0),
    totalCount: filtered.length,
    pendente: filtered.filter((d) => d.status === "pendente").reduce((s, d) => s + d.value, 0),
    pendenteCount: filtered.filter((d) => d.status === "pendente").length,
    pago: filtered.filter((d) => d.status === "pago").reduce((s, d) => s + d.value, 0),
    pagoCount: filtered.filter((d) => d.status === "pago").length,
    iaCount: filtered.filter((d) => d.origin === "IA").length,
  }), [filtered]);

  const totalValue = useMemo(() => filtered.reduce((s, d) => s + d.value, 0), [filtered]);

  // ── Actions ──

  const handleTogglePaid = useCallback((id: string, isPaid: boolean) => {
    togglePaid.mutate({ id, is_paid: isPaid });
    toast.success(isPaid ? "Marcada como paga" : "Marcada como pendente");
  }, [togglePaid]);

  const handleUpdateCategory = useCallback((id: string, category: string, categoryId: string | null) => {
    updateCategory.mutate({ id, category, category_id: categoryId });
    toast.success("Categoria atualizada");
  }, [updateCategory]);

  const handleEdit = useCallback((d: Despesa) => {
    setEditingExpense(d);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteExpense.mutate(id);
  }, [deleteExpense]);

  const handleSave = useCallback(
    async (data: { supplier: string; value: number; category: string; date: string; description: string; status: string; file: File | null }) => {
      // Upload attachment if provided
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;
      let attachmentFilename: string | null = null;
      let attachmentSizeBytes: number | null = null;

      if (data.file) {
        const ext = data.file.name.split(".").pop() || "bin";
        const fileName = `${tenantId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { data: uploaded, error: uploadError } = await supabase.storage
          .from("expense-attachments")
          .upload(fileName, data.file, { contentType: data.file.type, upsert: false });

        if (uploadError) {
          toast.error("Erro no upload: " + uploadError.message);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("expense-attachments")
          .getPublicUrl(uploaded.path);
        attachmentUrl = urlData.publicUrl;
        attachmentType = data.file.type.startsWith("image/") ? "image" : "pdf";
        attachmentFilename = data.file.name;
        attachmentSizeBytes = data.file.size;
      }

      // Find category_id
      const cat = categories.find((c) => c.name === data.category);

      if (editingExpense) {
        updateExpense.mutate({
          id: editingExpense.id,
          description: data.description,
          category: data.category,
          category_id: cat?.id || null,
          value: data.value,
          date: data.date,
          is_paid: data.status === "pago",
          ...(attachmentUrl && { attachment_url: attachmentUrl }),
        });
        toast.success("Despesa atualizada");
      } else {
        createExpense.mutate({
          description: data.description,
          category: data.category,
          category_id: cat?.id || null,
          value: data.value,
          date: data.date,
          is_paid: data.status === "pago",
          origem: "Manual",
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          attachment_filename: attachmentFilename,
          attachment_size_bytes: attachmentSizeBytes,
        });
      }
      setEditingExpense(null);
    },
    [editingExpense, tenantId, categories, createExpense, updateExpense]
  );

  const handleExtratorSave = useCallback(
    async (data: { supplier: string; value: number; category: string; date: string; description: string; file: File }) => {
      // Upload file
      const ext = data.file.name.split(".").pop() || "bin";
      const fileName = `${tenantId}/${Date.now()}_ia_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from("expense-attachments")
        .upload(fileName, data.file, { contentType: data.file.type, upsert: false });

      let attachmentUrl: string | null = null;
      if (!uploadError && uploaded) {
        const { data: urlData } = supabase.storage
          .from("expense-attachments")
          .getPublicUrl(uploaded.path);
        attachmentUrl = urlData.publicUrl;
      }

      const cat = categories.find((c) => c.name === data.category);

      createExpense.mutate({
        description: data.description,
        category: data.category,
        category_id: cat?.id || null,
        value: data.value,
        date: data.date,
        is_paid: true,
        origem: "IA",
        attachment_url: attachmentUrl,
        attachment_type: data.file.type.startsWith("image/") ? "image" : "pdf",
        attachment_filename: data.file.name,
        attachment_size_bytes: data.file.size,
      });
      toast.success("Despesa extraída e salva");
    },
    [tenantId, categories, createExpense]
  );

  // Export CSV
  const handleExportCSV = useCallback(() => {
    const header = "Data,Fornecedor,Descrição,Categoria,Valor,Status,Origem\n";
    const rows = filtered
      .map((d) => `${d.date},"${d.supplier}","${d.description}","${d.category}",${d.value},${d.status},${d.origin}`)
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

  const handleExportPDF = useCallback(() => {
    toast.info("Exportação PDF em breve — utilize CSV por enquanto");
  }, []);

  const openNewModal = () => {
    setEditingExpense(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
            Despesas
          </h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            Gestão financeira inteligente com previsibilidade IAZIS
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

      {/* Predictability Dashboard (IAZIS core) */}
      {!isLoading && despesas.length > 0 && (
        <PredictabilityDashboard data={predictability} />
      )}

      {/* Summary Cards */}
      <DespesaSummaryCards data={filteredSummary} />

      {/* Filters */}
      <DespesaFilterBar filters={filters} onFilterChange={handleFilterChange} onClear={handleClearFilters} />

      {/* Table */}
      <div
        className="rounded-lg border"
        style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
      >
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2" style={{ color: "hsl(var(--muted-foreground))" }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Carregando despesas...</span>
            </div>
          ) : (
            <DespesaTable
              despesas={filtered}
              categories={categories}
              onTogglePaid={handleTogglePaid}
              onUpdateCategory={handleUpdateCategory}
              onEdit={handleEdit}
              onDelete={handleDelete}
              totalValue={totalValue}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
            />
          )}
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
