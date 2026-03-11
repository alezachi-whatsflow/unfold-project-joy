import { useState, useMemo } from "react";
import { MessageSquarePlus, Users, MoreVertical } from "lucide-react";
import WaAvatar from "../shared/Avatar";
import SearchBar from "./SearchBar";
import FilterTabs from "./FilterTabs";
import ConversationItem from "./ConversationItem";
import type { Conversation } from "@/data/mockConversations";

interface LeftPanelProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function LeftPanel({ conversations, selectedId, onSelect }: LeftPanelProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = conversations;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    if (filter === "unread") list = list.filter((c) => c.unreadCount > 0);
    if (filter === "unassigned") list = list.filter((c) => !c.assignedTo);
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
          {[MessageSquarePlus, Users, MoreVertical].map((Icon, i) => (
            <button key={i} className="transition-colors" style={{ color: "var(--wa-text-secondary)" }} aria-label="action">
              <Icon size={22} />
            </button>
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
