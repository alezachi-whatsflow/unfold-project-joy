import { useState, useMemo, useEffect } from "react";
import { MessageSquarePlus, Users, MoreVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import WaAvatar from "../shared/Avatar";
import SearchBar from "../left/SearchBar";
import FilterTabs from "../left/FilterTabs";
import ConversationItem from "../left/ConversationItem";
import NewConversationDialog from "../left/NewConversationDialog";
import type { Conversation } from "@/data/mockConversations";

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
}

export default function LeftPanel({
  conversations, selectedId, onSelect, onNewConversationStarted,
  newConvOpen: externalOpen, onNewConvOpenChange,
  viewMode, onViewModeChange, onFilterChange, initialFilter,
}: LeftPanelProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(initialFilter || "inbox");

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

  const filtered = useMemo(() => {
    let list = conversations;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    if (filter === "inbox") list = list.filter((c) => !c.isGroup && (c.status === "open" || c.status === "pending"));
    if (filter === "queue") list = list.filter((c) => !c.isGroup && !c.assignedTo);
    if (filter === "groups") list = list.filter((c) => c.isGroup);
    if (filter === "resolved") list = list.filter((c) => c.status === "resolved");
    return list;
  }, [conversations, search, filter]);

  const inboxCount = conversations.filter((c) => !c.isGroup && (c.status === "open" || c.status === "pending")).length;
  const queueCount = conversations.filter((c) => !c.isGroup && !c.assignedTo).length;
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
          <p className="text-center text-xs py-8" style={{ color: "var(--text-muted)" }}>
            Nenhuma conversa encontrada
          </p>
        ) : (
          filtered.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              isSelected={selectedId === c.id}
              onClick={() => onSelect(c.id)}
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
