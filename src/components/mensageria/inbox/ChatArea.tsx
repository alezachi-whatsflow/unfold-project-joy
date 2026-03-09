import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check, CheckCheck, Send, Paperclip, Smile, Mic, MoreVertical,
  Image, FileText, Headphones, MapPin, ListOrdered, PanelRightOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, Message } from "./mockInboxData";

const ORIGEM_BADGE: Record<string, { label: string; cls: string }> = {
  suporte: { label: "CLIENTE ATIVO", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  prospeccao: { label: "LEAD", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  cobranca: { label: "COBRANÇA", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "sent") return <Check className="h-3 w-3 text-muted-foreground" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  if (status === "read") return <CheckCheck className="h-3 w-3 text-blue-400" />;
  return null;
}

function groupByDate(msgs: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let current = "";
  for (const m of msgs) {
    const d = new Date(m.timestamp).toLocaleDateString("pt-BR");
    if (d !== current) {
      current = d;
      groups.push({ date: d, messages: [] });
    }
    groups[groups.length - 1].messages.push(m);
  }
  return groups;
}

interface Props {
  conversation: Conversation;
  messages: Message[];
  onTogglePanel: () => void;
  showPanel: boolean;
}

export default function ChatArea({ conversation, messages, onTogglePanel, showPanel }: Props) {
  const [text, setText] = useState("");
  const [localMsgs, setLocalMsgs] = useState<Message[]>(messages);
  const endRef = useRef<HTMLDivElement>(null);
  const [showAttach, setShowAttach] = useState(false);

  useEffect(() => {
    setLocalMsgs(messages);
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMsgs]);

  const handleSend = () => {
    if (!text.trim()) return;
    const msg: Message = {
      id: `new-${Date.now()}`,
      direcao: "enviado",
      tipo: "text",
      conteudo: text.trim(),
      status: "sent",
      timestamp: new Date().toISOString(),
    };
    setLocalMsgs((prev) => [...prev, msg]);
    setText("");
  };

  const badge = ORIGEM_BADGE[conversation.origem];
  const groups = groupByDate(localMsgs);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
            {conversation.contactName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{conversation.contactName}</span>
              {badge && (
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold", badge.cls)}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">via {conversation.connectionLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onTogglePanel}>
            <PanelRightOpen className={cn("h-4 w-4", showPanel && "text-primary")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Transferir</DropdownMenuItem>
              <DropdownMenuItem>Finalizar</DropdownMenuItem>
              <DropdownMenuItem>Ver perfil no CRM</DropdownMenuItem>
              <DropdownMenuItem>Adicionar tag</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, hsl(var(--muted)/0.3) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
        {groups.map((g) => (
          <div key={g.date}>
            <div className="flex justify-center my-3">
              <span className="text-[10px] bg-muted/80 text-muted-foreground px-3 py-1 rounded-full">{g.date}</span>
            </div>
            {g.messages.map((m) => (
              <div key={m.id} className={cn("flex mb-1.5", m.direcao === "enviado" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[70%] px-3 py-2 rounded-xl text-sm relative",
                    m.direcao === "enviado"
                      ? "bg-emerald-800/60 text-foreground rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  )}
                >
                  {m.tipo === "text" && <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>}
                  {m.tipo === "image" && (
                    <div className="rounded-lg overflow-hidden">
                      <img src={m.conteudo} alt="imagem" className="max-w-full h-auto rounded" />
                    </div>
                  )}
                  {m.tipo === "audio" && (
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <Mic className="h-4 w-4 text-emerald-400 shrink-0" />
                      <div className="flex-1 h-1 bg-muted rounded-full">
                        <div className="h-1 bg-emerald-500 rounded-full w-2/3" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">0:12</span>
                    </div>
                  )}
                  {m.tipo === "doc" && (
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>Documento</span></div>
                  )}
                  {m.tipo === "location" && (
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>Localização</span></div>
                  )}
                  <div className={cn("flex items-center gap-1 mt-0.5", m.direcao === "enviado" ? "justify-end" : "justify-start")}>
                    <span className="text-[10px] text-muted-foreground">{formatTime(m.timestamp)}</span>
                    {m.direcao === "enviado" && <StatusIcon status={m.status} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="px-3 py-2 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          {/* Attach */}
          <div className="relative">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowAttach(!showAttach)}>
              <Paperclip className="h-4 w-4" />
            </Button>
            {showAttach && (
              <div className="absolute bottom-11 left-0 bg-popover border border-border rounded-lg shadow-lg p-2 space-y-1 z-10 min-w-[140px]">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent w-full text-left" onClick={() => setShowAttach(false)}>
                  <Image className="h-4 w-4 text-blue-400" /> Imagem
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent w-full text-left" onClick={() => setShowAttach(false)}>
                  <FileText className="h-4 w-4 text-amber-400" /> Documento
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent w-full text-left" onClick={() => setShowAttach(false)}>
                  <Headphones className="h-4 w-4 text-emerald-400" /> Áudio
                </button>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Smile className="h-4 w-4" />
          </Button>

          {/* Text input */}
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite uma mensagem..."
              rows={1}
              className="w-full resize-none bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground max-h-[100px] overflow-y-auto"
              style={{ minHeight: "36px" }}
            />
          </div>

          {/* Templates */}
          <Button variant="ghost" size="icon" className="h-9 w-9" title="Templates">
            <ListOrdered className="h-4 w-4" />
          </Button>

          {/* Send / Mic */}
          {text.trim() ? (
            <Button size="icon" className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700" onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
