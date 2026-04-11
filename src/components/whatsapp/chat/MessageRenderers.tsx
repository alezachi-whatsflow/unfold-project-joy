import React from "react";
import type { Message } from "@/data/mockMessages";

// Message renderer registry — maps type to component
export interface MessageRendererProps {
  message: Message;
  nameColor?: string;
  formatTime: (ts: string) => string;
}

// Text renderer — detects WhatsApp bold *name* signature at top
const TextRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  const content = message.content || "";

  // Detect signature at TOP: first line is *Name* (WhatsApp bold format)
  const topSigMatch = content.match(/^\*([^*]+)\*\n\n?([\s\S]*)$/);
  if (topSigMatch) {
    const sigName = topSigMatch[1];
    const body = topSigMatch[2];
    return (
      <div className="whitespace-pre-wrap break-words">
        <span className="block text-[10px] font-bold" style={{ color: "var(--wa-green, hsl(var(--primary)))" }}>{sigName}</span>
        <span className="text-sm">{body}</span>
      </div>
    );
  }

  // Legacy: detect signature at BOTTOM (— Name)
  const bottomSigIndex = content.lastIndexOf("\n\n\u2014 ");
  if (bottomSigIndex > 0) {
    const body = content.slice(0, bottomSigIndex);
    const sig = content.slice(bottomSigIndex + 2);
    return (
      <div className="whitespace-pre-wrap break-words">
        <span className="text-sm">{body}</span>
        <span className="block text-[9px] text-muted-foreground/70 mt-0.5">{sig}</span>
      </div>
    );
  }

  return <p className="text-sm whitespace-pre-wrap break-words">{content}</p>;
};

// Image renderer
const ImageRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <div>
    {message.mediaUrl ? (
      <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={message.mediaUrl}
          alt={message.caption || "Imagem"}
          className="rounded max-w-[240px] max-h-[300px] object-cover cursor-pointer"
          loading="lazy"
        />
      </a>
    ) : (
      <div className="flex items-center justify-center h-[150px] bg-black/20">
        <span className="text-xs" style={{ color: "var(--wa-text-secondary)" }}>📷 Imagem</span>
      </div>
    )}
    {message.caption && (
      <p className="text-sm mt-1 whitespace-pre-wrap break-words">{message.caption}</p>
    )}
    {!message.mediaUrl && message.content && (
      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
    )}
  </div>
);

// Video renderer
const VideoRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <div>
    {message.mediaUrl ? (
      <video
        src={message.mediaUrl}
        controls
        className="rounded max-w-[280px] max-h-[200px]"
        preload="metadata"
      />
    ) : (
      <p className="text-sm text-muted-foreground italic">🎬 Vídeo</p>
    )}
    {message.caption && <p className="text-sm mt-1 whitespace-pre-wrap break-words">{message.caption}</p>}
  </div>
);

// Audio renderer
const AudioRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <div className="flex items-center gap-2 min-w-[200px]">
    {message.mediaUrl ? (
      <audio src={message.mediaUrl} controls className="w-full h-8" preload="metadata" />
    ) : (
      <p className="text-sm text-muted-foreground italic">🎵 Áudio</p>
    )}
  </div>
);

// Document renderer — rich card similar to WhatsApp Web
const DocumentRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  const fileName = message.caption || message.content || "Documento";
  const ext = fileName.split(".").pop()?.toUpperCase() || "DOC";
  const isPdf = ext === "PDF";
  const isSpreadsheet = ["XLS", "XLSX", "CSV"].includes(ext);
  const isPresentation = ["PPT", "PPTX"].includes(ext);

  const iconColor = isPdf ? "#E53935" : isSpreadsheet ? "#43A047" : isPresentation ? "#FB8C00" : "#1E88E5";
  const iconLabel = isPdf ? "PDF" : isSpreadsheet ? "XLS" : isPresentation ? "PPT" : ext;

  return (
    <a
      href={message.mediaUrl || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block no-underline"
      style={{ textDecoration: "none" }}
    >
      <div
        className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:opacity-90"
        style={{
          background: "var(--wa-bg-msg-in, hsl(var(--muted)))",
          border: "1px solid var(--border, rgba(255,255,255,0.1))",
          minWidth: 220,
          maxWidth: 320,
        }}
      >
        {/* File type icon */}
        <div
          className="flex items-center justify-center shrink-0 rounded"
          style={{ width: 40, height: 40, background: iconColor + "20" }}
        >
          <span style={{ color: iconColor, fontSize: 11, fontWeight: 700 }}>{iconLabel}</span>
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--wa-text-primary, hsl(var(--foreground)))" }}>
            {fileName}
          </p>
          <p className="text-[10px]" style={{ color: "var(--wa-text-secondary, hsl(var(--muted-foreground)))" }}>
            {ext} {message.mediaUrl ? "· Clique para baixar" : ""}
          </p>
        </div>

        {/* Download indicator */}
        {message.mediaUrl && (
          <div className="shrink-0" style={{ color: "var(--wa-text-secondary)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
        )}
      </div>
    </a>
  );
};

// Sticker renderer
const StickerRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <div>
    {message.mediaUrl ? (
      <img src={message.mediaUrl} alt="Sticker" className="w-[120px] h-[120px] object-contain" loading="lazy" />
    ) : (
      <p className="text-2xl">🏷️</p>
    )}
  </div>
);

