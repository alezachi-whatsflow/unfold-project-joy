import { useState, useMemo } from "react";
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
}

export default function LeftPanel({ conversations, selectedId, onSelect, onNewConversationStarted, newConvOpen: externalOpen, onNewConvOpenChange }: LeftPanelProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("inbox");

  const newConvOpen = externalOpen ?? false;
  const setNewConvOpen = (v: boolean) => onNewConvOpenChange?.(v);

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

  const handleNewConvStarted = (jid: string) => {
    onNewConversationStarted?.(jid);
    onSelect(jid);
  };

  return (
    <div className="relative flex flex-col h-full msg-left-panel">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 shrink-0 glass-header"
        style={{ height: 56 }}
      >
        <WaAvatar initials="AZ" color="#00A884" size={32} />
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="transition-colors"
                style={{ color: "var(--wa-text-secondary)" }}
                onClick={() => setNewConvOpen(true)}
              >
                <MessageSquarePlus size={22} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Nova conversa</TooltipContent>
          </Tooltip>
          {[
            { Icon: Users, label: "Nova comunidade" },
            { Icon: MoreVertical, label: "Mais opções" },
          ].map(({ Icon, label }, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <button className="transition-colors" style={{ color: "var(--wa-text-secondary)" }}>
                  <Icon size={22} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} />
      <FilterTabs active={filter} onChange={setFilter} totalCount={inboxCount} unreadCount={queueCount} groupCount={groupCount} resolvedCount={resolvedCount} />

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((c) => (
          <ConversationItem
            key={c.id}
            conversation={c}
            isSelected={selectedId === c.id}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onConversationStarted={handleNewConvStarted}
      />
    </div>
  );
}
