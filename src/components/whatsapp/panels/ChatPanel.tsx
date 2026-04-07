import { useState, useEffect, useCallback } from "react";
import { Video, Phone, Search, MoreVertical, PanelRightOpen, PanelRightClose, RefreshCw, CheckCircle2, Bot, Tag, StickyNote, MoreHorizontal, Lock, UserPlus, Headphones, X, Send, LifeBuoy, MessageSquarePlus } from "lucide-react";
import { fmtDateTime } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { QuickLeadDrawer } from "../QuickLeadDrawer";
import type { Conversation } from "@/data/mockConversations";
import type { Message } from "@/data/mockMessages";
import WaAvatar from "../shared/Avatar";
import TagBadge from "../shared/TagBadge";
import MessageList from "../chat/MessageList";
import ChatInput, { type AttachmentPayload } from "../chat/ChatInput";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";

interface ChatPanelProps {
  conversation: Conversation | null;
  messages: Message[];
  isRightOpen: boolean;
  onToggleRight: () => void;
  onSend: (text: string) => void;
  onSendAttachment?: (payload: AttachmentPayload) => Promise<void>;
  onNewConversation?: () => void;
  /** Assign the conversation to the current user (Iniciar Atendimento) */
  onAssign?: () => void;
  /** Resolve / finalize the conversation */
  onResolve?: () => void;
  /** Current top-level filter tab */
  activeFilter?: string;
  /** Pagination: load more older messages */
  onLoadMore?: () => void;
  /** Pagination: whether there are more messages to load */
  hasMore?: boolean;
}

// Quick action chips
const quickActions = [
  { id: "transfer", label: "Transferir", icon: RefreshCw, bg: "rgba(245,158,11,0.2)", text: "#FBBF24", border: "rgba(245,158,11,0.4)" },
  { id: "resolve", label: "Resolver", icon: CheckCircle2, bg: "rgba(16,185,129,0.2)", text: "#34D399", border: "rgba(16,185,129,0.4)" },
  { id: "ai", label: "IA: ON", icon: Bot, bg: "rgba(124,58,237,0.2)", text: "#A78BFA", border: "rgba(124,58,237,0.4)" },
  { id: "tag", label: "Tag", icon: Tag, bg: "rgba(14,165,233,0.15)", text: "#38BDF8", border: "rgba(14,165,233,0.4)" },
  { id: "notes", label: "Notas", icon: StickyNote, bg: "rgba(100,116,139,0.15)", text: "#94A3B8", border: "rgba(100,116,139,0.4)" },
  { id: "lead", label: "Criar Lead", icon: UserPlus, bg: "rgba(37,211,102,0.15)", text: "#25D366", border: "rgba(37,211,102,0.3)" },
  { id: "ticket", label: "Abrir Ticket", icon: LifeBuoy, bg: "rgba(139,92,246,0.15)", text: "#A78BFA", border: "rgba(139,92,246,0.3)" },
  { id: "more", label: "Mais", icon: MoreHorizontal, bg: "rgba(100,116,139,0.1)", text: "#8696A0", border: "rgba(100,116,139,0.3)" },
];

/* ────────────────────────────────────────────────────── */
/*  Types for quick-action state                         */
/* ────────────────────────────────────────────────────── */
interface Attendant {
  user_id: string;
  full_name: string;
}

interface TenantTag {
  id: string;
  name: string;
  color: string;
}

interface ConversationNote {
  id: string;
  text: string;
  user_id: string;
  user_name?: string;
  created_at: string;
}

