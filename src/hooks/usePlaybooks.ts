import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";

export interface PlaybookField {
  key: string;
  label: string;
  type: "text" | "number" | "currency" | "date" | "select" | "boolean" | "email" | "phone";
  required: boolean;
  question_hint?: string;
  options?: string[];
}

export interface PlaybookTrigger {
  pipeline_stage?: string;
  tags_include?: string[];
  channel?: string;
  auto_start?: boolean;
}

export interface Playbook {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  objective_prompt: string;
  persona: string;
  tone: string;
  fields_to_extract: PlaybookField[];
  trigger_conditions: PlaybookTrigger;
  escalation_keywords: string[];
  escalation_after_minutes: number;
  max_messages: number;
  is_active: boolean;
  is_native: boolean;
  category: string;
  total_sessions: number;
  completed_sessions: number;
  avg_completion_rate: number;
  created_at: string;
  updated_at: string;
}

export interface PlaybookSession {
  id: string;
  playbook_id: string;
  contact_jid: string;
  contact_name: string | null;
  negocio_id: string | null;
  status: string;
  extracted_data: Record<string, any>;
  messages_count: number;
  escalation_reason: string | null;
  started_at: string;
  completed_at: string | null;
}

export function usePlaybooks() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();

  const { data: playbooks = [], isLoading } = useQuery({
    queryKey: ["ai-playbooks", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ai_playbooks")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Playbook[];
    },
    enabled: !!tenantId,
  });

  const createPlaybook = useMutation({
    mutationFn: async (input: Partial<Playbook>) => {
      const { data, error } = await (supabase as any)
        .from("ai_playbooks")
        .insert({
          tenant_id: tenantId,
          name: input.name || "Novo Playbook",
          description: input.description || null,
          objective_prompt: input.objective_prompt || "Voce e um assistente que coleta informacoes do cliente.",
          persona: input.persona || "assistente",
          tone: input.tone || "profissional",
          fields_to_extract: input.fields_to_extract || [],
          trigger_conditions: input.trigger_conditions || {},
          escalation_keywords: input.escalation_keywords || ["reclamacao", "cancelar", "falar com humano"],
          is_active: input.is_active ?? true,
          is_native: input.is_native ?? false,
          category: input.category || "custom",
        })
        .select()
        .single();
      if (error) throw error;
      return data as Playbook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-playbooks"] });
      toast.success("Playbook criado!");
    },
    onError: (err: any) => {
      const msg = err.message?.includes("Limite") ? "Limite de 20 playbooks atingido." : err.message;
      toast.error("Erro: " + msg);
    },
  });

  const updatePlaybook = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Playbook> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("ai_playbooks")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-playbooks"] });
      toast.success("Playbook atualizado!");
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const deletePlaybook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ai_playbooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-playbooks"] });
      toast.success("Playbook excluido!");
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  return { playbooks, isLoading, createPlaybook, updatePlaybook, deletePlaybook };
}

export function usePlaybookSessions(playbookId?: string) {
  const tenantId = useTenantId();

  return useQuery({
    queryKey: ["playbook-sessions", tenantId, playbookId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("ai_playbook_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (playbookId) query = query.eq("playbook_id", playbookId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PlaybookSession[];
    },
    enabled: !!tenantId,
  });
}
