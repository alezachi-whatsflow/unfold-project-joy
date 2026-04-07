/**
 * CustomerSupportPortal — Simplified ticket view for external clients.
 *
 * Security constraints:
 * - NEVER shows messages where is_internal = true
 * - NEVER shows "Aguardando Interno" status, SLA fields, or team members
 * - NEVER exposes Kanban, assignment, or internal workflow
 */
import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useTenantId } from "@/hooks/useTenantId"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  LifeBuoy, Plus, Search, Send, MessageSquare, Clock,
  CheckCircle2, Loader2, X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { fmtDateTime } from "@/lib/dateUtils"

import type { Ticket, TicketMessage } from "@/hooks/useTickets"

// Simplified status config — NO "Aguardando interno"
const CUSTOMER_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Aberto", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: MessageSquare },
  in_progress: { label: "Em andamento", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
  waiting_client: { label: "Aguardando sua resposta", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Clock },
  resolved: { label: "Resolvido", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  closed: { label: "Fechado", color: "bg-muted text-muted-foreground border-border", icon: X },
}

// Map internal statuses to customer-visible ones
function customerVisibleStatus(status: string): string {
  if (status === "waiting_internal") return "in_progress" // hide internal wait from customer
  return status
}

export default function CustomerSupportPortal() {
  const tenantId = useTenantId()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showNew, setShowNew] = useState(false)

  // Fetch only customer's own tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["customer-tickets", tenantId, user?.id],
    queryFn: async () => {
      if (!tenantId || !user?.id) return []
      const { data, error } = await (supabase as any)
        .from("tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("created_by", user.id)
        .order("updated_at", { ascending: false })
      if (error) throw error
      return (data || []) as Ticket[]
    },
    enabled: !!tenantId && !!user?.id,
  })

  const selected = tickets.find(t => t.id === selectedId) || null

  const filtered = tickets.filter(t => {
    if (!search) return true
    return t.title.toLowerCase().includes(search.toLowerCase())
  })

  const createTicket = useMutation({
    mutationFn: async (input: { title: string; description?: string; priority?: string; category?: string }) => {
      const { error } = await (supabase as any)
        .from("tickets")
        .insert({
          tenant_id: tenantId,
          title: input.title,
          description: input.description || null,
          priority: input.priority || "medium",
          category: input.category || "support",
          status: "open",
          created_by: user?.id,
        })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-tickets"] })
      toast.success("Ticket criado com sucesso!")
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  })

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left: My Tickets */}
      <div className="w-[340px] shrink-0 border-r border-border flex flex-col bg-card">
        <div className="p-4 space-y-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" /> Meus Tickets
            </h1>
            <Button size="sm" onClick={() => setShowNew(true)} className="gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Novo
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <LifeBuoy className="h-8 w-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum ticket</p>
              <Button variant="outline" size="sm" onClick={() => setShowNew(true)}>Abrir um ticket</Button>
            </div>
          ) : (
            filtered.map(t => {
              const visibleStatus = customerVisibleStatus(t.status)
              const sc = CUSTOMER_STATUS[visibleStatus] || CUSTOMER_STATUS.open
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn("w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50", selectedId === t.id && "bg-muted/80")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{t.title}</span>
                    <Badge variant="outline" className={cn("text-[9px] shrink-0", sc.color)}>{sc.label}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{fmtDateTime(t.updated_at)}</p>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right: Ticket conversation (external only) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <CustomerTicketChat ticket={selected} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Selecione um ticket para ver a conversa</p>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket */}
      {showNew && (
        <Dialog open onOpenChange={() => setShowNew(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Novo Ticket</DialogTitle></DialogHeader>
            <CustomerNewTicketForm
              onSubmit={(data) => {
                createTicket.mutate(data)
                setShowNew(false)
              }}
              onCancel={() => setShowNew(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

/* ── Customer Ticket Chat — ONLY external messages ── */
function CustomerTicketChat({ ticket }: { ticket: Ticket }) {
  const tenantId = useTenantId()
  const queryClient = useQueryClient()
  const [input, setInput] = useState("")
  const endRef = useRef<HTMLDivElement>(null)

  // Fetch messages — CRITICAL: filter out is_internal = true
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["customer-ticket-messages", ticket.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .eq("is_internal", false)  // ← NEVER expose internal notes
        .order("created_at", { ascending: true })
      if (error) throw error
      return (data || []) as TicketMessage[]
    },
    enabled: !!ticket.id,
  })

  // Realtime — filter INSERT events client-side for is_internal
  useEffect(() => {
    const channel = supabase
      .channel(`customer-ticket-${ticket.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ticket_messages",
        filter: `ticket_id=eq.${ticket.id}`,
      }, (payload: any) => {
        // SECURITY: only refetch if the new message is NOT internal
        if (payload?.new?.is_internal === false) {
          queryClient.invalidateQueries({ queryKey: ["customer-ticket-messages", ticket.id] })
        }
        // If is_internal = true → ignore completely (do not refetch)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [ticket.id, queryClient])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Cliente"
      const { error } = await (supabase as any)
        .from("ticket_messages")
        .insert({
          ticket_id: ticket.id,
          tenant_id: tenantId,
          sender_id: user?.id,
          sender_name: name,
          content,
          is_internal: false, // customers can ONLY send external messages
        })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customer-ticket-messages", ticket.id] }),
    onError: (e: any) => toast.error("Erro: " + e.message),
  })

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage.mutate(input.trim())
    setInput("")
  }

  const visibleStatus = customerVisibleStatus(ticket.status)
  const sc = CUSTOMER_STATUS[visibleStatus] || CUSTOMER_STATUS.open

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header — simplified, NO status change dropdown, NO assignment */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <h2 className="text-sm font-bold truncate">{ticket.title}</h2>
        <Badge variant="outline" className={cn("text-[9px] mt-1", sc.color)}>{sc.label}</Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {messages.map(m => {
          const { data: { user } } = { data: { user: null } } // we can't know inline
          return (
            <div key={m.id} className={cn("flex", m.sender_id ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] px-3 py-2 rounded-lg text-sm", m.sender_id ? "bg-primary/10" : "bg-muted")}>
                <p className="text-xs font-semibold mb-0.5">{m.sender_name || "Suporte"}</p>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{fmtDateTime(m.created_at)}</p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Input — single mode (always external) */}
      <div className="border-t border-border p-3 bg-card flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Responder..."
          className="flex-1 h-9 text-sm"
        />
        <Button onClick={handleSend} disabled={!input.trim() || sendMessage.isPending} size="sm" className="gap-1">
          <Send className="h-3.5 w-3.5" /> Enviar
        </Button>
      </div>
    </div>
  )
}

function CustomerNewTicketForm({ onSubmit, onCancel }: { onSubmit: (d: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("support")

  return (
    <div className="space-y-4">
      <div><Label>Assunto *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Descreva brevemente..." /></div>
      <div><Label>Detalhes</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Mais informacoes..." /></div>
      <div>
        <Label>Categoria</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="support">Suporte</SelectItem>
            <SelectItem value="billing">Financeiro</SelectItem>
            <SelectItem value="technical">Tecnico</SelectItem>
            <SelectItem value="general">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => { if (!title.trim()) { toast.error("Informe o assunto"); return } onSubmit({ title: title.trim(), description, category }) }}>
          Enviar Ticket
        </Button>
      </DialogFooter>
    </div>
  )
}