export default function ChatPanel({ conversation, messages, isRightOpen, onToggleRight, onSend, onSendAttachment, onNewConversation, onAssign, onResolve, activeFilter, onLoadMore, hasMore }: ChatPanelProps) {
  const [replyTo, setReplyTo] = useState<{ senderName: string; content: string; messageId?: string } | null>(null);
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);

  const tenantId = useTenantId();

  // ── Transfer state ──
  const [transferOpen, setTransferOpen] = useState(false);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);

  // ── Tag state ──
  const [tagOpen, setTagOpen] = useState(false);
  const [tenantTags, setTenantTags] = useState<TenantTag[]>([]);
  const [leadTags, setLeadTags] = useState<string[]>([]);
  const [tagLoading, setTagLoading] = useState(false);

  // ── Notes state ──
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<ConversationNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  // ── AI toggle state ──
  const [iaEnabled, setIaEnabled] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);

  // Current user ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // Reset quick-action states when conversation changes
  useEffect(() => {
    setTransferOpen(false);
    setTagOpen(false);
    setNotesOpen(false);
    setIaEnabled(false);
  }, [conversation?.id]);

  // Load AI state when conversation changes
  useEffect(() => {
    if (!conversation) return;
    supabase
      .from("whatsapp_leads")
      .select("chatbot_disable_until")
      .eq("chat_id", conversation.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          // chatbot_disable_until === 0 or null means AI is ON
          // A large timestamp means AI is OFF (disabled until that time)
          const disabledUntil = data.chatbot_disable_until ?? 0;
          const isDisabled = disabledUntil > Date.now() / 1000;
          setIaEnabled(!isDisabled);
        }
      });
  }, [conversation?.id]);

  /* ═══════════════════════════════════════════════════ */
  /*  1. TRANSFER handler                               */
  /* ═══════════════════════════════════════════════════ */
  const openTransfer = useCallback(async () => {
    if (!tenantId) { toast.error("Tenant não identificado"); return; }
    setTransferOpen(true);
    setTransferLoading(true);
    try {
      // Get all users belonging to the same tenant, joined with profiles for name
      const { data, error } = await supabase
        .from("user_tenants")
        .select("user_id, profiles:user_id(full_name)")
        .eq("tenant_id", tenantId);

      if (error) throw error;

      const list: Attendant[] = (data || [])
        .map((row: any) => ({
          user_id: row.user_id,
          full_name: row.profiles?.full_name || "Sem nome",
        }))
        .filter((a: Attendant) => a.user_id !== currentUserId); // exclude self

      setAttendants(list);
    } catch (err: any) {
      toast.error(`Erro ao carregar atendentes: ${err.message}`);
    } finally {
      setTransferLoading(false);
    }
  }, [tenantId, currentUserId]);

  const doTransfer = useCallback(async (targetUserId: string, targetName: string) => {
    if (!conversation) return;
    const { error } = await supabase
      .from("whatsapp_leads")
      .update({ assigned_attendant_id: targetUserId, lead_status: "open", is_ticket_open: true })
      .eq("chat_id", conversation.id);

    if (error) {
      toast.error(`Erro ao transferir: ${error.message}`);
    } else {
      toast.success(`Conversa transferida para ${targetName}`);
    }
    setTransferOpen(false);
  }, [conversation]);

  /* ═══════════════════════════════════════════════════ */
  /*  2. TAG handler                                    */
  /* ═══════════════════════════════════════════════════ */
  const openTags = useCallback(async () => {
    if (!tenantId || !conversation) return;
    setTagOpen(true);
    setTagLoading(true);
    try {
      // Load tenant tags
      const { data: tags, error: tagErr } = await supabase
        .from("tenant_tags")
        .select("id, name, color")
        .eq("tenant_id", tenantId)
        .order("name");

      if (tagErr) throw tagErr;
      setTenantTags(tags || []);

      // Load current lead tags
      const { data: lead } = await supabase
        .from("whatsapp_leads")
        .select("lead_tags")
        .eq("chat_id", conversation.id)
        .maybeSingle();

      setLeadTags(lead?.lead_tags || []);
    } catch (err: any) {
      toast.error(`Erro ao carregar tags: ${err.message}`);
    } finally {
      setTagLoading(false);
    }
  }, [tenantId, conversation]);

  const toggleTag = useCallback(async (tagName: string) => {
    if (!conversation) return;
    const current = [...leadTags];
    const idx = current.indexOf(tagName);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(tagName);
    }

    const { error } = await supabase
      .from("whatsapp_leads")
      .update({ lead_tags: current })
      .eq("chat_id", conversation.id);

    if (error) {
      toast.error(`Erro ao atualizar tags: ${error.message}`);
    } else {
      setLeadTags(current);
    }
  }, [conversation, leadTags]);

  /* ═══════════════════════════════════════════════════ */
  /*  3. NOTES handler                                  */
  /* ═══════════════════════════════════════════════════ */
  const openNotes = useCallback(async () => {
    if (!conversation || !tenantId) return;
    setNotesOpen(true);
    try {
      const { data, error } = await supabase
        .from("conversation_notes")
        .select("id, text, user_id, created_at")
        .eq("chat_id", conversation.id)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user names for the notes
      const userIds = [...new Set((data || []).map((n: any) => n.user_id))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => { userMap[p.id] = p.full_name || "Sem nome"; });
      }

      setNotes(
        (data || []).map((n: any) => ({
          ...n,
          user_name: userMap[n.user_id] || "Desconhecido",
        }))
      );
    } catch (err: any) {
      toast.error(`Erro ao carregar notas: ${err.message}`);
    }
  }, [conversation, tenantId]);

  const saveNote = useCallback(async () => {
    if (!conversation || !tenantId || !currentUserId || !noteText.trim()) return;
    setNoteSaving(true);
    try {
      const { data, error } = await supabase
        .from("conversation_notes")
        .insert({
          chat_id: conversation.id,
          tenant_id: tenantId,
          user_id: currentUserId,
          text: noteText.trim(),
        })
        .select("id, text, user_id, created_at")
        .single();

      if (error) throw error;

      // Get the current user name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", currentUserId)
        .maybeSingle();

      setNotes((prev) => [
        { ...data, user_name: profile?.full_name || "Eu" },
        ...prev,
      ]);
      setNoteText("");
      toast.success("Nota salva");
    } catch (err: any) {
      toast.error(`Erro ao salvar nota: ${err.message}`);
    } finally {
      setNoteSaving(false);
    }
  }, [conversation, tenantId, currentUserId, noteText]);

  /* ═══════════════════════════════════════════════════ */
  /*  4. AI TOGGLE handler                              */
  /* ═══════════════════════════════════════════════════ */
  const toggleAI = useCallback(async () => {
    if (!conversation) return;
    setIaLoading(true);
    try {
      // Toggle: if currently enabled, disable by setting a far-future timestamp
      // If currently disabled, enable by setting 0
      const newValue = iaEnabled ? 9999999999 : 0;

      const { error } = await supabase
        .from("whatsapp_leads")
        .update({ chatbot_disable_until: newValue })
        .eq("chat_id", conversation.id);

      if (error) throw error;

      setIaEnabled(!iaEnabled);
      toast.success(iaEnabled ? "IA desativada" : "IA ativada");
    } catch (err: any) {
      toast.error(`Erro ao alternar IA: ${err.message}`);
    } finally {
      setIaLoading(false);
    }
  }, [conversation, iaEnabled]);

  const openTicket = useCallback(async () => {
    if (!conversation) return;
    try {
      const { getTenantId } = await import("@/lib/tenantResolver");
      const tid = await getTenantId();
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from("tickets").insert({
        tenant_id: tid,
        title: `Suporte: ${conversation.name || conversation.phone}`,
        description: `Ticket criado a partir da conversa WhatsApp com ${conversation.name || conversation.phone}`,
        reference_type: "whatsapp_contact",
        reference_id: conversation.id,
        whatsapp_jid: conversation.id,
        whatsapp_instance: conversation.instanceName,
        category: "support",
        created_by: user?.id || null,
      });
      toast.success("Ticket de suporte criado!");
    } catch (e: any) {
      toast.error("Erro ao criar ticket: " + (e.message || ""));
    }
  }, [conversation]);

  /* ═══════════════════════════════════════════════════ */
  /*  Quick action click dispatcher                     */
  /* ═══════════════════════════════════════════════════ */
  const handleQuickAction = useCallback((actionId: string) => {
    switch (actionId) {
      case "lead":
        setLeadDrawerOpen(true);
        break;
      case "resolve":
        if (onResolve) onResolve();
        break;
      case "transfer":
        openTransfer();
        break;
      case "tag":
        openTags();
        break;
      case "notes":
        openNotes();
        break;
      case "ai":
        toggleAI();
        break;
      case "ticket":
        openTicket();
        break;
    }
  }, [onResolve, openTransfer, openTags, openNotes, toggleAI]);

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center chat-wallpaper min-w-0">
        <Lock size={48} style={{ color: "var(--wa-border-input)" }} />
        <p className="mt-4 text-lg font-light" style={{ color: "var(--wa-text-secondary)" }}>
          Suas mensagens são protegidas com<br />criptografia de ponta a ponta
        </p>
        <button
          onClick={onNewConversation}
          className="mt-6 px-6 py-2 rounded-full border text-sm font-medium transition-colors hover:bg-[var(--wa-green)] hover:text-white"
          style={{ borderColor: "var(--wa-green)", color: "var(--wa-green)" }}
        >
          + Nova Conversa
        </button>
      </div>
    );
  }

  const c = conversation;

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Chat Header */}
      <div className="msg-chat-header" style={{ flexDirection: "column", height: "auto" }}>
        <div className="flex items-center justify-between w-full" style={{ height: 56 }}>
          <div className="flex items-center gap-3 min-w-0">
            <WaAvatar initials={c.avatarInitials} color={c.avatarColor} size={40} isOnline={c.isOnline} imageUrl={c.avatarUrl} />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold truncate" style={{ color: "var(--wa-text-primary)" }}>{c.name}</p>
              <p className="text-[13px]" style={{ color: "var(--wa-text-secondary)" }}>
                {c.isGroup
                  ? `Grupo${c.participantCount ? ` · ${c.participantCount} participantes` : ""}`
                  : c.isOnline ? "online" : "visto por último recentemente"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {c.tags.map((tag, i) => <TagBadge key={i} label={tag.label} color={tag.color} />)}
          </div>
          <div className="flex items-center gap-4 ml-4">
            {onNewConversation && (
              <button
                onClick={onNewConversation}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors hover:opacity-80"
                style={{ background: "var(--wa-green, #25D366)", color: "#fff" }}
                title="Nova Conversa"
              >
                <MessageSquarePlus size={12} /> Nova
              </button>
            )}
            {[Video, Phone, Search].map((Icon, i) => (
              <button key={i} style={{ color: "var(--wa-text-secondary)" }} className="hover:brightness-150 transition-all" aria-label="action">
                <Icon size={22} />
              </button>
            ))}
            <button onClick={onToggleRight} style={{ color: "var(--wa-text-secondary)" }} className="hover:brightness-150 transition-all" aria-label="Toggle painel">
              {isRightOpen ? <PanelRightClose size={22} /> : <PanelRightOpen size={22} />}
            </button>
            <button style={{ color: "var(--wa-text-secondary)" }} aria-label="Mais opções">
              <MoreVertical size={22} />
            </button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto border-t border-white/[0.04]" style={{ height: 36 }}>
          {/* "Iniciar Atendimento" */}
          {onAssign && (
            <button
              onClick={onAssign}
              className="msg-pill flex items-center gap-1.5 shrink-0 pill-green"
              style={{ fontWeight: 600 }}
            >
              <Headphones size={13} />
              Iniciar Atendimento
            </button>
          )}
          {quickActions.map((a) => {
            // Replace "Resolver" label with "Finalizar" when in atendimento
            let label = a.id === "resolve" ? "Finalizar" : a.label;
            // Dynamic AI label
            if (a.id === "ai") label = iaEnabled ? "IA: ON" : "IA: OFF";
            return (
              <button
                key={a.id}
                onClick={() => handleQuickAction(a.id)}
                className={cn(
                  "msg-pill flex items-center gap-1.5 shrink-0",
                  a.id === "resolve" && "pill-green",
                  a.id === "ai" && (iaEnabled ? "pill-blue" : "pill-gray"),
                  a.id === "transfer" && "pill-orange",
                  a.id === "lead" && "pill-green",
                )}
              >
                <a.icon size={13} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        conversationId={conversation?.id}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        onReply={(msg) => setReplyTo({ senderName: msg.senderName || "Voce", content: msg.content || (msg.type !== "text" ? `[${msg.type}]` : ""), messageId: msg.id })}
        onReact={(msgId, emoji) => {
          // React via uazapi/meta
          import("@/services/messageService").then(({ messageService }) => {
            if (conversation?.instanceName) {
              messageService.react(conversation.instanceName, msgId, conversation.id, emoji);
            }
          });
        }}
        onDelete={(msgId) => {
          if (conversation?.instanceName) {
            import("@/services/messageService").then(({ messageService }) => {
              messageService.delete(conversation.instanceName, msgId, conversation.id);
            });
          }
        }}
      />

      {/* Input */}
      <ChatInput key={conversation?.id} onSend={onSend} onSendAttachment={onSendAttachment} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />

      {/* Quick Lead Drawer */}
      <QuickLeadDrawer
        open={leadDrawerOpen}
        onClose={() => setLeadDrawerOpen(false)}
        contactName={c.name}
        contactPhone={c.phone}
        conversationId={c.id}
      />

      {/* ══════════════════════════════════════════════ */}
      {/*  TRANSFER MODAL                               */}
      {/* ══════════════════════════════════════════════ */}
      {transferOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl p-4 w-80 max-h-[400px] flex flex-col" style={{ background: "var(--wa-bg-deeper, #1a1d21)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--wa-text-primary)" }}>Transferir conversa</h3>
              <button onClick={() => setTransferOpen(false)} style={{ color: "var(--wa-text-secondary)" }}>
                <X size={16} />
              </button>
            </div>
            {transferLoading ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--wa-text-secondary)" }}>Carregando...</p>
            ) : attendants.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--wa-text-secondary)" }}>Nenhum atendente disponível</p>
            ) : (
              <div className="flex flex-col gap-1 overflow-y-auto">
                {attendants.map((att) => (
                  <button
                    key={att.user_id}
                    onClick={() => doTransfer(att.user_id, att.full_name)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors hover:bg-white/10"
                    style={{ color: "var(--wa-text-primary)" }}
                  >
                    <Headphones size={14} style={{ color: "#FBBF24" }} />
                    {att.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  TAG POPOVER                                  */}
      {/* ══════════════════════════════════════════════ */}
      {tagOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl p-4 w-80 max-h-[400px] flex flex-col" style={{ background: "var(--wa-bg-deeper, #1a1d21)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--wa-text-primary)" }}>Tags</h3>
              <button onClick={() => setTagOpen(false)} style={{ color: "var(--wa-text-secondary)" }}>
                <X size={16} />
              </button>
            </div>
            {tagLoading ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--wa-text-secondary)" }}>Carregando...</p>
            ) : tenantTags.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--wa-text-secondary)" }}>Nenhuma tag configurada</p>
            ) : (
              <div className="flex flex-wrap gap-2 overflow-y-auto">
                {tenantTags.map((tag) => {
                  const isSelected = leadTags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.name)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: isSelected ? tag.color : "transparent",
                        color: isSelected ? "#fff" : tag.color,
                        border: `1.5px solid ${tag.color}`,
                        opacity: isSelected ? 1 : 0.7,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  NOTES POPOVER                                */}
      {/* ══════════════════════════════════════════════ */}
      {notesOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="p-4 w-96 max-h-[500px] flex flex-col bg-card border border-border shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Notas internas</h3>
              <button onClick={() => setNotesOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Note input */}
            <div className="flex gap-2 mb-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escreva uma nota interna..."
                rows={2}
                className="flex-1 px-3 py-2 text-sm resize-none outline-none bg-muted text-foreground border border-border"
              />
              <button
                onClick={saveNote}
                disabled={noteSaving || !noteText.trim()}
                className="self-end px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 bg-primary text-primary-foreground"
              >
                <Send size={14} />
              </button>
            </div>

            {/* Notes list */}
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {notes.length === 0 ? (
                <p className="text-xs text-center py-4 text-muted-foreground">Nenhuma nota ainda</p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="px-3 py-2 bg-muted/50 border border-border"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-primary">
                        {note.user_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {fmtDateTime(note.created_at)}
                      </span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap text-foreground">
                      {note.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
