import React from "react";
import type { Message } from "@/data/mockMessages";
import TickIcons from "../shared/TickIcons";
import { Play, Mic } from "lucide-react";
import WaAvatar from "../shared/Avatar";
import { RefreshCw } from "lucide-react";
import { getMessageRenderer } from "./MessageRenderers";

// Simple hash for sender name colors
function nameColor(name: string): string {
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#82E0AA", "#AED6F1"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

// Format timestamp: returns as-is if already formatted (DD/MM/YYYY HH:MM)
// or parses ISO dates into that format
function formatMsgTime(ts: string): string {
  if (!ts) return "";
  // Already formatted as "DD/MM/YYYY HH:MM" — return as-is
  if (/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}$/.test(ts)) return ts;
  // Try parsing ISO format
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch {
    return ts;
  }
}

interface MessageBubbleProps {
  message: Message;
  showSender: boolean;
}

const MessageBubble = React.memo(function MessageBubble({ message: m, showSender }: MessageBubbleProps) {
  // Transfer message
  if (m.type === "transfer") {
    return (
      <div className="message-bubble flex justify-center my-2 px-5">
        <div
          className="max-w-[400px] w-full text-center px-4 py-3"
          style={{
            backgroundColor: "rgba(0,168,132,0.1)",
            border: "1px solid rgba(0,168,132,0.3)",
            color: "var(--wa-green)",
          }}
        >
          <RefreshCw size={16} className="mx-auto mb-1" />
          {m.content.split("\n").map((line, i) => (
            <p key={i} className="text-sm">{line}</p>
          ))}
        </div>
      </div>
    );
  }

  // System message
  if (m.type === "system") {
    return (
      <div className="message-bubble flex justify-center my-2">
        <span
          className="text-xs px-3 py-1"
          style={{ backgroundColor: "var(--wa-bg-system)", color: "var(--wa-text-secondary)" }}
        >
          {m.content}
        </span>
      </div>
    );
  }

  const isOut = m.direction === "outgoing";

  // Typing indicator
  if (m.direction === "typing") {
    return (
      <div className="message-bubble flex justify-start px-5 my-1">
        <div className="px-4 py-3 flex gap-1 items-center" style={{ backgroundColor: "var(--wa-bg-msg-in)" }}>
          <span className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: "var(--wa-text-secondary)" }} />
          <span className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: "var(--wa-text-secondary)" }} />
          <span className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: "var(--wa-text-secondary)" }} />
        </div>
      </div>
    );
  }

  // Reply preview
  const replyBlock = m.replyTo ? (
    <div className="mb-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: "rgba(0,0,0,0.2)", borderLeft: "3px solid var(--wa-green)" }}>
      <span className="font-semibold" style={{ color: "var(--wa-green)" }}>{m.replyTo.senderName}</span>
      <p className="truncate" style={{ color: "var(--wa-text-secondary)" }}>{m.replyTo.content}</p>
    </div>
  ) : null;

  // Schema-driven content renderer
  const Renderer = getMessageRenderer(m.type);

  return (
    <div className={`message-bubble flex ${isOut ? "justify-end" : "justify-start"} px-5 my-1`}>
      <div
        className="max-w-[65%] min-w-0 px-2.5 pt-1.5 pb-1 overflow-hidden break-words"
        style={{
          backgroundColor: isOut ? "var(--wa-bg-msg-out)" : "var(--wa-bg-msg-in)",
          borderRadius: isOut ? "8px 0px 8px 8px" : "0px 8px 8px 8px",
        }}
      >
        {showSender && m.senderName && (
          <p className="text-xs font-semibold mb-0.5" style={{ color: nameColor(m.senderName) }}>
            {m.senderName}
          </p>
        )}
        {replyBlock}
        <div style={{ color: "var(--wa-text-primary)" }}>
          <Renderer message={m} nameColor={m.senderName ? nameColor(m.senderName) : undefined} formatTime={formatMsgTime} />
        </div>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[10px]" style={{ color: "var(--wa-text-tertiary)" }}>
            {formatMsgTime(m.timestamp)}
          </span>
          {isOut && <TickIcons status={m.status} />}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
