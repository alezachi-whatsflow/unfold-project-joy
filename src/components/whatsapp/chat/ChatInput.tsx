import { useState, useRef, useEffect } from "react";
import { Smile, Paperclip, Mic, Send, X, Image, FileText, MapPin, User, BarChart3, Music } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  replyTo?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
}

export default function ChatInput({ onSend, replyTo, onCancelReply }: ChatInputProps) {
  const [text, setText] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  const attachmentItems = [
    { icon: Image, label: "Fotos e vídeos", color: "#7C3AED" },
    { icon: FileText, label: "Documentos", color: "#0EA5E9" },
    { icon: MapPin, label: "Localização", color: "#10B981" },
    { icon: User, label: "Contato", color: "#F59E0B" },
    { icon: BarChart3, label: "Enquete", color: "#EF4444" },
    { icon: Music, label: "Áudio", color: "#00A884" },
  ];

  return (
    <div style={{ backgroundColor: "var(--wa-bg-header)", borderTop: "1px solid var(--wa-border)" }}>
      {/* Attachment menu */}
      {showAttach && (
        <div
          className="mx-4 mt-2 rounded-xl p-3 grid grid-cols-3 gap-2"
          style={{
            backgroundColor: "#233138",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            animation: "messageIn 200ms ease-out",
          }}
        >
          {attachmentItems.map((item) => (
            <button
              key={item.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ color: "var(--wa-text-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--wa-bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <item.icon size={20} style={{ color: item.color }} />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div
          className="mx-4 mt-2 flex items-center justify-between rounded-t-lg px-3 py-2"
          style={{
            backgroundColor: "rgba(0,0,0,0.2)",
            borderLeft: "3px solid var(--wa-green)",
            animation: "messageIn 150ms ease-out",
          }}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold" style={{ color: "var(--wa-green)" }}>Respondendo para {replyTo.senderName}</p>
            <p className="text-xs truncate" style={{ color: "var(--wa-text-secondary)" }}>{replyTo.content}</p>
          </div>
          <button onClick={onCancelReply} aria-label="Cancelar resposta">
            <X size={16} style={{ color: "var(--wa-text-secondary)" }} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 px-4 py-2.5">
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowAttach(false)} aria-label="Emoji" style={{ color: "var(--wa-text-secondary)" }}>
            <Smile size={24} />
          </button>
          <button onClick={() => setShowAttach(!showAttach)} aria-label="Anexo" style={{ color: "var(--wa-text-secondary)" }}>
            <Paperclip size={24} />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="Digite uma mensagem"
          rows={1}
          className="flex-1 resize-none border-none outline-none rounded-[10px] px-3 py-2"
          style={{
            backgroundColor: "var(--wa-bg-input)",
            color: "var(--wa-text-primary)",
            fontSize: 15,
            maxHeight: 120,
          }}
        />

        {text.trim() ? (
          <button
            onClick={handleSend}
            className="shrink-0 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--wa-green)", width: 40, height: 40, transition: "opacity 200ms, transform 200ms" }}
            aria-label="Enviar"
          >
            <Send size={18} className="text-white" />
          </button>
        ) : (
          <button className="shrink-0" aria-label="Gravar áudio" style={{ color: "var(--wa-green)", transition: "opacity 200ms, transform 200ms" }}>
            <Mic size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
