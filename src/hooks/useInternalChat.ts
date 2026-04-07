/**
 * useInternalChat — Hooks for the internal team chat system
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useTenantId } from "@/hooks/useTenantId"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

export interface InternalChat {
  id: string
  tenant_id: string
  name: string | null
  type: "direct" | "group" | "ticket_thread"
  reference_id: string | null
  created_by: string | null
  updated_at: string
}

export interface ChatMessage {
  id: string
  chat_id: string
  tenant_id: string
  sender_id: string | null
  sender_name: string | null
  content: string
  content_type: string
  media_url: string | null
  metadata: Record<string, any>
  created_at: string
}

export interface Notification {
  id: string
  tenant_id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  metadata: Record<string, any>
  created_at: string
}

// ── My Chats ────────────────────────────────────────────────────────────────

export function useMyChats() {
  const tenantId = useTenantId()
  const { user } = useAuth()

  return useQuery({
    queryKey: ["internal-chats", tenantId, user?.id],
    queryFn: async () => {
      if (!user?.id || !tenantId) return []

      // Get chats where I'm a member
      const { data: memberships } = await (supabase as any)
        .from("internal_chat_members")
        .select("chat_id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)

      const chatIds = (memberships || []).map((m: any) => m.chat_id)
      if (chatIds.length === 0) return []

      const { data: chats } = await (supabase as any)
        .from("internal_chats")
        .select("*")
        .in("id", chatIds)
        .order("updated_at", { ascending: false })

      return (chats || []) as InternalChat[]
    },
    enabled: !!tenantId && !!user?.id,
    staleTime: 30_000,
  })
}

// ── Chat Messages ───────────────────────────────────────────────────────────

export function useChatMessages(chatId: string | null) {
  const tenantId = useTenantId()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["chat-messages", chatId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("internal_chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .limit(100)
      if (error) throw error
      return (data || []) as ChatMessage[]
    },
    enabled: !!chatId && !!tenantId,
  })

  const sendMessage = useMutation({
    mutationFn: async (input: { content: string; content_type?: string; metadata?: Record<string, any> }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Sistema"
      const { error } = await (supabase as any)
        .from("internal_chat_messages")
        .insert({
          chat_id: chatId,
          tenant_id: tenantId,
          sender_id: user?.id || null,
          sender_name: name,
          content: input.content,
          content_type: input.content_type || "text",
          metadata: input.metadata || {},
        })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] }),
    onError: (e: any) => toast.error("Erro: " + e.message),
  })

  return { messages: query.data || [], isLoading: query.isLoading, sendMessage }
}

// ── Notifications ───────────────────────────────────────────────────────────

export function useNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data } = await (supabase as any)
        .from("internal_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
      return (data || []) as Notification[]
    },
    enabled: !!user?.id,
    refetchInterval: 30_000,
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any)
        .from("internal_notifications")
        .update({ read: true })
        .eq("id", id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return
      await (supabase as any)
        .from("internal_notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const unreadCount = (query.data || []).filter(n => !n.read).length

  return {
    notifications: query.data || [],
    unreadCount,
    markRead,
    markAllRead,
    isLoading: query.isLoading,
  }
}

// ── Send Mention Notification ───────────────────────────────────────────────

export async function sendMentionNotification(
  tenantId: string,
  mentionedUserId: string,
  mentionedByName: string,
  ticketId: string,
  ticketTitle: string,
  slug: string,
) {
  await (supabase as any)
    .from("internal_notifications")
    .insert({
      tenant_id: tenantId,
      user_id: mentionedUserId,
      type: "mention",
      title: `${mentionedByName} mencionou voce`,
      body: `Em ticket: "${ticketTitle}"`,
      link: `/app/${slug}/suporte?ticket=${ticketId}`,
      metadata: { ticket_id: ticketId, mentioned_by: mentionedByName },
    })
}

// ── Team Members (for @mentions autocomplete) ───────────────────────────────

export function useTeamMembers() {
  const tenantId = useTenantId()

  return useQuery({
    queryKey: ["team-members", tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      // Get user IDs for this tenant
      const { data: uts } = await supabase
        .from("user_tenants")
        .select("user_id")
        .eq("tenant_id", tenantId)

      const userIds = (uts || []).map((u: any) => u.user_id)
      if (userIds.length === 0) return []

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, role, avatar_url")
        .in("id", userIds)

      return (profiles || []) as { id: string; full_name: string | null; role: string; avatar_url: string | null }[]
    },
    enabled: !!tenantId,
    staleTime: 120_000,
  })
}
