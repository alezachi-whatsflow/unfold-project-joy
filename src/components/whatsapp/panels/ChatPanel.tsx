import { useState, useMemo } from "react";
import { Video, Phone, Search, MoreVertical, PanelRightOpen, PanelRightClose, RefreshCw, CheckCircle2, Bot, Tag, StickyNote, MoreHorizontal, Lock } from "lucide-react";
import type { Conversation } from "@/data/mockConversations";
import type { Message } from "@/data/mockMessages";
import WaAvatar from "../shared/Avatar";
import TagBadge from "../shared/TagBadge";
import MessageList from "../chat/MessageList";
import ChatInput, { type AttachmentPayload } from "../chat/ChatInput";

interface ChatPanelProps {
  conversation: Conversation | null;
  messages: Message[];
  isRightOpen: boolean;
  onToggleRight: () => void;
  onSend: (text: string) => void;
  onSendAttachment?: (payload: AttachmentPayload) => Promise<void>;
  onNewConversation?: () => void;
}

// Quick action chips
const quickActions = [
  { id: "transfer", label: "Transferir", icon: RefreshCw, bg: "rgba(245,158,11,0.2)", text: "#FBBF24", border: "rgba(245,158,11,0.4)" },
  { id: "resolve", label: "Resolver", icon: CheckCircle2, bg: "rgba(16,185,129,0.2)", text: "#34D399", border: "rgba(16,185,129,0.4)" },
  { id: "ai", label: "IA: ON", icon: Bot, bg: "rgba(124,58,237,0.2)", text: "#A78BFA", border: "rgba(124,58,237,0.4)" },
  { id: "tag", label: "Tag", icon: Tag, bg: "rgba(14,165,233,0.15)", text: "#38BDF8", border: "rgba(14,165,233,0.4)" },
  { id: "notes", label: "Notas", icon: StickyNote, bg: "rgba(100,116,139,0.15)", text: "#94A3B8", border: "rgba(100,116,139,0.4)" },
  { id: "more", label: "Mais", icon: MoreHorizontal, bg: "rgba(100,116,139,0.1)", text: "#8696A0", border: "rgba(100,116,139,0.3)" },
];

export default function ChatPanel({ conversation, messages, isRightOpen, onToggleRight, onSend, onSendAttachment }: ChatPanelProps) {
  const [replyTo, setReplyTo] = useState<{ senderName: string; content: string } | null>(null);

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center chat-wallpaper min-w-0">
        <Lock size={48} style={{ color: "var(--wa-border-input)" }} />
        <p className="mt-4 text-lg font-light" style={{ color: "var(--wa-text-secondary)" }}>
          Suas mensagens são protegidas com<br />criptografia de ponta a ponta
        </p>
        <button
          className="mt-6 px-6 py-2 rounded-full border text-sm font-medium"
          style={{ borderColor: "var(--wa-green)", color: "var(--wa-green)" }}
        >
          + Nova Conversa
        </button>
      </div>
    );
  }

  const c = conversation;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Chat Header */}
      <div style={{ backgroundColor: "var(--wa-bg-header)", borderBottom: "1px solid var(--wa-border)" }}>
        <div className="flex items-center justify-between px-4" style={{ height: 60 }}>
          <div className="flex items-center gap-3 min-w-0">
            <WaAvatar initials={c.avatarInitials} color={c.avatarColor} size={40} isOnline={c.isOnline} />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold truncate" style={{ color: "var(--wa-text-primary)" }}>{c.name}</p>
              <p className="text-[13px]" style={{ color: "var(--wa-text-secondary)" }}>
                {c.isGroup
                  ? `Grupo${c.participantCount ? ` · ${c.participantCount} participantes` : ""}`
                  : c.isOnline ? "online" : "visto por último recentemente"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {c.tags.map((tag, i) => <TagBadge key={i} label={tag.label} color={tag.color} />)}
          </div>
          <div className="flex items-center gap-4 ml-4">
            {[Video, Phone, Search].map((Icon, i) => (
              <button key={i} style={{ color: "var(--wa-text-secondary)" }} className="hover:brightness-150 transition-all" aria-label="action">
                <Icon size={22} />
              </button>
            ))}
            <button onClick={onToggleRight} style={{ color: "var(--wa-text-secondary)" }} className="hover:brightness-150 transition-all" aria-label="Toggle painel">
              {isRightOpen ? <PanelRightClose size={22} /> : <PanelRightOpen size={22} />}
            </button>
            <button style={{ color: "var(--wa-text-secondary)" }} aria-label="Mais opções">
              <MoreVertical size={22} />
            </button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto" style={{ backgroundColor: "#182229", height: 36 }}>
          {quickActions.map((a) => (
            <button
              key={a.id}
              className="flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-medium shrink-0"
              style={{ backgroundColor: a.bg, color: a.text, border: `1px solid ${a.border}` }}
            >
              <a.icon size={13} />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Input */}
      <ChatInput onSend={onSend} onSendAttachment={onSendAttachment} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
    </div>
  );
}