// System message renderer
const SystemRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <p className="text-xs text-muted-foreground italic text-center">{message.content}</p>
);

// Transfer renderer
const TransferRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 rounded px-3 py-2">
    <span>🔄</span>
    <span>{message.content || "Conversa transferida"}</span>
  </div>
);

// Location renderer
const LocationRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--wa-bg-msg-in, hsl(var(--muted)))", border: "1px solid var(--border, rgba(255,255,255,0.1))" }}>
    <span className="text-xl">📍</span>
    <div className="min-w-0">
      <p className="text-sm font-medium" style={{ color: "var(--wa-text-primary)" }}>{message.caption || "Localização"}</p>
      <p className="text-[10px]" style={{ color: "var(--wa-text-secondary)" }}>{message.content || "Localização compartilhada"}</p>
    </div>
  </div>
);

// Contact renderer
const ContactRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--wa-bg-msg-in, hsl(var(--muted)))", border: "1px solid var(--border, rgba(255,255,255,0.1))" }}>
    <span className="text-xl">👤</span>
    <div className="min-w-0">
      <p className="text-sm font-medium" style={{ color: "var(--wa-text-primary)" }}>{message.caption || "Contato"}</p>
      <p className="text-[10px]" style={{ color: "var(--wa-text-secondary)" }}>{message.content || "Contato compartilhado"}</p>
    </div>
  </div>
);

// Reaction renderer
const ReactionRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <span className="text-2xl">{message.content || "❤️"}</span>
);

// Poll renderer
const PollRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--wa-bg-msg-in, hsl(var(--muted)))", border: "1px solid var(--border, rgba(255,255,255,0.1))" }}>
    <span className="text-xl">📊</span>
    <div className="min-w-0">
      <p className="text-sm font-medium" style={{ color: "var(--wa-text-primary)" }}>{message.caption || "Enquete"}</p>
      <p className="text-[10px]" style={{ color: "var(--wa-text-secondary)" }}>{message.content || "Enquete recebida"}</p>
    </div>
  </div>
);

// Fallback for unknown/unsupported types — friendly message instead of raw type
const UnknownRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  if (message.content && !message.content.startsWith("[")) {
    return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>;
  }
  const typeLabels: Record<string, { emoji: string; label: string }> = {
    unsupported: { emoji: "📎", label: "Mensagem não suportada" },
    unknown: { emoji: "📎", label: "Tipo de mensagem não reconhecido" },
    order: { emoji: "🛒", label: "Pedido recebido" },
    product: { emoji: "🏷️", label: "Produto compartilhado" },
    catalog: { emoji: "📋", label: "Catálogo compartilhado" },
    list: { emoji: "📝", label: "Lista interativa" },
    button: { emoji: "🔘", label: "Mensagem com botões" },
    template: { emoji: "📄", label: "Template de mensagem" },
    interactive: { emoji: "💬", label: "Mensagem interativa" },
    ephemeral: { emoji: "⏱️", label: "Mensagem temporária" },
    revoked: { emoji: "🚫", label: "Mensagem apagada" },
  };
  const info = typeLabels[message.type] || { emoji: "📎", label: message.content || `Tipo: ${message.type}` };
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-base">{info.emoji}</span>
      <p className="text-xs italic" style={{ color: "var(--wa-text-secondary, hsl(var(--muted-foreground)))" }}>{info.label}</p>
    </div>
  );
};

// Registry map
const RENDERERS: Record<string, React.FC<MessageRendererProps>> = {
  text: TextRenderer,
  image: ImageRenderer,
  video: VideoRenderer,
  audio: AudioRenderer,
  ptt: AudioRenderer,
  document: DocumentRenderer,
  sticker: StickerRenderer,
  system: SystemRenderer,
  transfer: TransferRenderer,
  location: LocationRenderer,
  vcard: ContactRenderer,
  contact: ContactRenderer,
  contacts: ContactRenderer,
  reaction: ReactionRenderer,
  poll: PollRenderer,
  poll_creation: PollRenderer,
};

/**
 * Get the appropriate renderer for a message type.
 * Schema-driven: add new types by registering in RENDERERS map.
 */
export const getMessageRenderer = (type: string): React.FC<MessageRendererProps> => {
  return RENDERERS[type] || UnknownRenderer;
};

/**
 * Register a custom renderer for a message type at runtime.
 */
export const registerRenderer = (type: string, component: React.FC<MessageRendererProps>) => {
  RENDERERS[type] = component;
};
