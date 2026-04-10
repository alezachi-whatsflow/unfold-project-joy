import React from "react";
import type { Message } from "@/data/mockMessages";
import TickIcons from "../shared/TickIcons";
import { Play, Mic, RefreshCw, Ban } from "lucide-react";
import WaAvatar from "../shared/Avatar";
import { getMessageRenderer } from "./MessageRenderers";
import MessageContextMenu from "./MessageContextMenu";

import { fmtDateTime } from "@/lib/dateUtils";

// Simple hash for sender name colors
function nameColor(name: string): string {
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#82E0AA", "#AED6F1"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function formatMsgTime(ts: string): string {
  if (!ts) return "";
  if (/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}$/.test(ts)) return ts;
  return fmtDateTime(ts);
}

interface MessageBubbleProps {
  message: Message;
  showSender: boolean;
  onReply?: (msg: Message) => void;
  onReact?: (msgId: string, emoji: string) => void;
  onForward?: (msg: Message) => void;
  onDelete?: (msgId: string) => void;
  onPin?: (msgId: string) => void;
  onStar?: (msgId: string) => void;
  onAddToNotes?: (msg: Message) => void;
}

const MessageBubble = React.memo(function MessageBubble({
  message: m, showSender,
  onReply, onReact, onForward, onDelete, onPin, onStar, onAddToNotes,
}: MessageBubbleProps) {
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
  const isDeleted = (m as any).isDeleted === true;
  const deletedByName = (m as any).deletedByName || null;
  const deletedAt = (m as any).deletedAt || null;

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
    <div className={`message-bubble flex ${isOut ? "justify-end" : "justify-start"} px-5 my-1 group`}>
      <div className="relative max-w-[65%] min-w-0">
        {/* Context menu */}
        <MessageContextMenu
          message={m}
          isOutgoing={isOut}
          onReply={onReply}
          onReact={onReact}
          onForward={onForward}
          onDelete={onDelete}
          onPin={onPin}
          onStar={onStar}
          onAddToNotes={onAddToNotes}
        />

        {/* Bubble */}
        <div
          className="px-2.5 pt-1.5 pb-1 overflow-hidden break-words"
          style={{
            backgroundColor: isDeleted
              ? (isOut ? "rgba(239, 68, 68, 0.06)" : "rgba(239, 68, 68, 0.04)")
              : (isOut ? "var(--wa-bg-msg-out)" : "var(--wa-bg-msg-in)"),
            borderRadius: isOut ? "8px 0px 8px 8px" : "0px 8px 8px 8px",
            border: isDeleted ? "1px solid rgba(239, 68, 68, 0.15)" : undefined,
          }}
        >
          {showSender && m.senderName && (
            <p className="text-xs font-semibold mb-0.5" style={{ color: nameColor(m.senderName) }}>
              {m.senderName}
            </p>
          )}
          {replyBlock}
          <div style={{ color: isDeleted ? "var(--wa-text-secondary)" : "var(--wa-text-primary)", opacity: isDeleted ? 0.7 : 1 }}>
            <Renderer message={m} nameColor={m.senderName ? nameColor(m.senderName) : undefined} formatTime={formatMsgTime} />
          </div>

          {/* Deleted indicator — shows who deleted and when */}
          {isDeleted && (
            <div className="flex items-center gap-1.5 mt-1 pt-1" style={{ borderTop: "1px solid rgba(239, 68, 68, 0.15)" }}>
              <Ban size={11} className="text-red-400/70 shrink-0" />
              <span className="text-[10px] italic" style={{ color: "rgba(239, 68, 68, 0.7)" }}>
                Apagada{deletedByName ? ` por ${deletedByName}` : ""}{deletedAt ? ` • ${deletedAt}` : ""}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-1 mt-0.5">
            <span className="text-[10px]" style={{ color: "var(--wa-text-tertiary)" }}>
              {formatMsgTime(m.timestamp)}
            </span>
            {isOut && <TickIcons status={m.status} />}
          </div>
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
