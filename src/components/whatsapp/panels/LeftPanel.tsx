import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { MessageSquarePlus, MessageCircleX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import WaAvatar from "../shared/Avatar";
import SearchBar from "../left/SearchBar";
import ChannelLegend from "../left/ChannelLegend";
import FilterTabs from "../left/FilterTabs";
import ConversationItem from "../left/ConversationItem";
import NewConversationDialog from "../left/NewConversationDialog";
import type { Conversation } from "@/data/mockConversations";
import type { ChannelType } from "@/components/ui/ChannelIcon";

interface LeftPanelProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewConversationStarted?: (jid: string) => void;
  newConvOpen?: boolean;
  onNewConvOpenChange?: (open: boolean) => void;
  viewMode?: "list" | "kanban";
  onViewModeChange?: (mode: "list" | "kanban") => void;
  onFilterChange?: (filter: string) => void;
  initialFilter?: string;
  onAssignConversation?: (jid: string) => void;
}

export default function LeftPanel({
  conversations, selectedId, onSelect, onNewConversationStarted,
  newConvOpen: externalOpen, onNewConvOpenChange,
  viewMode, onViewModeChange, onFilterChange, initialFilter,
  onAssignConversation,
}: LeftPanelProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(initialFilter || "inbox");
  const [channelFilter, setChannelFilter] = useState<ChannelType | null>(null);
  // Deep search: message content matches from DB (jid → snippet)
  const [deepSearchSnippets, setDeepSearchSnippets] = useState<Map<string, string>>(new Map());
  const deepSearchAbortRef = useRef<AbortController | null>(null);

  const newConvOpen = externalOpen ?? false;
  const setNewConvOpen = (v: boolean) => onNewConvOpenChange?.(v);

  // Sync filter when parent changes it (e.g., InboxTab tabs)
  useEffect(() => {
    if (initialFilter && initialFilter !== filter) setFilter(initialFilter);
  }, [initialFilter]);

  // Notify parent of filter changes
  useEffect(() => { onFilterChange?.(filter); }, [filter, onFilterChange]);

  // Reset viewMode when leaving groups tab
  useEffect(() => {
    if (filter !== "groups" && viewMode === "kanban") {
      onViewModeChange?.("list");
    }
  }, [filter, viewMode, onViewModeChange]);

  // Deep search: query message content when search has 3+ characters
  useEffect(() => {
    if (search.length < 3) {
      setDeepSearchSnippets(new Map());
      return;
    }

    // Cancel previous request
    deepSearchAbortRef.current?.abort();
    const controller = new AbortController();
    deepSearchAbortRef.current = controller;

    (async () => {
      const { data: msgMatches } = await supabase
        .from("whatsapp_messages")
        .select("remote_jid, body")
        .ilike("body", `%${search}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (controller.signal.aborted) return;

      const snippetMap = new Map<string, string>();
      for (const m of msgMatches ?? []) {
        if (!snippetMap.has(m.remote_jid) && m.body) {
          snippetMap.set(m.remote_jid, m.body);
        }
      }
      setDeepSearchSnippets(snippetMap);
    })();

    return () => { controller.abort(); };
  }, [search]);

  const filtered = useMemo(() => {
    let list = conversations;
    if (search && search.length >= 2) {
      const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // Client-side filter: name, phone, lastMessage
      const namePhoneMatches = new Set<string>();
      list = list.filter((c) => {
        const name = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const phone = c.phone || "";
        const msg = (c.lastMessage || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matched = name.includes(q) || phone.includes(q) || msg.includes(q);
        if (matched) namePhoneMatches.add(c.id);
        return matched;
      });

      // Merge deep search results (conversations found via message content)
      if (deepSearchSnippets.size > 0) {
        const existingIds = new Set(list.map((c) => c.id));
        for (const [jid, snippet] of deepSearchSnippets) {
          if (!existingIds.has(jid)) {
            const conv = conversations.find((c) => c.id === jid);
            if (conv) {
              list.push({ ...conv, searchSnippet: snippet });
              existingIds.add(jid);
            }
          } else if (!namePhoneMatches.has(jid)) {
            // Found by name/phone but also has message match — add snippet
            list = list.map((c) => c.id === jid ? { ...c, searchSnippet: snippet } : c);
          }
        }
      }
    }
    // Queue-based flow (1:1 contacts only in inbox/queue):
    if (filter === "inbox") list = list.filter((c) => !c.isGroup && !!c.assignedTo && c.status !== "resolved");
    if (filter === "queue") list = list.filter((c) => !c.isGroup && !c.assignedTo && c.status !== "resolved");
    // Groups-only filters (used by dedicated Groups area — same layout, filtered data)
    if (filter === "groups") list = list.filter((c) => c.isGroup);
    if (filter === "groups_inbox") list = list.filter((c) => c.isGroup && !!c.assignedTo && c.status !== "resolved");
    if (filter === "groups_queue") list = list.filter((c) => c.isGroup && !c.assignedTo && c.status !== "resolved");
    if (filter === "groups_resolved") list = list.filter((c) => c.isGroup && c.status === "resolved");
    // Resolved (1:1 only)
    if (filter === "resolved") list = list.filter((c) => !c.isGroup && c.status === "resolved");
    // Channel filter (WA Web, Cloud API, IG, etc.)
    if (channelFilter) list = list.filter((c) => c.channel === channelFilter);

    // Priority sort for "Em atendimento": recently-assigned conversations go to top
    if (filter === "inbox") {
      const PRIORITY_WINDOW = 10 * 60 * 1000; // 10 minutes
      const now = Date.now();
      list = [...list].sort((a, b) => {
        const aAssigned = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
        const bAssigned = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
        const aRecent = (now - aAssigned) < PRIORITY_WINDOW;
        const bRecent = (now - bAssigned) < PRIORITY_WINDOW;
        // Recently assigned first, then by assignedAt desc
        if (aRecent && !bRecent) return -1;
        if (!aRecent && bRecent) return 1;
        if (aRecent && bRecent) return bAssigned - aAssigned;
        // Fallback: keep original order (by lastMessageTime)
        return 0;
      });
    }

    return list;
  }, [conversations, search, filter, deepSearchSnippets, channelFilter]);

  const inboxCount = conversations.filter((c) => !c.isGroup && !!c.assignedTo && c.status !== "resolved").length;
  const queueCount = conversations.filter((c) => !c.isGroup && !c.assignedTo && c.status !== "resolved").length;
  const groupCount = conversations.filter((c) => c.isGroup).length;
  const resolvedCount = conversations.filter((c) => c.status === "resolved").length;

  return (
    <div className="flex flex-col h-full msg-left-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 shrink-0 glass-header" style={{ height: 56 }}>
        <WaAvatar initials="AZ" color="#00A884" size={32} />
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button style={{ color: "var(--text-secondary)" }} onClick={() => setNewConvOpen(true)}>
                <MessageSquarePlus size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Nova conversa</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <ChannelLegend activeChannel={channelFilter} onChannelFilter={setChannelFilter} />

      <FilterTabs
        active={filter}
        onChange={setFilter}
        totalCount={inboxCount}
        unreadCount={queueCount}
        groupCount={groupCount}
        resolvedCount={resolvedCount}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <MessageCircleX size={28} className="text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filtered.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              isSelected={selectedId === c.id}
              onClick={() => onSelect(c.id)}
              isQueueMode={!c.isGroup && (filter === "queue" || !c.assignedTo)}
              onAssign={!c.isGroup && onAssignConversation ? () => onAssignConversation(c.id) : undefined}
              searchQuery={search.length >= 3 ? search : undefined}
              showTags={filter === "queue" || filter === "groups_queue"}
            />
          ))
        )}
      </div>

      <NewConversationDialog
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onConversationStarted={(jid) => { onNewConversationStarted?.(jid); onSelect(jid); }}
      />
    </div>
  );
}
