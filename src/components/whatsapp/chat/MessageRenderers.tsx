import React from "react";
import type { Message } from "@/data/mockMessages";

// Message renderer registry — maps type to component
export interface MessageRendererProps {
  message: Message;
  nameColor?: string;
  formatTime: (ts: string) => string;
}

// Text renderer
const TextRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
);

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
    {message.caption && <p className="text-sm mt-1">{message.caption}</p>}
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

// Document renderer
const DocumentRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <div className="flex items-center gap-2 p-2 rounded bg-muted/30 border border-border/30">
    <span className="text-lg">📎</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{message.caption || message.content || "Documento"}</p>
      {message.mediaUrl && (
        <a
          href={message.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          Baixar
        </a>
      )}
    </div>
  </div>
);

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

// Fallback for unknown types
const UnknownRenderer: React.FC<MessageRendererProps> = ({ message }) => (
  <p className="text-sm whitespace-pre-wrap break-words">{message.content || `[${message.type}]`}</p>
);

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
