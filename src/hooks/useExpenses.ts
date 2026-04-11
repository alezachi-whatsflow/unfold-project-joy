import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "./useTenantId";
import type { Despesa, ExpenseRow, ExpenseInsertPayload, ExpenseUpdatePayload, ExpenseSummary } from "@/types/expenses";
import { toast } from "sonner";

/** Map DB row → frontend view model */
function rowToDespesa(row: ExpenseRow, supplierName?: string, categoryName?: string): Despesa {
  return {
    id: row.id,
    date: row.date,
    supplier: supplierName || row.description.split(" ")[0] || "—",
    supplier_id: row.supplier_id,
    description: row.description,
    category: categoryName || row.category || "Outros",
    category_id: row.category_id,
    value: Number(row.value),
    status: row.is_paid ? "pago" : "pendente",
    origin: (row.origem === "IA" ? "IA" : "Manual") as "IA" | "Manual",
    is_recurring: row.is_recurring || false,
    recurrence_period: row.recurrence_period,
    attachment_url: row.attachment_url,
  };
}

const QUERY_KEY = "expenses";

export function useExpenses() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();

  /* ── Fetch all expenses with joined supplier/category names ── */
  const query = useQuery({
    queryKey: [QUERY_KEY, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase as any)
        .from("asaas_expenses")
        .select(`
          *,
          supplier:suppliers(name),
          cat:expense_categories(name)
        `)
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) =>
        rowToDespesa(row, row.supplier?.name, row.cat?.name)
      ) as Despesa[];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  /* ── Realtime: auto-refresh on INSERT/UPDATE/DELETE ── */
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("expenses-rt")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "asaas_expenses",
        filter: `tenant_id=eq.${tenantId}`,
      }, (payload) => {
        // Show toast only for inserts from IA (WhatsApp pipeline)
        if (payload.eventType === "INSERT" && (payload.new as any)?.origem === "IA") {
          toast.success("Nova despesa extraída por IA!", { icon: "🤖" });
        }
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  /* ── Compute summary from fetched data ── */
  const despesas = query.data || [];
  const summary: ExpenseSummary = {
    total: despesas.reduce((s, d) => s + d.value, 0),
    totalCount: despesas.length,
    pendente: despesas.filter((d) => d.status === "pendente").reduce((s, d) => s + d.value, 0),
    pendenteCount: despesas.filter((d) => d.status === "pendente").length,
    pago: despesas.filter((d) => d.status === "pago").reduce((s, d) => s + d.value, 0),
    pagoCount: despesas.filter((d) => d.status === "pago").length,
    iaCount: despesas.filter((d) => d.origin === "IA").length,
  };

  /* ── Create ── */
  const createExpense = useMutation({
    mutationFn: async (payload: Omit<ExpenseInsertPayload, "tenant_id">) => {
      if (!tenantId) throw new Error("Tenant não identificado");
      const { data, error } = await (supabase as any)
        .from("asaas_expenses")
        .insert({ ...payload, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tenantId] });
      toast.success("Despesa criada");
    },
    onError: (err: any) => toast.error(err.message),
  });

  /* ── Update ── */
  const updateExpense = useMutation({
    mutationFn: async ({ id, ...updates }: ExpenseUpdatePayload & { id: string }) => {
      const { error } = await (supabase as any)
        .from("asaas_expenses")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tenantId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  /* ── Toggle status (optimistic) ── */
  const togglePaid = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await (supabase as any)
        .from("asaas_expenses")
        .update({ is_paid })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_paid }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY, tenantId] });
      const prev = queryClient.getQueryData<Despesa[]>([QUERY_KEY, tenantId]);
      queryClient.setQueryData<Despesa[]>([QUERY_KEY, tenantId], (old) =>
        (old || []).map((d) =>
          d.id === id ? { ...d, status: is_paid ? "pago" : "pendente" } : d
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData([QUERY_KEY, tenantId], ctx.prev);
      toast.error("Erro ao atualizar status");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tenantId] }),
  });

  /* ── Delete ── */
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("asaas_expenses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tenantId] });
      toast.success("Despesa excluída");
    },
    onError: (err: any) => toast.error(err.message),
  });

  /* ── Update category inline (optimistic) ── */
  const updateCategory = useMutation({
    mutationFn: async ({ id, category, category_id }: { id: string; category: string; category_id: string | null }) => {
      const { error } = await (supabase as any)
        .from("asaas_expenses")
        .update({ category, category_id })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, category }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY, tenantId] });
      const prev = queryClient.getQueryData<Despesa[]>([QUERY_KEY, tenantId]);
      queryClient.setQueryData<Despesa[]>([QUERY_KEY, tenantId], (old) =>
        (old || []).map((d) => (d.id === id ? { ...d, category } : d))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData([QUERY_KEY, tenantId], ctx.prev);
      toast.error("Erro ao atualizar categoria");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tenantId] }),
  });

  return {
    despesas,
    summary,
    isLoading: query.isLoading,
    refetch: query.refetch,
    createExpense,
    updateExpense,
    togglePaid,
    deleteExpense,
    updateCategory,
  };
}
