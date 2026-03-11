import React from "react";
import type { Message } from "@/data/mockMessages";
import TickIcons from "../shared/TickIcons";
import { Play, Mic } from "lucide-react";
import WaAvatar from "../shared/Avatar";
import { RefreshCw } from "lucide-react";

// Simple hash for sender name colors
function nameColor(name: string): string {
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#82E0AA", "#AED6F1"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
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
          className="max-w-[400px] w-full text-center rounded-lg px-4 py-3"
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
          className="text-xs px-3 py-1 rounded-lg"
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
        <div className="rounded-lg px-4 py-3 flex gap-1 items-center" style={{ backgroundColor: "var(--wa-bg-msg-in)" }}>
          <span className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: "var(--wa-text-secondary)" }} />
          <span className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: "var(--wa-text-secondary)" }} />
          <span className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: "var(--wa-text-secondary)" }} />
        </div>
      </div>
    );
  }

  // Audio message
  if (m.type === "audio") {
    return (
      <div className={`message-bubble flex ${isOut ? "justify-end" : "justify-start"} px-5 my-1`}>
        <div
          className="flex items-center gap-3 px-4 py-2 max-w-[65%]"
          style={{
            backgroundColor: isOut ? "var(--wa-bg-msg-out)" : "var(--wa-bg-msg-in)",
            borderRadius: isOut ? "8px 0px 8px 8px" : "0px 8px 8px 8px",
          }}
        >
          <button aria-label="Play audio" style={{ color: "var(--wa-text-primary)" }}>
            <Play size={20} fill="currentColor" />
          </button>
          {/* Waveform mock */}
          <div className="flex items-center gap-[2px] flex-1">
            {[3, 5, 8, 12, 7, 10, 14, 6, 9, 4, 11, 8, 5, 13, 7, 10, 3, 8, 6, 11].map((h, i) => (
              <div key={i} className="rounded-full" style={{ width: 3, height: h, backgroundColor: "var(--wa-text-secondary)", opacity: 0.7 }} />
            ))}
          </div>
          <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.45)" }}>{m.audioDuration}</span>
          {m.senderName && (
            <WaAvatar initials={m.senderName.charAt(0)} color={nameColor(m.senderName)} size={25} />
          )}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              {m.timestamp.split(" ")[1]}
            </span>
            {isOut && <TickIcons status={m.status} />}
          </div>
        </div>
      </div>
    );
  }

  // Image message
  if (m.type === "image") {
    return (
      <div className={`message-bubble flex ${isOut ? "justify-end" : "justify-start"} px-5 my-1`}>
        <div
          className="max-w-[65%] overflow-hidden"
          style={{
            backgroundColor: isOut ? "var(--wa-bg-msg-out)" : "var(--wa-bg-msg-in)",
            borderRadius: isOut ? "8px 0px 8px 8px" : "0px 8px 8px 8px",
          }}
        >
          {m.mediaUrl ? (
            <img
              src={m.mediaUrl}
              alt={m.caption || "Imagem"}
              className="w-full max-h-[300px] object-cover cursor-pointer"
              onClick={() => window.open(m.mediaUrl!, "_blank")}
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-[150px] bg-black/20">
              <span className="text-xs" style={{ color: "var(--wa-text-secondary)" }}>📷 Imagem</span>
            </div>
          )}
          {(m.caption || m.content) && m.content !== "[image]" && m.content !== "[ImageMessage]" && (
            <p className="text-[14.5px] leading-5 whitespace-pre-wrap px-2.5 pt-1" style={{ color: "var(--wa-text-primary)" }}>
              {m.caption || m.content}
            </p>
          )}
          <div className="flex items-center justify-end gap-1 px-2.5 pb-1">
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              {m.timestamp.split(" ")[1]}
            </span>
            {isOut && <TickIcons status={m.status} />}
          </div>
        </div>
      </div>
    );
  }

  // Video message
  if (m.type === "video") {
    return (
      <div className={`message-bubble flex ${isOut ? "justify-end" : "justify-start"} px-5 my-1`}>
        <div
          className="max-w-[65%] overflow-hidden"
          style={{
            backgroundColor: isOut ? "var(--wa-bg-msg-out)" : "var(--wa-bg-msg-in)",
            borderRadius: isOut ? "8px 0px 8px 8px" : "0px 8px 8px 8px",
          }}
        >
          {m.mediaUrl ? (
            <video
              src={m.mediaUrl}
              controls
              className="w-full max-h-[300px]"
            />
          ) : (
            <div className="flex items-center justify-center h-[150px] bg-black/20">
              <span className="text-xs" style={{ color: "var(--wa-text-secondary)" }}>🎥 Vídeo</span>
            </div>
          )}
          {m.caption && (
            <p className="text-[14.5px] leading-5 whitespace-pre-wrap px-2.5 pt-1" style={{ color: "var(--wa-text-primary)" }}>
              {m.caption}
            </p>
          )}
          <div className="flex items-center justify-end gap-1 px-2.5 pb-1">
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              {m.timestamp.split(" ")[1]}
            </span>
            {isOut && <TickIcons status={m.status} />}
          </div>
        </div>
      </div>
    );
  }

  // Document message
  if (m.type === "document") {
    return (
      <div className={`message-bubble flex ${isOut ? "justify-end" : "justify-start"} px-5 my-1`}>
        <div
          className="max-w-[65%] px-2.5 pt-1.5 pb-1"
          style={{
            backgroundColor: isOut ? "var(--wa-bg-msg-out)" : "var(--wa-bg-msg-in)",
            borderRadius: isOut ? "8px 0px 8px 8px" : "0px 8px 8px 8px",
          }}
        >
          <div
            className="flex items-center gap-2 p-2 rounded cursor-pointer"
            style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
            onClick={() => m.mediaUrl && window.open(m.mediaUrl, "_blank")}
          >
            <span className="text-2xl">📄</span>
            <span className="text-sm truncate" style={{ color: "var(--wa-text-primary)" }}>
              {m.caption || m.content || "Documento"}
            </span>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              {m.timestamp.split(" ")[1]}
            </span>
            {isOut && <TickIcons status={m.status} />}
          </div>
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

  // Text message
  return (
    <div className={`message-bubble flex ${isOut ? "justify-end" : "justify-start"} px-5 my-1`}>
      <div
        className="max-w-[65%] px-2.5 pt-1.5 pb-1"
        style={{
          backgroundColor: isOut ? "var(--wa-bg-msg-out)" : "var(--wa-bg-msg-in)",
          borderRadius: isOut ? "8px 0px 8px 8px" : "0px 8px 8px 8px",
        }}
      >
        {showSender && m.senderName && isOut && (
          <p className="text-xs font-semibold mb-0.5" style={{ color: nameColor(m.senderName) }}>
            {m.senderName}
          </p>
        )}
        {replyBlock}
        <p className="text-[14.5px] leading-5 whitespace-pre-wrap" style={{ color: "var(--wa-text-primary)" }}>
          {m.content}
          <span className="inline-flex items-center gap-1 ml-2 align-bottom float-right mt-1">
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              {m.timestamp.split(" ")[1]}
            </span>
            {isOut && <TickIcons status={m.status} />}
          </span>
        </p>
      </div>
    </div>
  );
});

export default MessageBubble;
