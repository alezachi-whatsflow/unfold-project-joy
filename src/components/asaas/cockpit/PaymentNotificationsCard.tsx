import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { callAsaasProxy } from "@/lib/asaasQueries";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, CheckCircle2, Eye, Link2, Loader2, RefreshCw,
  MessageSquare, Bell,
} from "lucide-react";
import { toast } from "sonner";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

interface NotificationEvent {
  id: string;
  description: string;
  date: string;
  type: "email_customer" | "email_owner" | "sms" | "whatsapp";
  delivered: boolean;
  opened: boolean;
  hasLink: boolean;
}

interface Props {
  paymentAsaasId: string;
  paymentId: string;
  environment: "sandbox" | "production";
}

export function PaymentNotificationsCard({ paymentAsaasId, paymentId, environment }: Props) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [paymentAsaasId]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Load from dunning_executions tied to this payment
      const { data: executions } = await supabase
        .from("dunning_executions")
        .select("*")
        .eq("payment_id", paymentId)
        .order("executed_at", { ascending: false });

      // Also load webhook events related to notification
      const { data: webhookEvents } = await supabase
        .from("webhook_events")
        .select("*")
        .or(`payload->>payment.eq.${paymentAsaasId},payload->>id.eq.${paymentAsaasId}`)
        .in("event_type", [
          "PAYMENT_CREATED",
          "PAYMENT_UPDATED",
          "PAYMENT_OVERDUE",
          "PAYMENT_DUEDATE_WARNING",
          "PAYMENT_RECEIVED",
          "PAYMENT_CONFIRMED",
        ])
        .order("received_at", { ascending: false })
        .limit(20);

      const items: NotificationEvent[] = [];

      // Map dunning executions to notification items
      if (executions) {
        for (const exec of executions) {
          const result = exec.result as Record<string, unknown> | null;
          const action = exec.action || "";
          const isEmail = action.toLowerCase().includes("email") || action.toLowerCase().includes("notify");
          const isSms = action.toLowerCase().includes("sms");

          items.push({
            id: exec.id,
            description: getActionDescription(action, result),
            date: exec.executed_at || "",
            type: isSms ? "sms" : "email_customer",
            delivered: exec.success === true,
            opened: false,
            hasLink: false,
          });
        }
      }

      // Map webhook events to notification items
      if (webhookEvents) {
        for (const evt of webhookEvents) {
          const eventType = evt.event_type;
          items.push({
            id: evt.id,
            description: getWebhookNotificationDescription(eventType, evt.payload as Record<string, unknown>),
            date: evt.received_at || "",
            type: eventType.includes("OVERDUE") ? "email_customer" : "email_owner",
            delivered: evt.processed === true,
            opened: false,
            hasLink: eventType === "PAYMENT_CREATED" || eventType === "PAYMENT_DUEDATE_WARNING",
          });
        }
      }

      // Sort by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(items);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
    }
  };

  const resendNotification = async () => {
    setResending(true);
    try {
      await callAsaasProxy({
        endpoint: `/payments/${paymentAsaasId}/resendNotification`,
        method: "POST",
        environment,
      });
      toast.success("Notificação reenviada com sucesso");
      // Reload after a moment
      setTimeout(loadNotifications, 1500);
    } catch (err) {
      toast.error("Erro ao reenviar notificação");
    } finally {
      setResending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          Notificações da cobrança
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status & Resend */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Envio por E-mail</p>
            <Badge variant="outline" className="text-[10px] mt-1 text-green-600 border-green-600">
              Ativo
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            As notificações de cobrança são enviadas automaticamente conforme a régua de cobrança configurada.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={resendNotification}
            disabled={resending}
          >
            {resending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Reenviar E-mail de notificação
          </Button>
        </div>

        {/* Notification History */}
        <div className="rounded-lg border border-border">
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <p className="text-xs font-medium">Histórico de notificações</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Nenhuma notificação registrada para esta cobrança.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground text-right w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => (
                  <TableRow key={n.id} className="border-border hover:bg-secondary/30">
                    <TableCell className="py-2">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">{formatDate(n.date)}</p>
                        <p className="text-xs">{n.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        {n.delivered && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" title="Enviado" />
                        )}
                        <Mail
                          className={`h-4 w-4 ${n.delivered ? "text-primary" : "text-muted-foreground"}`}
                          title="E-mail"
                        />
                        {n.opened && (
                          <Eye className="h-4 w-4 text-muted-foreground" title="Visualizado" />
                        )}
                        {n.hasLink && (
                          <Link2 className="h-4 w-4 text-muted-foreground" title="Link" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {notifications.length > 0 && (
            <div className="px-3 py-1.5 border-t border-border bg-muted/20 text-right">
              <p className="text-[10px] text-muted-foreground">
                Exibindo de 1 a {notifications.length}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getActionDescription(action: string, result: Record<string, unknown> | null): string {
  const target = (result as any)?.target || "";
  const email = (result as any)?.email || "";

  switch (action) {
    case "NOTIFY_EMAIL":
    case "EMAIL":
      return `E-mail de cobrança enviado${email ? ` (${email})` : ""}`;
    case "NOTIFY_SMS":
    case "SMS":
      return `SMS de cobrança enviado${target ? ` (${target})` : ""}`;
    case "PROTEST":
      return "Registro de protesto enviado";
    default:
      return `Ação executada: ${action}${email ? ` (${email})` : ""}`;
  }
}

function getWebhookNotificationDescription(eventType: string, payload: Record<string, unknown>): string {
  const customerEmail = (payload as any)?.payment?.customer?.email || "";

  switch (eventType) {
    case "PAYMENT_CREATED":
      return `E-mail de geração de cobrança para o seu cliente${customerEmail ? ` (${customerEmail})` : ""}`;
    case "PAYMENT_DUEDATE_WARNING":
      return `E-mail de aviso de vencimento para o seu cliente${customerEmail ? ` (${customerEmail})` : ""}`;
    case "PAYMENT_OVERDUE":
      return `E-mail de cobrança atrasada para o seu cliente${customerEmail ? ` (${customerEmail})` : ""}`;
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED":
      return `E-mail de confirmação de pagamento${customerEmail ? ` (${customerEmail})` : ""}`;
    case "PAYMENT_UPDATED":
      return `Atualização de cobrança registrada`;
    default:
      return `Notificação: ${eventType.replace("PAYMENT_", "").replace(/_/g, " ")}`;
  }
}
