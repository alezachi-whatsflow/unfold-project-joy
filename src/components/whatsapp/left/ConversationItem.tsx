import React from "react";
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
      className="conv-item w-full flex gap-3 text-left"
      style={{
        padding: "10px 12px",
        backgroundColor: isSelected ? "var(--wa-bg-selected)" : "transparent",
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget.style.backgroundColor = "var(--wa-bg-hover)"); }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget.style.backgroundColor = "transparent"); }}
    >
      <WaAvatar initials={c.avatarInitials} color={c.avatarColor} size={49} isOnline={c.isOnline} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium truncate" style={{ color: "var(--wa-text-primary)" }}>
            {c.name}
          </span>
          <span
            className="text-xs shrink-0 ml-2"
            style={{ color: c.unreadCount > 0 ? "var(--wa-green)" : "var(--wa-text-secondary)" }}
          >
            {c.lastMessageTime}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span
            className="text-sm truncate"
            style={{
              color: "var(--wa-text-secondary)",
              fontStyle: c.lastMessageType === "system" ? "italic" : "normal",
            }}
          >
            {previewText}
          </span>
          {c.unreadCount > 0 && (
            <span
              className="shrink-0 ml-2 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{
                backgroundColor: "var(--wa-green)",
                color: "#fff",
                minWidth: 20,
                height: 20,
                padding: "0 5px",
              }}
            >
              {c.unreadCount}
            </span>
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
