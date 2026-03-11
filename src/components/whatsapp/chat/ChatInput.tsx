import { useState, useRef, useEffect } from "react";
import { Smile, Paperclip, Mic, Send, X, Image, FileText, MapPin, User, BarChart3, Music, ArrowLeft, Loader2 } from "lucide-react";

export type AttachmentPayload =
  | { type: "media"; mediaType: "image" | "video" | "document" | "audio"; file: string; text?: string }
  | { type: "location"; latitude: number; longitude: number; name?: string }
  | { type: "contact"; name: string; phone: string }
  | { type: "poll"; question: string; options: string[] };

interface ChatInputProps {
  onSend: (text: string) => void;
  onSendAttachment?: (payload: AttachmentPayload) => Promise<void>;
  replyTo?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
}

type AttachMode = null | "media" | "document" | "location" | "contact" | "poll" | "audio";

export default function ChatInput({ onSend, onSendAttachment, replyTo, onCancelReply }: ChatInputProps) {
  const [text, setText] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [attachMode, setAttachMode] = useState<AttachMode>(null);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Attachment form fields
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locName, setLocName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", "", ""]);

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

  const resetAttach = () => {
    setAttachMode(null);
    setShowAttach(false);
    setMediaUrl("");
    setMediaCaption("");
    setLat("");
    setLng("");
    setLocName("");
    setContactName("");
    setContactPhone("");
    setPollQuestion("");
    setPollOptions(["", "", ""]);
  };

  const handleSendAttachment = async () => {
    if (!onSendAttachment) return;
    setSending(true);
    try {
      switch (attachMode) {
        case "media":
          if (!mediaUrl.trim()) return;
          await onSendAttachment({ type: "media", mediaType: "image", file: mediaUrl, text: mediaCaption });
          break;
        case "document":
          if (!mediaUrl.trim()) return;
          await onSendAttachment({ type: "media", mediaType: "document", file: mediaUrl, text: mediaCaption });
          break;
        case "audio":
          if (!mediaUrl.trim()) return;
          await onSendAttachment({ type: "media", mediaType: "audio", file: mediaUrl });
          break;
        case "location":
          if (!lat.trim() || !lng.trim()) return;
          await onSendAttachment({ type: "location", latitude: Number(lat), longitude: Number(lng), name: locName });
          break;
        case "contact":
          if (!contactName.trim() || !contactPhone.trim()) return;
          await onSendAttachment({ type: "contact", name: contactName, phone: contactPhone });
          break;
        case "poll":
          if (!pollQuestion.trim()) return;
          const validOpts = pollOptions.filter((o) => o.trim());
          if (validOpts.length < 2) return;
          await onSendAttachment({ type: "poll", question: pollQuestion, options: validOpts });
          break;
      }
      resetAttach();
    } catch (e) {
      console.error("Attachment send error:", e);
    } finally {
      setSending(false);
    }
  };

  const selectAttachment = (mode: AttachMode) => {
    setAttachMode(mode);
    setShowAttach(false);
  };

  const attachmentItems = [
    { icon: Image, label: "Fotos e vídeos", color: "#7C3AED", mode: "media" as AttachMode },
    { icon: FileText, label: "Documentos", color: "#0EA5E9", mode: "document" as AttachMode },
    { icon: MapPin, label: "Localização", color: "#10B981", mode: "location" as AttachMode },
    { icon: User, label: "Contato", color: "#F59E0B", mode: "contact" as AttachMode },
    { icon: BarChart3, label: "Enquete", color: "#EF4444", mode: "poll" as AttachMode },
    { icon: Music, label: "Áudio", color: "#00A884", mode: "audio" as AttachMode },
  ];

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--wa-bg-input)",
    color: "var(--wa-text-primary)",
    fontSize: 13,
    border: "none",
    outline: "none",
    borderRadius: 8,
    padding: "6px 10px",
    width: "100%",
  };

  return (
    <div style={{ backgroundColor: "var(--wa-bg-header)", borderTop: "1px solid var(--wa-border)" }}>
      {/* Attachment menu grid */}
      {showAttach && !attachMode && (
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
              onClick={() => selectAttachment(item.mode)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ color: "var(--wa-text-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--wa-bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <item.icon size={20} style={{ color: item.color }} />
              {item.label}
            </button>
          ))}
          <button
            onClick={() => setShowAttach(false)}
            className="col-span-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs mt-1 transition-colors"
            style={{ color: "var(--wa-text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--wa-bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <X size={14} /> Fechar
          </button>
        </div>
      )}

      {/* Attachment inline form */}
      {attachMode && (
        <div
          className="mx-4 mt-2 rounded-xl p-3 space-y-2"
          style={{
            backgroundColor: "#233138",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            animation: "messageIn 200ms ease-out",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <button onClick={resetAttach} className="flex items-center gap-1 text-xs" style={{ color: "var(--wa-text-secondary)" }}>
              <ArrowLeft size={14} /> Voltar
            </button>
            <span className="text-xs font-medium" style={{ color: "var(--wa-green)" }}>
              {attachMode === "media" && "📷 Fotos e vídeos"}
              {attachMode === "document" && "📄 Documentos"}
              {attachMode === "location" && "📍 Localização"}
              {attachMode === "contact" && "👤 Contato"}
              {attachMode === "poll" && "📊 Enquete"}
              {attachMode === "audio" && "🎵 Áudio"}
            </span>
          </div>

          {/* Media / Document / Audio form */}
          {(attachMode === "media" || attachMode === "document" || attachMode === "audio") && (
            <div className="space-y-2">
              <input
                style={inputStyle}
                placeholder="URL do arquivo (https://...)"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
              {attachMode !== "audio" && (
                <input
                  style={inputStyle}
                  placeholder="Legenda (opcional)"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Location form */}
          {attachMode === "location" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input style={inputStyle} placeholder="Latitude" type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
                <input style={inputStyle} placeholder="Longitude" type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
              </div>
              <input style={inputStyle} placeholder="Nome do local (opcional)" value={locName} onChange={(e) => setLocName(e.target.value)} />
            </div>
          )}

          {/* Contact form */}
          {attachMode === "contact" && (
            <div className="space-y-2">
              <input style={inputStyle} placeholder="Nome do contato" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <input style={inputStyle} placeholder="Telefone (5511999999999)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
          )}

          {/* Poll form */}
          {attachMode === "poll" && (
            <div className="space-y-2">
              <input style={inputStyle} placeholder="Pergunta da enquete" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} />
              {pollOptions.map((opt, i) => (
                <input
                  key={i}
                  style={inputStyle}
                  placeholder={`Opção ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const copy = [...pollOptions];
                    copy[i] = e.target.value;
                    setPollOptions(copy);
                  }}
                />
              ))}
              {pollOptions.length < 12 && (
                <button
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="text-xs"
                  style={{ color: "var(--wa-green)" }}
                >
                  + Adicionar opção
                </button>
              )}
            </div>
          )}

          {/* Send / Cancel buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={resetAttach}
              className="flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--wa-text-secondary)" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSendAttachment}
              disabled={sending}
              className="flex-1 rounded-lg py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              style={{ backgroundColor: "var(--wa-green)", color: "#fff" }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar
            </button>
          </div>
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
          <button onClick={() => { setShowAttach(false); setAttachMode(null); }} aria-label="Emoji" style={{ color: "var(--wa-text-secondary)" }}>
            <Smile size={24} />
          </button>
          <button onClick={() => { setShowAttach(!showAttach); setAttachMode(null); }} aria-label="Anexo" style={{ color: "var(--wa-text-secondary)" }}>
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
