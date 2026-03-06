import { useState } from "react";
import { useAsaas } from "@/contexts/AsaasContext";
import { callAsaasProxy } from "@/lib/asaasQueries";
import { PAYMENT_STATUS_CONFIG, BILLING_TYPE_LABELS } from "@/types/asaas";
import { formatCurrency } from "@/lib/calculations";
import type { DateRange } from "@/lib/asaasQueries";
import type { AsaasPayment } from "@/types/asaas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw, CreditCard, Receipt, QrCode, DollarSign,
  AlertTriangle, CheckCircle2, Clock, Pencil, CalendarIcon, Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatPeriod(range: DateRange): string {
  if (!range.earliest || !range.latest) return "Sem dados";
  const fmt = (d: string) => format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
  if (range.earliest === range.latest) return fmt(range.earliest);
  return `${fmt(range.earliest)} — ${fmt(range.latest)}`;
}

function EditPaymentDialog({
  payment,
  open,
  onOpenChange,
  environment,
  onUpdated,
}: {
  payment: AsaasPayment | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  environment: "sandbox" | "production";
  onUpdated: () => void;
}) {
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when payment changes
  const [lastId, setLastId] = useState<string | null>(null);
  if (payment && payment.asaas_id !== lastId) {
    setLastId(payment.asaas_id);
    setValue(String(payment.value));
    setDescription(payment.description || "");
    setDueDate(payment.due_date ? parseISO(payment.due_date) : undefined);
  }

  const canEdit = payment && ["PENDING", "OVERDUE"].includes(payment.status);

  const handleSave = async () => {
    if (!payment) return;
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (value && parseFloat(value) !== payment.value) payload.value = parseFloat(value);
      if (description !== (payment.description || "")) payload.description = description;
      if (dueDate) {
        const newDue = dueDate.toISOString().split("T")[0];
        if (newDue !== payment.due_date) payload.dueDate = newDue;
      }

      if (Object.keys(payload).length === 0) {
        toast.info("Nenhuma alteração detectada");
        setIsSaving(false);
        return;
      }

      await callAsaasProxy({
        endpoint: `/payments/${payment.asaas_id}`,
        method: "PUT",
        params: payload,
        environment,
      });

      toast.success("Cobrança atualizada com sucesso");
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar cobrança");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Editar Cobrança
          </DialogTitle>
        </DialogHeader>
        {payment && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{payment.asaas_id}</span>
              <Badge variant={PAYMENT_STATUS_CONFIG[payment.status]?.color || "outline"} className="text-[10px]">
                {PAYMENT_STATUS_CONFIG[payment.status]?.label || payment.status}
              </Badge>
            </div>

            {!canEdit && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs text-destructive">
                  Apenas cobranças com status Pendente ou Vencida podem ser editadas.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={!canEdit}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit}
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" /> Vencimento
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!canEdit}
                    className={cn(
                      "w-full justify-start text-left font-normal h-9 text-xs",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(d) => d && setDueDate(d)}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canEdit || isSaving} className="gap-1.5">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AsaasPaymentsPanel() {
  const { payments, stats, isSyncing, syncPayments, environment, setEnvironment, refetch } = useAsaas();
  const [editPayment, setEditPayment] = useState<AsaasPayment | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Cobranças Asaas</h2>
          <p className="text-xs text-muted-foreground">
            {payments.length} cobranças sincronizadas ({environment})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={environment} onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox</SelectItem>
              <SelectItem value="production">Produção</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={syncPayments} disabled={isSyncing} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <TooltipProvider delayDuration={200}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="border-border cursor-default">
                  <CardContent className="flex items-center gap-3 pt-4 pb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Recebido</p>
                      <p className="font-display text-base font-bold">{formatCurrency(stats.receivedValue)}</p>
                      <p className="text-[10px] text-muted-foreground">{stats.received} cobranças</p>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-semibold">Período dos recebimentos</p>
                <p>{formatPeriod(stats.receivedPeriod)}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="border-border cursor-default">
                  <CardContent className="flex items-center gap-3 pt-4 pb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Pendente</p>
                      <p className="font-display text-base font-bold">{formatCurrency(stats.pendingValue)}</p>
                      <p className="text-[10px] text-muted-foreground">{stats.pending} cobranças</p>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-semibold">Período dos pendentes</p>
                <p>{formatPeriod(stats.pendingPeriod)}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="border-border cursor-default">
                  <CardContent className="flex items-center gap-3 pt-4 pb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Vencido</p>
                      <p className="font-display text-base font-bold text-destructive">{formatCurrency(stats.overdueValue)}</p>
                      <p className="text-[10px] text-muted-foreground">{stats.overdue} cobranças</p>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-semibold">Período dos vencimentos</p>
                <p>{formatPeriod(stats.overduePeriod)}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="border-border cursor-default">
                  <CardContent className="flex items-center gap-3 pt-4 pb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                      <DollarSign className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total Geral</p>
                      <p className="font-display text-base font-bold">{formatCurrency(stats.totalValue)}</p>
                      <p className="text-[10px] text-muted-foreground">{stats.total} cobranças</p>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-semibold">Período total</p>
                <p>{formatPeriod(stats.totalPeriod)}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}

      {/* By Billing Type */}
      {stats && Object.keys(stats.byBillingType).length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(stats.byBillingType).map(([type, info]) => {
            const Icon = type === "CREDIT_CARD" ? CreditCard : type === "PIX" ? QrCode : Receipt;
            return (
              <Card key={type} className="border-border">
                <CardContent className="flex items-center gap-3 pt-4 pb-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      {BILLING_TYPE_LABELS[type as keyof typeof BILLING_TYPE_LABELS] || type}
                    </p>
                    <p className="font-display text-sm font-bold">{formatCurrency(info.value)}</p>
                    <p className="text-[10px] text-muted-foreground">{info.count} cobranças</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payments Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Últimas Cobranças
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">ID Asaas</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Vencimento</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Pagamento</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-xs text-muted-foreground w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      Nenhuma cobrança sincronizada. Clique em "Sincronizar" para importar do Asaas.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.slice(0, 100).map((p) => {
                    const statusConfig = PAYMENT_STATUS_CONFIG[p.status] || { label: p.status, color: "outline" as const };
                    const canEdit = ["PENDING", "OVERDUE"].includes(p.status);
                    return (
                      <TableRow key={p.id} className="border-border hover:bg-secondary/50">
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
                        <TableCell className="text-xs text-muted-foreground">{p.payment_date || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {p.description || "-"}
                        </TableCell>
                        <TableCell>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => { setEditPayment(p); setEditOpen(true); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
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

      {/* Edit Dialog */}
      <EditPaymentDialog
        payment={editPayment}
        open={editOpen}
        onOpenChange={setEditOpen}
        environment={environment}
        onUpdated={() => { syncPayments(); }}
      />
    </div>
  );
}
