import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "./useTenantId";

// ═══════════════════════════════════════════
// Hook: Group Kanban Data + Realtime
// ═══════════════════════════════════════════

export interface KanbanColumn {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  sla_minutes: number | null;
}

export interface WhatsAppGroup {
  id: string;
  tenant_id: string;
  instance_name: string;
  jid: string;
  name: string | null;
  description: string | null;
  invite_link: string | null;
  profile_pic_url: string | null;
  participant_count: number;
  is_admin: boolean;
  kanban_column_id: string | null;
  assigned_to: string | null;
  sla_deadline: string | null;
  last_message_at: string | null;
  unread_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface GroupAttribution {
  id: string;
  group_id: string;
  user_id: string;
  status: string;
  assigned_at: string;
  assigned_by: string | null;
}

const DEFAULT_COLUMNS = [
  { name: "Novos", color: "#6366f1", position: 0, is_default: true },
  { name: "A Responder", color: "#f59e0b", position: 1, is_default: false },
  { name: "Setorizado", color: "#10b981", position: 2, is_default: false },
  { name: "Em Atendimento", color: "#3b82f6", position: 3, is_default: false },
  { name: "Resolvido", color: "#6b7280", position: 4, is_default: false },
];

export function useGroupKanban() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();

  // ── Fetch columns ──
  const { data: columns = [], isLoading: columnsLoading } = useQuery({
    queryKey: ["group-kanban-columns", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("group_kanban_columns")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("position");

      if (error) throw error;

      // Auto-create default columns if none exist
      if (!data || data.length === 0) {
        const toInsert = DEFAULT_COLUMNS.map((c) => ({ ...c, tenant_id: tenantId }));
        const { data: created, error: createErr } = await supabase
          .from("group_kanban_columns")
          .insert(toInsert)
          .select();
        if (createErr) throw createErr;
        return (created || []) as KanbanColumn[];
      }

      return data as KanbanColumn[];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  // ── Fetch groups ──
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["whatsapp-groups", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("whatsapp_groups")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as WhatsAppGroup[];
    },
    enabled: !!tenantId,
    staleTime: 10_000,
  });

  // ── Realtime subscription ──
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel("group-kanban-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_groups", filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-groups", tenantId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_attributions", filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-groups", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  // ── Move group to column ──
  const moveGroup = useMutation({
    mutationFn: async ({ groupId, columnId }: { groupId: string; columnId: string }) => {
      const { error } = await supabase
        .from("whatsapp_groups")
        .update({ kanban_column_id: columnId, updated_at: new Date().toISOString() })
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-groups", tenantId] });
    },
  });

  // ── Assign group to operator ──
  const assignGroup = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string | null }) => {
      const { error } = await supabase
        .from("whatsapp_groups")
        .update({ assigned_to: userId, updated_at: new Date().toISOString() })
        .eq("id", groupId);
      if (error) throw error;

      // Create attribution record
      if (userId) {
        await supabase.from("group_attributions").upsert(
          { tenant_id: tenantId!, group_id: groupId, user_id: userId, status: "active", assigned_at: new Date().toISOString() },
          { onConflict: "group_id,user_id" }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-groups", tenantId] });
    },
  });

  return {
    columns,
    groups,
    isLoading: columnsLoading || groupsLoading,
    moveGroup: moveGroup.mutateAsync,
    assignGroup: assignGroup.mutateAsync,
  };
}
