import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserTenants } from "@/hooks/useUserTenants";
import { toast } from "sonner";

export interface Activity {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  due_time: string | null;
  assigned_to: string | null;
  related_customer_id: string | null;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useActivities() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: tenants } = useUserTenants();
  const tenantId = tenants?.[0]?.tenant_id;

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Activity[];
    },
  });

  const createActivity = useMutation({
    mutationFn: async (input: Partial<Activity>) => {
      const { error } = await supabase.from("activities").insert({
        tenant_id: tenantId!,
        title: input.title!,
        description: input.description || "",
        status: input.status || "todo",
        priority: input.priority || "medium",
        due_date: input.due_date || null,
        due_time: input.due_time || null,
        tags: input.tags || [],
        created_by: user?.id,
        assigned_to: user?.id,
        related_customer_id: input.related_customer_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["activities"] }); toast.success("Atividade criada"); },
    onError: () => toast.error("Erro ao criar atividade"),
  });

  const updateActivity = useMutation({
    mutationFn: async (input: Partial<Activity> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("activities").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["activities"] }); },
    onError: () => toast.error("Erro ao atualizar atividade"),
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["activities"] }); toast.success("Atividade removida"); },
    onError: () => toast.error("Erro ao remover atividade"),
  });

  return {
    activities,
    isLoading,
    createActivity: createActivity.mutate,
    updateActivity: updateActivity.mutate,
    deleteActivity: deleteActivity.mutate,
  };
}
