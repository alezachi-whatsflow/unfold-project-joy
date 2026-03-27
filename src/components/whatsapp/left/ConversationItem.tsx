import React from "react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/data/mockConversations";
import WaAvatar from "../shared/Avatar";
import TagBadge from "../shared/TagBadge";
import { ChannelIcon } from "@/components/ui/ChannelIcon";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const ConversationItem = React.memo(function ConversationItem({ conversation: c, isSelected, onClick }: ConversationItemProps) {
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
        {/* Line 1: Name + Time */}
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-[13px] font-medium text-foreground truncate">{c.name}</span>
          <span className={cn("text-[10px] flex-shrink-0", c.unreadCount > 0 ? "text-[#11bc76]" : "text-muted-foreground")}>
            {c.lastMessageTime}
          </span>
        </div>

        {/* Line 2: Message preview */}
        <span
          className="text-[11px] text-muted-foreground truncate block mt-0.5"
          style={{ fontStyle: c.lastMessageType === "system" ? "italic" : "normal" }}
        >
          {previewText}
        </span>

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
