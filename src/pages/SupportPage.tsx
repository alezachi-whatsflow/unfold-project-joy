import { useState, useEffect, useRef, useCallback } from "react";
import { useTickets, useTicketMessages, type Ticket } from "@/hooks/useTickets";
import { useTenantId } from "@/hooks/useTenantId";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  LifeBuoy, Plus, Search, Send, Lock, MessageSquare,
  Clock, AlertTriangle, CheckCircle2, Loader2, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/dateUtils";
import { FeatureHint } from "@/components/ui/FeatureHint";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Aberto", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: MessageSquare },
  in_progress: { label: "Em andamento", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
  waiting_client: { label: "Aguardando cliente", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Clock },
  waiting_internal: { label: "Aguardando interno", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Clock },
  resolved: { label: "Resolvido", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  closed: { label: "Fechado", color: "bg-muted text-muted-foreground border-border", icon: X },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "text-muted-foreground" },
  medium: { label: "Media", color: "text-blue-500" },
  high: { label: "Alta", color: "text-amber-500" },
  urgent: { label: "Urgente", color: "text-red-500" },
};

export default function SupportPage() {
  const tenantId = useTenantId();
  const { tickets, isLoading, createTicket } = useTickets();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewDialog, setShowNewDialog] = useState(false);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    }
    return true;
  });

  // Resizable panel
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = sessionStorage.getItem("wf_support_panel_w");
    return saved ? Number(saved) : 380;
  });
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(380);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startW.current = panelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const newW = Math.max(280, Math.min(600, startW.current + (ev.clientX - startX.current)));
      setPanelWidth(newW);
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      sessionStorage.setItem("wf_support_panel_w", String(panelWidth));
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [panelWidth]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* Left: Ticket List */}
      <div className="shrink-0 border-r border-border flex flex-col overflow-hidden" style={{ width: panelWidth, background: "var(--bg-surface, var(--bg-base))" }}>
        <div className="p-4 space-y-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" /> Suporte
              <FeatureHint
                title="Central de Suporte"
                description="Crie tickets, converse com a equipe (notas internas) e responda clientes em um so lugar. Vincule tickets a negocios do CRM ou conversas do WhatsApp."
              />
            </h1>
            <Button size="sm" onClick={() => setShowNewDialog(true)} className="gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Novo Ticket
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {[{ key: "all", label: "Todos" }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={cn("text-[10px] px-2 py-1 rounded-full border whitespace-nowrap transition-colors", statusFilter === f.key ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:bg-muted")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Nenhum ticket</p>
          ) : (
            filtered.map((t) => {
              const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
              const pc = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={cn("w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors", selectedTicketId === t.id && "bg-muted/80")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{t.title}</span>
                    <Badge variant="outline" className={cn("text-[9px] shrink-0", sc.color)}>{sc.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-[10px] font-medium", pc.color)}>{pc.label}</span>
                    <span className="text-[10px] text-muted-foreground">{t.category}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{fmtDateTime(t.updated_at)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="shrink-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
        style={{ background: "var(--border)" }}
        title="Arraste para redimensionar"
      />

      {/* Right: Ticket Detail + Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTicket ? (
          <TicketChat ticket={selectedTicket} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <LifeBuoy className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Selecione um ticket</p>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Dialog */}
      <NewTicketDialog open={showNewDialog} onClose={() => setShowNewDialog(false)} onCreate={createTicket.mutate} />
    </div>
  );
}

/* ── TICKET CHAT (dual: internal + external) ── */
function TicketChat({ ticket }: { ticket: Ticket }) {
  const { messages, isLoading, sendMessage } = useTicketMessages(ticket.id);
  const { updateTicket } = useTickets();
  const [input, setInput] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ticket_messages",
        filter: `ticket_id=eq.${ticket.id}`,
      }, (payload: any) => {
        if (!payload?.new?.id) return;
        // TanStack Query will refetch automatically via invalidation in the mutation
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket.id]);

  // Auto scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage.mutate({ content: input.trim(), is_internal: isInternal });
    setInput("");
  };

  const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3" style={{ background: "var(--bg-surface, var(--bg-card))" }}>
        <div className="min-w-0">
          <h2 className="text-sm font-bold truncate">{ticket.title}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={cn("text-[9px]", sc.color)}>{sc.label}</Badge>
            {ticket.reference_type && <Badge variant="secondary" className="text-[9px]">{ticket.reference_type}</Badge>}
          </div>
        </div>
        <Select value={ticket.status} onValueChange={(v) => updateTicket.mutate({ id: ticket.id, status: v })}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "var(--bg-base)" }}>
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.sender_id ? "justify-end" : "justify-start")}>
            <div
              className={cn("max-w-[70%] px-3 py-2 rounded-lg text-sm", m.is_internal
                ? "bg-amber-500/10 border border-amber-500/30"
                : m.sender_id ? "bg-primary/10" : "bg-muted"
              )}
            >
              {m.is_internal && (
                <div className="flex items-center gap-1 mb-1">
                  <Lock className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] font-semibold text-amber-500">Nota Interna</span>
                </div>
              )}
              <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
                {m.sender_name || "Sistema"}
              </p>
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {fmtDateTime(m.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input — dual mode */}
      <div className="border-t border-border p-3 space-y-2" style={{ background: isInternal ? "rgba(245,158,11,0.05)" : "var(--bg-surface, var(--bg-card))" }}>
        <div className="flex gap-2">
          <button
            onClick={() => setIsInternal(false)}
            className={cn("text-[10px] px-3 py-1 rounded-full border transition-colors", !isInternal ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border")}
          >
            <MessageSquare className="inline h-3 w-3 mr-1" /> Resposta ao Cliente
          </button>
          <button
            onClick={() => setIsInternal(true)}
            className={cn("text-[10px] px-3 py-1 rounded-full border transition-colors", isInternal ? "bg-amber-500 text-white border-amber-500" : "text-muted-foreground border-border")}
          >
            <Lock className="inline h-3 w-3 mr-1" /> Nota Interna
          </button>
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={isInternal ? "Nota visivel apenas para a equipe..." : "Responder ao cliente..."}
            className="flex-1 h-9 text-sm"
          />
          <Button onClick={handleSend} disabled={!input.trim() || sendMessage.isPending} size="sm" className="gap-1">
            <Send className="h-3.5 w-3.5" /> Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── NEW TICKET DIALOG ── */
function NewTicketDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (data: any) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("general");

  const handleSubmit = () => {
    if (!title.trim()) { toast.error("Titulo obrigatorio"); return; }
    onCreate({ title: title.trim(), description: description.trim() || null, priority, category });
    setTitle(""); setDescription(""); setPriority("medium"); setCategory("general");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Novo Ticket de Suporte</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Titulo *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Descreva o problema..." /></div>
          <div><Label>Descricao</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalhes adicionais..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="billing">Financeiro</SelectItem>
                  <SelectItem value="technical">Tecnico</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Criar Ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
