import { useState, useMemo } from "react";
import { useAsaas } from "@/contexts/AsaasContext";
import { callAsaasProxy } from "@/lib/asaasQueries";
import { formatCurrency } from "@/lib/calculations";
import { PAYMENT_STATUS_CONFIG, BILLING_TYPE_LABELS } from "@/types/asaas";
import type { AsaasPayment } from "@/types/asaas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, Clock, CreditCard, Flame, Loader2,
  RefreshCw, Send, XCircle, Eye, CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { PaymentTimelineDialog } from "./cockpit/PaymentTimelineDialog";

type QueueFilter = "all" | "d1" | "d3" | "d7" | "d7plus" | "card_failure";

interface QueueBucket {
  key: QueueFilter;
  label: string;
  icon: React.ElementType;
  color: string;
  payments: AsaasPayment[];
}

function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export function AsaasCockpitPanel() {
  const { payments, environment, isSyncing, syncPayments } = useAsaas();
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [timelinePayment, setTimelinePayment] = useState<AsaasPayment | null>(null);

  const overdue = useMemo(() =>
    payments.filter((p) => p.status === "OVERDUE"),
    [payments]
  );

  const cardFailures = useMemo(() =>
    payments.filter((p) =>
      p.billing_type === "CREDIT_CARD" &&
      (p.status === "OVERDUE" || p.status === "PENDING")
    ),
    [payments]
  );

  const buckets: QueueBucket[] = useMemo(() => {
    const d1 = overdue.filter((p) => getDaysOverdue(p.due_date) === 1);
    const d3 = overdue.filter((p) => { const d = getDaysOverdue(p.due_date); return d >= 2 && d <= 3; });
    const d7 = overdue.filter((p) => { const d = getDaysOverdue(p.due_date); return d >= 4 && d <= 7; });
    const d7plus = overdue.filter((p) => getDaysOverdue(p.due_date) > 7);

    return [
      { key: "all", label: "Todas Vencidas", icon: AlertTriangle, color: "text-destructive", payments: overdue },
      { key: "d1", label: "D+1", icon: Clock, color: "text-warning", payments: d1 },
      { key: "d3", label: "D+2 a D+3", icon: CalendarClock, color: "text-warning", payments: d3 },
      { key: "d7", label: "D+4 a D+7", icon: Flame, color: "text-destructive", payments: d7 },
      { key: "d7plus", label: "D+7+", icon: AlertTriangle, color: "text-destructive", payments: d7plus },
      { key: "card_failure", label: "Falhas Cartão", icon: CreditCard, color: "text-destructive", payments: cardFailures },
    ];
  }, [overdue, cardFailures]);

  const currentBucket = buckets.find((b) => b.key === queueFilter) || buckets[0];
  const displayPayments = currentBucket.payments;

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === displayPayments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayPayments.map((p) => p.asaas_id)));
    }
  };

  const batchAction = async (action: "resend" | "cancel") => {
    if (selected.size === 0) { toast.error("Selecione cobranças"); return; }
    setProcessing(true);
    let success = 0;
    let errors = 0;

    for (const asaasId of selected) {
      try {
        if (action === "resend") {
          await callAsaasProxy({
            endpoint: `/payments/${asaasId}/resendNotification`,
            method: "POST",
            environment,
          });
        } else if (action === "cancel") {
          await callAsaasProxy({
            endpoint: `/payments/${asaasId}`,
            method: "DELETE",
            environment,
          });
        }
        success++;
      } catch {
        errors++;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    setProcessing(false);
    setSelected(new Set());
    if (success > 0) toast.success(`${success} ação(ões) executada(s)`);
    if (errors > 0) toast.error(`${errors} erro(s)`);
    await syncPayments();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Cockpit Operacional</h2>
          <p className="text-xs text-muted-foreground">
            Filas de cobranças por urgência e ações em lote
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={syncPayments} disabled={isSyncing} className="gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>

      {/* Queue Buckets */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {buckets.map((b) => (
          <Card
            key={b.key}
            className={`border-border cursor-pointer transition-all ${queueFilter === b.key ? "ring-2 ring-primary border-primary" : "hover:border-muted-foreground/30"}`}
            onClick={() => { setQueueFilter(b.key); setSelected(new Set()); }}
          >
            <CardContent className="flex items-center gap-2 pt-3 pb-3">
              <b.icon className={`h-4 w-4 ${b.color}`} />
              <div>
                <p className="text-[10px] text-muted-foreground">{b.label}</p>
                <p className="font-display text-lg font-bold">{b.payments.length}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Batch Actions Bar */}
      {selected.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between pt-3 pb-3">
            <p className="text-xs font-medium">
              {selected.size} cobrança(s) selecionada(s)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                disabled={processing}
                onClick={() => batchAction("resend")}
              >
                {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Reenviar Links
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 text-xs"
                disabled={processing}
                onClick={() => batchAction("cancel")}
              >
                {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <currentBucket.icon className={`h-4 w-4 ${currentBucket.color}`} />
            {currentBucket.label}
            <Badge variant="secondary" className="text-[10px]">{displayPayments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={displayPayments.length > 0 && selected.size === displayPayments.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground">ID</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Vencimento</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Dias Atraso</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      Nenhuma cobrança nesta fila 🎉
                    </TableCell>
                  </TableRow>
                ) : (
                  displayPayments.slice(0, 200).map((p) => {
                    const days = getDaysOverdue(p.due_date);
                    const statusConfig = PAYMENT_STATUS_CONFIG[p.status] || { label: p.status, color: "outline" as const };
                    return (
                      <TableRow key={p.id} className="border-border hover:bg-secondary/50">
                        <TableCell>
                          <Checkbox
                            checked={selected.has(p.asaas_id)}
                            onCheckedChange={() => toggleSelect(p.asaas_id)}
                          />
                        </TableCell>
                        <TableCell className="text-xs font-mono">{p.asaas_id}</TableCell>
                        <TableCell className="text-xs">
                          {BILLING_TYPE_LABELS[p.billing_type] || p.billing_type}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.color} className="text-[10px]">
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-display text-sm">
                          {formatCurrency(p.value)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.due_date}</TableCell>
                        <TableCell>
                          <Badge
                            variant={days > 7 ? "destructive" : days > 3 ? "secondary" : "outline"}
                            className="text-[10px]"
                          >
                            D+{days}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setTimelinePayment(p)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Dialog */}
      <PaymentTimelineDialog
        payment={timelinePayment}
        onClose={() => setTimelinePayment(null)}
        environment={environment}
      />
    </div>
  );
}
