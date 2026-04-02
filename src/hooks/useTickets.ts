import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

export interface Ticket {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  assigned_to: string | null;
  department_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  whatsapp_jid: string | null;
  whatsapp_instance: string | null;
  sla_deadline: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  tenant_id: string;
  sender_id: string | null;
  sender_name: string | null;
  content: string;
  content_type: string;
  media_url: string | null;
  is_internal: boolean;
  created_at: string;
}

export function useTickets() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const { isOwnedOnly, userId } = usePermissions();
  const viewOwnedOnly = isOwnedOnly("suporte");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", tenantId, viewOwnedOnly ? userId : "all"],
    queryFn: async () => {
      let query = (supabase as any)
        .from("tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });

      // RBAC: if user can only see their own tickets
      if (viewOwnedOnly && userId) {
        query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Ticket[];
    },
    enabled: !!tenantId,
  });

  const createTicket = useMutation({
    mutationFn: async (input: Partial<Ticket>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("tickets")
        .insert({
          tenant_id: tenantId,
          title: input.title,
          description: input.description || null,
          status: input.status || "open",
          priority: input.priority || "medium",
          category: input.category || "general",
          assigned_to: input.assigned_to || null,
          reference_type: input.reference_type || null,
          reference_id: input.reference_id || null,
          whatsapp_jid: input.whatsapp_jid || null,
          whatsapp_instance: input.whatsapp_instance || null,
          tags: input.tags || [],
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket criado com sucesso");
    },
    onError: (err: any) => toast.error("Erro ao criar ticket: " + err.message),
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Ticket> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("tickets")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
    onError: (err: any) => toast.error("Erro ao atualizar ticket: " + err.message),
  });

  return { tickets, isLoading, createTicket, updateTicket };
}

export function useTicketMessages(ticketId: string | null) {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as TicketMessage[];
    },
    enabled: !!ticketId && !!tenantId,
  });

  const sendMessage = useMutation({
    mutationFn: async (input: { content: string; is_internal: boolean; content_type?: string; media_url?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Sistema";
      const { error } = await (supabase as any)
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          tenant_id: tenantId,
          sender_id: user?.id || null,
          sender_name: userName,
          content: input.content,
          content_type: input.content_type || "text",
          media_url: input.media_url || null,
          is_internal: input.is_internal,
        });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticketId] }),
    onError: (err: any) => toast.error("Erro ao enviar: " + err.message),
  });

  return { messages, isLoading, sendMessage };
}
