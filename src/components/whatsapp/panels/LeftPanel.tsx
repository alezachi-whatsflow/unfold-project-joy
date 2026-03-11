import { useState, useMemo } from "react";
import { MessageSquarePlus, Users, MoreVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import WaAvatar from "../shared/Avatar";
import SearchBar from "../left/SearchBar";
import FilterTabs from "../left/FilterTabs";
import ConversationItem from "../left/ConversationItem";
import type { Conversation } from "@/data/mockConversations";

interface LeftPanelProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function LeftPanel({ conversations, selectedId, onSelect }: LeftPanelProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("inbox");

  const filtered = useMemo(() => {
    let list = conversations;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    if (filter === "inbox") list = list.filter((c) => c.status === "open" || c.status === "pending");
    if (filter === "queue") list = list.filter((c) => !c.assignedTo);
    if (filter === "groups") list = list.filter((c) => c.isGroup);
    if (filter === "resolved") list = list.filter((c) => c.status === "resolved");
    return list;
  }, [conversations, search, filter]);

  const unreadCount = conversations.reduce((a, c) => a + (c.unreadCount > 0 ? 1 : 0), 0);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "var(--wa-bg-panel)", borderRight: "1px solid var(--wa-border)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 60, backgroundColor: "var(--wa-bg-header)" }}
      >
        <WaAvatar initials="AZ" color="#00A884" size={32} />
        <div className="flex items-center gap-4">
          {[
            { Icon: MessageSquarePlus, label: "Nova conversa" },
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
      <FilterTabs active={filter} onChange={setFilter} totalCount={conversations.length} unreadCount={unreadCount} />

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
    </div>
  );
}
