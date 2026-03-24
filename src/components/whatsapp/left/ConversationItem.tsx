import React from "react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/data/mockConversations";
import WaAvatar from "../shared/Avatar";
import TagBadge from "../shared/TagBadge";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const ConversationItem = React.memo(function ConversationItem({ conversation: c, isSelected, onClick }: ConversationItemProps) {
  const prefixMap: Record<string, string> = {
    audio: "🎙 Áudio",
    document: "📎 Documento",
    image: "📷 Foto",
    system: "",
  };
  const prefix = prefixMap[c.lastMessageType] || "";
  const previewText = prefix ? `${prefix} ${c.lastMessage}` : c.lastMessage;

  return (
    <button
      onClick={onClick}
      className={cn("msg-conv-item w-full flex gap-3 text-left", isSelected && "active")}
    >
      <WaAvatar initials={c.avatarInitials} color={c.avatarColor} size={36} isOnline={c.isOnline} imageUrl={c.avatarUrl} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="conv-name truncate">{c.name}</span>
          <span className={cn("conv-time shrink-0 ml-2", c.unreadCount > 0 && "!text-primary")}>
            {c.lastMessageTime}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span
            className="conv-preview truncate"
            style={{ fontStyle: c.lastMessageType === "system" ? "italic" : "normal" }}
          >
            {previewText}
          </span>
          {c.unreadCount > 0 && (
            <span className="conv-badge shrink-0 ml-2">{c.unreadCount}</span>
          )}
        </div>
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
