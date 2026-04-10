import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "./useTenantId";

export interface ExpenseCategory {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  icon: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
}

export function useExpenseCategories() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["expense-categories", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("expense_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as ExpenseCategory[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  });

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      const { data, error } = await (supabase as any)
        .from("expense_categories")
        .insert({ tenant_id: tenantId, name })
        .select()
        .single();
      if (error) throw error;
      return data as ExpenseCategory;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expense-categories"] }),
  });

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    createCategory,
  };
}
