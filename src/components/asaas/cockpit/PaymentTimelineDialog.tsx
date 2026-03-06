import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/calculations";
import { PAYMENT_STATUS_CONFIG, BILLING_TYPE_LABELS } from "@/types/asaas";
import type { AsaasPayment } from "@/types/asaas";
import { supabase } from "@/integrations/supabase/client";
import {
  Clock, Webhook, MessageSquare, Send, Loader2,
  CreditCard, FileText, QrCode, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { PaymentNotificationsCard } from "./PaymentNotificationsCard";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

interface WebhookEvent {
  id: string;
  event_type: string;
  received_at: string;
  processed: boolean;
  payload: Record<string, unknown>;
}

interface TaskNote {
  id: string;
  notes: string | null;
  type: string | null;
  status: string | null;
  created_at: string | null;
}

interface Props {
  payment: AsaasPayment | null;
  onClose: () => void;
  environment: "sandbox" | "production";
}

export function PaymentTimelineDialog({ payment, onClose, environment }: Props) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [tasks, setTasks] = useState<TaskNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!payment) return;
    setLoading(true);

    Promise.all([
      // Webhook events for this payment
      supabase
        .from("webhook_events")
        .select("*")
        .or(`payload->>payment.eq.${payment.asaas_id},payload->>id.eq.${payment.asaas_id}`)
        .order("received_at", { ascending: false })
        .limit(50),
      // Tasks/notes for this payment
      supabase
        .from("tasks")
        .select("*")
        .eq("related_payment_id", payment.id)
        .order("created_at", { ascending: false }),
    ]).then(([eventsRes, tasksRes]) => {
      setEvents((eventsRes.data || []) as WebhookEvent[]);
      setTasks((tasksRes.data || []) as TaskNote[]);
    }).catch(console.error).finally(() => setLoading(false));
  }, [payment]);

  const addNote = async () => {
    if (!payment || !newNote.trim()) return;
    setSaving(true);
    try {
      await supabase.from("tasks").insert({
        tenant_id: DEFAULT_TENANT_ID,
        related_payment_id: payment.id,
        type: "NOTE",
        status: "OPEN",
        notes: newNote.trim(),
      });
      setNewNote("");
      // Reload tasks
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("related_payment_id", payment.id)
        .order("created_at", { ascending: false });
      setTasks((data || []) as TaskNote[]);
      toast.success("Nota adicionada");
    } catch {
      toast.error("Erro ao adicionar nota");
    } finally {
      setSaving(false);
    }
  };

  if (!payment) return null;

  const statusConfig = PAYMENT_STATUS_CONFIG[payment.status] || { label: payment.status, color: "outline" as const };
  const BillingIcon = payment.billing_type === "CREDIT_CARD" ? CreditCard
    : payment.billing_type === "PIX" ? QrCode : FileText;

  // Merge timeline items
  const timelineItems = [
    ...events.map((e) => ({
      id: e.id,
      type: "webhook" as const,
      date: e.received_at,
      label: e.event_type.replace("PAYMENT_", "").replace(/_/g, " "),
      detail: e.processed ? "Processado" : "Não processado",
    })),
    ...tasks.map((t) => ({
      id: t.id,
      type: "note" as const,
      date: t.created_at || "",
      label: t.type === "NOTE" ? "Nota Interna" : (t.type || "Ação"),
      detail: t.notes || "",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Dialog open={!!payment} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BillingIcon className="h-4 w-4 text-muted-foreground" />
            {payment.asaas_id}
            <Badge variant={statusConfig.color} className="text-[10px]">
              {statusConfig.label}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs space-y-1">
            <span>{BILLING_TYPE_LABELS[payment.billing_type]} • {formatCurrency(payment.value)} • Venc. {payment.due_date}</span>
            {payment.description && <p className="text-muted-foreground">{payment.description}</p>}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* Add Note */}
        <div className="flex gap-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Adicionar nota interna..."
            className="text-xs min-h-[40px] max-h-[80px]"
          />
          <Button
            size="sm"
            onClick={addNote}
            disabled={saving || !newNote.trim()}
            className="self-end gap-1"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <Separator />

        {/* Timeline */}
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : timelineItems.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              Nenhum evento ou nota registrada para esta cobrança.
            </p>
          ) : (
            <div className="space-y-1 pr-2">
              {timelineItems.map((item) => (
                <div key={item.id} className="flex gap-3 py-2">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      item.type === "webhook" ? "bg-accent/10" : "bg-primary/10"
                    }`}>
                      {item.type === "webhook" ? (
                        <Webhook className="h-3.5 w-3.5 text-accent" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <div className="w-px flex-1 bg-border" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                    {item.detail && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
