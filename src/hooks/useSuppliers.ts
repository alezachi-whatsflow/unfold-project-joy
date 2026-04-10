import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "./useTenantId";

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
}

export function useSuppliers() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["suppliers", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as Supplier[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  });

  const createSupplier = useMutation({
    mutationFn: async (params: { name: string; cpf_cnpj?: string; email?: string; phone?: string }) => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      const { data, error } = await (supabase as any)
        .from("suppliers")
        .insert({ tenant_id: tenantId, ...params })
        .select()
        .single();
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("suppliers")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  return {
    suppliers: query.data || [],
    isLoading: query.isLoading,
    createSupplier,
    updateSupplier,
  };
}
