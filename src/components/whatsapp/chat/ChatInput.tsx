import { useState, useRef, useEffect, useCallback, type CSSProperties, type ChangeEvent } from "react";
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  X,
  Image,
  FileText,
  MapPin,
  User,
  BarChart3,
  Music,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Square,
  Circle,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QuickReplyItem {
  id: string;
  title: string;
  shortcut: string;
  body: string;
  category: string | null;
}

export type AttachmentPayload =
  | { type: "media"; mediaType: "image" | "video" | "document" | "audio"; file: string; text?: string }
  | { type: "location"; latitude: number; longitude: number; name?: string }
  | { type: "contact"; name: string; phone: string }
  | { type: "poll"; question: string; options: string[] };

interface ChatInputProps {
  onSend: (text: string, options?: { replyId?: string }) => void;
  onSendAttachment?: (payload: AttachmentPayload) => Promise<void>;
  replyTo?: { senderName: string; content: string; messageId?: string } | null;
  onCancelReply?: () => void;
  quickReplies?: QuickReplyItem[];
}

type AttachMode = null | "media" | "document" | "location" | "contact" | "poll" | "audio";

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function getAcceptByMode(mode: AttachMode) {
  if (mode === "media") return "image/*,video/*";
  if (mode === "audio") return "audio/*";
  if (mode === "document") return ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx";
  return "*/*";
}

