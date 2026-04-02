import React from "react";
import { cn } from "@/lib/utils";
import { Headphones, AlertTriangle, Search } from "lucide-react";
import type { Conversation } from "@/data/mockConversations";
import WaAvatar from "../shared/Avatar";
import TagBadge from "../shared/TagBadge";
import { ChannelIcon } from "@/components/ui/ChannelIcon";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  /** When true, shows "Iniciar Atendimento" button */
  isQueueMode?: boolean;
  /** Called when agent clicks "Iniciar Atendimento" */
  onAssign?: () => void;
  /** Active search query for snippet highlighting */
  searchQuery?: string;
}

/** Highlight search term within a text string */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-400/40 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const ConversationItem = React.memo(function ConversationItem({ conversation: c, isSelected, onClick, isQueueMode, onAssign, searchQuery }: ConversationItemProps) {
  const prefixMap: Record<string, string> = {
    audio: "\uD83C\uDFB5 Áudio",
    document: "\uD83D\uDCCE Documento",
    image: "\uD83D\uDCF7 Foto",
    video: "\uD83C\uDFAC Vídeo",
    system: "",
  };
  const prefix = prefixMap[c.lastMessageType] || "";
  const previewText = prefix ? `${prefix} ${c.lastMessage}` : c.lastMessage;

  const unreadDisplay = c.unreadCount > 99 ? "99+" : c.unreadCount;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex gap-3 text-left overflow-hidden px-4 py-3 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors",
        isSelected && "bg-muted/80"
      )}
    >
      {/* Avatar block — 42×42 relative container */}
      <div className="relative shrink-0" style={{ width: 42, height: 42 }}>
        <WaAvatar initials={c.avatarInitials} color={c.avatarColor} size={42} isOnline={false} imageUrl={c.avatarUrl} />

        {/* Unread badge — top LEFT */}
        {c.unreadCount > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] rounded-full bg-[#11bc76] text-[9px] font-semibold text-white flex items-center justify-center px-1 ring-2 ring-background z-10">
            {unreadDisplay}
          </span>
        )}

        {/* Channel badge — bottom RIGHT */}
        {c.channel && (
          <ChannelIcon channel={c.channel} size="sm" variant="badge" tooltip className="absolute -bottom-0.5 -right-0.5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Line 1: Name + Time/Action */}
        <div className="flex items-center justify-between gap-1 overflow-hidden">
          <span className="text-[13px] font-medium text-foreground truncate">{c.name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {isQueueMode && onAssign ? (
              <button
                onClick={(e) => { e.stopPropagation(); onAssign(); }}
                className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 transition-colors whitespace-nowrap"
                style={{
                  background: "#0E8A5C",
                  color: "#FFFFFF",
                  border: "none",
                }}
              >
                <Headphones size={9} />
                Atender
              </button>
            ) : (
              <span className={cn("text-[10px]", c.unreadCount > 0 ? "text-[#11bc76]" : "text-muted-foreground")}>
                {c.lastMessageTime}
              </span>
            )}
          </div>
        </div>

        {/* Line 2: Message preview */}
        <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
          {c.slaBreach && (
            <AlertTriangle size={11} className="shrink-0 text-red-500" title="SLA excedido" />
          )}
          <span
            className="text-[11px] text-muted-foreground truncate flex-1"
            style={{ fontStyle: c.lastMessageType === "system" ? "italic" : "normal" }}
          >
            {previewText}
          </span>
          {isQueueMode && (
            <span className="text-[9px] text-muted-foreground shrink-0">{c.lastMessageTime}</span>
          )}
        </div>

        {/* Search snippet: shown when conversation was found via message content search */}
        {c.searchSnippet && searchQuery && (
          <div className="flex items-center gap-1 mt-0.5">
            <Search size={9} className="shrink-0 text-muted-foreground/60" />
            <span className="text-[10px] text-muted-foreground/80 truncate flex-1">
              {highlightMatch(
                c.searchSnippet.length > 80 ? c.searchSnippet.slice(0, 80) + "..." : c.searchSnippet,
                searchQuery
              )}
            </span>
          </div>
        )}

        {/* Tags */}
        {c.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {c.tags.map((tag, i) => (
              <TagBadge key={i} label={tag.label} color={tag.color} />
            ))}
          </div>
        )}
      </div>
    </button>
  );
});

export default ConversationItem;