// ── Emoji picker data ──────────────────────────────────────────────
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Frequentes",
    emojis: ["😂","❤️","👍","🔥","😍","🙏","😭","😊","🥰","✨","😅","🤣","💕","🎉","😁","💜","😢","🤗","💪","😘","👏","😎","🙌","💛","😆","💯","🥺","🤩","💗","😜","😉","💖","😋","🤔","💀"],
  },
  {
    label: "Rostos",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢","🤫","🤔","😐","😑","😶","🫠","😏","😒","🙄","😬","😮‍💨","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","😵","🤯","🥳","🥸","😎","🤓","🧐"],
  },
  {
    label: "Mãos",
    emojis: ["👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏"],
  },
  {
    label: "Corações",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","🫀","💑","💏","👩‍❤️‍👨","👨‍❤️‍👨","👩‍❤️‍👩"],
  },
  {
    label: "Objetos",
    emojis: ["⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","💾","💿","📷","📹","🎥","📞","☎️","📺","📻","🎙️","⏰","🔋","🔌","💡","🔦","🕯️","📦","💰","💳","📧","📬","📝","📁","📎","✂️","🔒","🔑","🔨","🧰"],
  },
];

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ChatInput({ onSend, onSendAttachment, replyTo, onCancelReply, quickReplies = [] }: ChatInputProps) {
  const [text, setText] = useState("");
  const [fixingGrammar, setFixingGrammar] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [attachMode, setAttachMode] = useState<AttachMode>(null);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sendingAudio, setSendingAudio] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Attachment form fields
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dupFiles, setDupFiles] = useState<File[]>([]);
  const [showDupConfirm, setShowDupConfirm] = useState(false);
  const [mediaCaption, setMediaCaption] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locName, setLocName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", "", ""]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [text]);

  // Auto-focus textarea when component mounts (conversation selected)
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Slash command detection
  useEffect(() => {
    if (text.startsWith("/") && quickReplies.length > 0) {
      const query = text.slice(1).toLowerCase();
      setSlashFilter(query);
      setShowSlashMenu(true);
      setSlashIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  }, [text, quickReplies.length]);

  const filteredSlashReplies = showSlashMenu
    ? quickReplies
        .filter((r) => {
          const q = slashFilter.toLowerCase();
          if (!q) return true;
          return (
            r.title.toLowerCase().includes(q) ||
            r.shortcut.toLowerCase().includes(q) ||
            r.body.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => a.title.localeCompare(b.title))
        .slice(0, 10)
    : [];

  const selectSlashReply = (reply: QuickReplyItem) => {
    setText(reply.body);
    setShowSlashMenu(false);
    textareaRef.current?.focus();
    // Increment usage_count via supabase (fire & forget)
    supabase.from("quick_replies").update({ usage_count: (reply as any).usage_count + 1 || 1 }).eq("id", reply.id).then(() => {});
  };

  // Close emoji picker on click outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const insertEmoji = useCallback((emoji: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart ?? text.length;
      const end = ta.selectionEnd ?? text.length;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      // Restore cursor after emoji
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + emoji.length;
        ta.setSelectionRange(pos, pos);
      });
    } else {
      setText((prev) => prev + emoji);
    }
  }, [text]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Record as webm/opus (universally supported in Chrome/Firefox/Edge)
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Handled in stopRecording
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        toast.error("Permissão de microfone negada. Habilite nas configurações do navegador.");
      } else {
        toast.error("Não foi possível acessar o microfone.");
      }
    }
  };

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        resolve(blob);
      };
      recorder.stop();
    });
  };

  const cleanupRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
    setSendingAudio(false);
  };

  const handleStopAndSend = async () => {
    if (!onSendAttachment) return;
    setSendingAudio(true);
    try {
      const blob = await stopRecording();
      if (!blob || blob.size === 0) {
        toast.error("Gravação vazia.");
        cleanupRecording();
        return;
      }

      const file = new File([blob], `audio_${Date.now()}.webm`, { type: "audio/webm" });
      const url = await uploadFileAndGetUrl(file);

      await onSendAttachment({
        type: "media",
        mediaType: "audio",
        file: url,
      });

      toast.success("Áudio enviado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar áudio.");
    } finally {
      cleanupRecording();
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    cleanupRecording();
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim(), replyTo?.messageId ? { replyId: replyTo.messageId } : undefined);
    setText("");
    onCancelReply?.();
  };

  const handleFixGrammar = async () => {
    if (!text.trim() || fixingGrammar) return;
    setFixingGrammar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const base = (supabase as any).supabaseUrl || "https://supabase.whatsflow.com.br";
      const res = await fetch(`${base}/functions/v1/copilot-run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          message: `Corrija apenas a grafia, acentuação e pontuação do texto abaixo em português brasileiro. Mantenha o tom original (informal/formal). Não altere o sentido, não adicione palavras e não explique nada. Retorne APENAS o texto corrigido, sem aspas:\n\n${text}`,
        }),
      });
      const data = await res.json();
      const corrected = data?.reply || data?.message || data?.text || "";
      if (corrected && corrected !== text) {
        setText(corrected);
        toast.success("Texto corrigido!");
      } else {
        toast.info("Nenhuma correção necessária");
      }
    } catch {
      toast.error("Erro ao corrigir texto");
    } finally {
      setFixingGrammar(false);
    }
  };

  const resetAttach = () => {
    setAttachMode(null);
    setShowAttach(false);
    setSelectedFiles([]);
    setMediaCaption("");
    setLat("");
    setLng("");
    setLocName("");
    setContactName("");
    setContactPhone("");
    setPollQuestion("");
    setPollOptions(["", "", ""]);
  };

  const isFileMode = attachMode === "media" || attachMode === "document" || attachMode === "audio";

  const uploadFileAndGetUrl = async (file: File) => {
    // Upload to Supabase Storage (chat-attachments bucket)
    const ext = file.name.split(".").pop() || "bin";
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .upload(fileName, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) throw new Error(`Falha no upload: ${error.message}`);

    const { data: urlData } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) throw new Error("Falha ao obter URL publica");

    return urlData.publicUrl;
  };

  const handleSelectAttachment = (mode: AttachMode) => {
    setAttachMode(mode);
    setShowAttach(false);
  };

  const handlePickFiles = () => {
    if (!isFileMode) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = "";

    if (!incoming.length) return;

    const remainingSlots = MAX_FILES - selectedFiles.length;
    if (remainingSlots <= 0) {
      toast.error(`Limite atingido: máximo de ${MAX_FILES} arquivos.`);
      return;
    }

    const sliced = incoming.slice(0, remainingSlots);
    if (incoming.length > remainingSlots) {
      toast.error(`Você pode anexar no máximo ${MAX_FILES} arquivos por envio.`);
    }

    const valid: File[] = [];
    const duplicates: File[] = [];
    const invalidNames: string[] = [];

    for (const file of sliced) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        invalidNames.push(file.name);
      } else if (selectedFiles.some((f) => f.name === file.name && f.size === file.size)) {
        duplicates.push(file);
      } else {
        valid.push(file);
      }
    }

    if (invalidNames.length) {
      toast.error(`Arquivo acima de ${MAX_FILE_SIZE_MB}MB: ${invalidNames[0]}${invalidNames.length > 1 ? ` (+${invalidNames.length - 1})` : ""}`);
    }

    // Add non-duplicate files immediately
    if (valid.length) {
      setSelectedFiles((prev) => [...prev, ...valid]);
    }

    // Show confirmation popup for duplicates
    if (duplicates.length) {
      setDupFiles(duplicates);
      setShowDupConfirm(true);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendAttachment = async () => {
    if (!onSendAttachment || !attachMode) return;

    setSending(true);
    try {
      if (attachMode === "media" || attachMode === "document" || attachMode === "audio") {
        if (!selectedFiles.length) {
          toast.error("Adicione pelo menos 1 arquivo.");
          return;
        }

        const mediaType = attachMode === "media" ? "image" : attachMode === "document" ? "document" : "audio";

        for (const file of selectedFiles) {
          const fileUrl = await uploadFileAndGetUrl(file);
          await onSendAttachment({
            type: "media",
            mediaType,
            file: fileUrl,
            text: mediaType === "audio" ? undefined : mediaCaption || file.name,
          });
        }

        toast.success("Anexo(s) enviado(s) com sucesso.");
        resetAttach();
        return;
      }

      if (attachMode === "location") {
        const latitude = Number(lat);
        const longitude = Number(lng);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          toast.error("Informe latitude e longitude válidas.");
          return;
        }

        await onSendAttachment({
          type: "location",
          latitude,
          longitude,
          name: locName.trim() || undefined,
        });
        toast.success("Localização enviada.");
        resetAttach();
        return;
      }

      if (attachMode === "contact") {
        if (!contactName.trim() || !contactPhone.trim()) {
          toast.error("Informe nome e telefone do contato.");
          return;
        }

        await onSendAttachment({
          type: "contact",
          name: contactName.trim().slice(0, 100),
          phone: contactPhone.replace(/\D/g, "").slice(0, 20),
        });
        toast.success("Contato enviado.");
        resetAttach();
        return;
      }

      if (attachMode === "poll") {
        const question = pollQuestion.trim();
        const options = pollOptions.map((o) => o.trim()).filter(Boolean).slice(0, 12);

        if (!question) {
          toast.error("Informe a pergunta da enquete.");
          return;
        }
        if (options.length < 2) {
          toast.error("A enquete precisa de pelo menos 2 opções.");
          return;
        }

        await onSendAttachment({ type: "poll", question: question.slice(0, 300), options });
        toast.success("Enquete enviada.");
        resetAttach();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar anexo.");
    } finally {
      setSending(false);
    }
  };

  const attachmentItems = [
    { icon: Image, label: "Fotos e vídeos", color: "#7C3AED", mode: "media" as AttachMode },
    { icon: FileText, label: "Documentos", color: "#0EA5E9", mode: "document" as AttachMode },
    { icon: MapPin, label: "Localização", color: "#10B981", mode: "location" as AttachMode },
    { icon: User, label: "Contato", color: "#F59E0B", mode: "contact" as AttachMode },
    { icon: BarChart3, label: "Enquete", color: "#EF4444", mode: "poll" as AttachMode },
    { icon: Music, label: "Áudio", color: "#00A884", mode: "audio" as AttachMode },
  ];

  const inputStyle: CSSProperties = {
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
    <>
    {/* Duplicate file confirmation popup */}
    {showDupConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Arquivo duplicado</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {dupFiles.length === 1
                  ? `"${dupFiles[0].name}" já foi adicionado ao anexo.`
                  : `${dupFiles.length} arquivos já foram adicionados ao anexo.`}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Tem certeza que deseja anexar novamente?</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowDupConfirm(false); setDupFiles([]); }}
              className="flex-1 h-9 rounded-xl text-xs font-medium border border-border bg-muted hover:bg-muted/80 transition-colors"
            >
              Não, cancelar
            </button>
            <button
              onClick={() => {
                setSelectedFiles((prev) => [...prev, ...dupFiles]);
                setShowDupConfirm(false);
                setDupFiles([]);
              }}
              className="flex-1 h-9 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sim, anexar
            </button>
          </div>
        </div>
      </div>
    )}

    <div style={{ backgroundColor: "var(--wa-bg-header)", borderTop: "1px solid var(--wa-border)" }}>
      {showAttach && !attachMode && (
        <div
          className="mx-4 mt-2 p-2 grid grid-cols-3 gap-1 rounded-xl"
          style={{ backgroundColor: "var(--wa-bg-panel, #233138)", border: "1px solid var(--wa-border)", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", animation: "messageIn 200ms ease-out" }}
        >
          {attachmentItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleSelectAttachment(item.mode)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
              style={{ color: "var(--wa-text-primary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${item.color}15`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}18` }}>
                <item.icon size={15} style={{ color: item.color }} />
              </div>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {attachMode && (
        <div
          className="mx-4 mt-2 p-3 space-y-2 rounded-xl"
          style={{ backgroundColor: "var(--wa-bg-panel, #233138)", border: "1px solid var(--wa-border)", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", animation: "messageIn 200ms ease-out" }}
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

          {isFileMode && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={getAcceptByMode(attachMode)}
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={handlePickFiles}
                className="w-full py-2 text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: "var(--wa-bg-input)", color: "var(--wa-text-primary)" }}
              >
                <Plus size={16} /> Adicionar arquivo(s)
              </button>

              <p className="text-[11px]" style={{ color: "var(--wa-text-secondary)" }}>
                Máximo {MAX_FILES} arquivos por envio • até {MAX_FILE_SIZE_MB}MB por arquivo
              </p>

              {selectedFiles.length > 0 && (
                <div className="max-h-28 overflow-auto space-y-1 pr-1">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded px-2 py-1" style={{ backgroundColor: "var(--wa-bg-input)" }}>
                      <div className="min-w-0">
                        <p className="text-xs truncate" style={{ color: "var(--wa-text-primary)" }}>{file.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--wa-text-secondary)" }}>
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button onClick={() => removeFile(index)} aria-label="Remover arquivo" style={{ color: "var(--wa-text-secondary)" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {attachMode !== "audio" && (
                <input
                  style={inputStyle}
                  placeholder="Legenda (opcional)"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  maxLength={300}
                />
              )}
            </div>
          )}

          {attachMode === "location" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input style={inputStyle} placeholder="Latitude" type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
                <input style={inputStyle} placeholder="Longitude" type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
              </div>
              <input style={inputStyle} placeholder="Nome do local (opcional)" value={locName} onChange={(e) => setLocName(e.target.value)} maxLength={120} />
            </div>
          )}

          {attachMode === "contact" && (
            <div className="space-y-2">
              <input style={inputStyle} placeholder="Nome do contato" value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={100} />
              <input style={inputStyle} placeholder="Telefone (5511999999999)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={20} />
            </div>
          )}

          {attachMode === "poll" && (
            <div className="space-y-2">
              <input style={inputStyle} placeholder="Pergunta da enquete" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} maxLength={300} />
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
                  maxLength={120}
                />
              ))}
              {pollOptions.length < 12 && (
                <button onClick={() => setPollOptions([...pollOptions, ""])} className="text-xs" style={{ color: "var(--wa-green)" }}>
                  + Adicionar opção
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={resetAttach}
              className="flex-1 py-1.5 text-xs font-medium transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--wa-text-secondary)" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSendAttachment}
              disabled={sending}
              className="flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              style={{ backgroundColor: "var(--wa-green)", color: "#fff" }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar
            </button>
          </div>
        </div>
      )}

      {replyTo && (
        <div
          className="mx-4 mt-2 flex items-center justify-between rounded-t-lg px-3 py-2"
          style={{ backgroundColor: "rgba(0,0,0,0.2)", borderLeft: "3px solid var(--wa-green)", animation: "messageIn 150ms ease-out" }}
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

      {/* ── Slash command menu ── */}
      {showSlashMenu && filteredSlashReplies.length > 0 && (
        <div
          ref={slashMenuRef}
          className="mx-4 mb-1 overflow-y-auto"
          style={{
            backgroundColor: "var(--wa-bg-panel, #233138)",
            border: "1px solid var(--wa-border)",
            borderRadius: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            animation: "messageIn 150ms ease-out",
            maxHeight: 260,
          }}
        >
          <div className="px-3 py-1.5" style={{ borderBottom: "1px solid var(--wa-border)" }}>
            <span className="text-[11px] font-medium" style={{ color: "var(--wa-text-secondary)" }}>
              Respostas Rápidas — digite para filtrar
            </span>
          </div>
          {filteredSlashReplies.map((reply, i) => (
            <button
              key={reply.id}
              onClick={() => selectSlashReply(reply)}
              className="w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors"
              style={{
                backgroundColor: i === slashIndex ? "var(--wa-bg-hover, rgba(255,255,255,0.08))" : "transparent",
              }}
              onMouseEnter={() => setSlashIndex(i)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: "var(--wa-text-primary)" }}>{reply.title}</span>
                <span className="text-[10px] font-mono px-1 rounded" style={{ color: "var(--wa-green)", background: "rgba(0,168,132,0.1)" }}>
                  {reply.shortcut}
                </span>
                {reply.category && (
                  <span className="text-[9px] px-1 rounded" style={{ color: "var(--wa-text-secondary)", background: "rgba(255,255,255,0.05)" }}>
                    {reply.category}
                  </span>
                )}
              </div>
              <span className="text-[11px] truncate" style={{ color: "var(--wa-text-secondary)" }}>{reply.body}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Emoji Picker ── */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="mx-4 mb-1"
          style={{
            backgroundColor: "var(--wa-bg-panel, #233138)",
            border: "1px solid var(--wa-border)",
            borderRadius: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            animation: "messageIn 150ms ease-out",
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Category tabs */}
          <div className="flex gap-1 px-2 pt-2 pb-1" style={{ borderBottom: "1px solid var(--wa-border)" }}>
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => setEmojiCategory(i)}
                className="px-2 py-1 text-[11px] rounded transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: emojiCategory === i ? "var(--wa-green)" : "transparent",
                  color: emojiCategory === i ? "#fff" : "var(--wa-text-secondary)",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {/* Emoji grid */}
          <div className="overflow-y-auto p-2" style={{ flex: 1 }}>
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => insertEmoji(emoji)}
                  className="text-xl hover:bg-white/10 rounded p-1 transition-colors leading-none"
                  style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Recording UI ── */}
      {isRecording ? (
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Circle size={12} fill="#EF4444" className="text-red-500 animate-pulse" />
            <span className="text-sm font-mono" style={{ color: "var(--wa-text-primary)" }}>
              {formatRecordingTime(recordingTime)}
            </span>
            <span className="text-xs" style={{ color: "var(--wa-text-secondary)" }}>Gravando...</span>
          </div>
          <button
            onClick={handleCancelRecording}
            className="shrink-0 p-2 rounded-full transition-colors hover:bg-white/10"
            aria-label="Cancelar gravação"
            style={{ color: "var(--wa-text-secondary)" }}
          >
            <Trash2 size={20} />
          </button>
          <button
            onClick={handleStopAndSend}
            disabled={sendingAudio}
            className="shrink-0 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#EF4444", width: 40, height: 40, transition: "opacity 200ms" }}
            aria-label="Parar e enviar"
          >
            {sendingAudio ? <Loader2 size={18} className="text-white animate-spin" /> : <Square size={16} className="text-white" />}
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2 px-4 py-2.5">
          <div className="flex items-center gap-2 shrink-0 relative">
            <button
              ref={emojiButtonRef}
              onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttach(false); setAttachMode(null); }}
              aria-label="Emoji"
              style={{ color: showEmojiPicker ? "var(--wa-green)" : "var(--wa-text-secondary)" }}
            >
              <Smile size={24} />
            </button>
            <button onClick={() => { setShowAttach(!showAttach); setAttachMode(null); setShowEmojiPicker(false); }} aria-label="Anexo" style={{ color: "var(--wa-text-secondary)" }}>
              <Paperclip size={24} />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Slash menu navigation
              if (showSlashMenu && filteredSlashReplies.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSlashIndex((prev) => (prev + 1) % filteredSlashReplies.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSlashIndex((prev) => (prev - 1 + filteredSlashReplies.length) % filteredSlashReplies.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  selectSlashReply(filteredSlashReplies[slashIndex]);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setShowSlashMenu(false);
                  setText("");
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
              if (e.key === "C" && e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                handleFixGrammar();
              }
            }}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (const item of Array.from(items)) {
                if (item.type.startsWith("image/")) {
                  e.preventDefault();
                  const blob = item.getAsFile();
                  if (!blob) return;
                  const file = new File([blob], `screenshot_${Date.now()}.png`, { type: blob.type });
                  setSelectedFiles((prev) => [...prev, file]);
                  setAttachMode("media");
                  setShowAttach(true);
                  return;
                }
              }
            }}
            placeholder="Digite uma mensagem"
            rows={1}
            className="flex-1 min-w-0 resize-none border-none outline-none rounded-[10px] px-3 py-2"
            style={{ backgroundColor: "var(--wa-bg-input)", color: "var(--wa-text-primary)", fontSize: 15, maxHeight: 120 }}
          />

          {/* Grammar fix button — visible when there's text */}
          {text.trim().length > 3 && (
            <button
              onClick={handleFixGrammar}
              disabled={fixingGrammar}
              className="shrink-0 flex items-center justify-center transition-all hover:scale-110"
              style={{ color: fixingGrammar ? "var(--wa-green)" : "var(--wa-text-secondary)", width: 28, height: 28 }}
              aria-label="Corrigir grafia (Ctrl+Shift+C)"
              title="Corrigir grafia"
            >
              {fixingGrammar ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            </button>
          )}

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
            <button
              onClick={startRecording}
              className="shrink-0"
              aria-label="Gravar áudio"
              style={{ color: "var(--wa-green)", transition: "opacity 200ms, transform 200ms" }}
            >
              <Mic size={24} />
            </button>
          )}
        </div>
      )}
    </div>
    </>
  );
}
