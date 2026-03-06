import { useAsaas } from "@/contexts/AsaasContext";
import { PAYMENT_STATUS_CONFIG, BILLING_TYPE_LABELS } from "@/types/asaas";
import { formatCurrency } from "@/lib/calculations";
import type { DateRange } from "@/lib/asaasQueries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatPeriod(range: DateRange): string {
  if (!range.earliest || !range.latest) return "Sem dados";
  const fmt = (d: string) => format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
  if (range.earliest === range.latest) return fmt(range.earliest);
  return `${fmt(range.earliest)} — ${fmt(range.latest)}`;
}

export function AsaasPaymentsPanel() {
  const { payments, stats, isSyncing, syncPayments, environment, setEnvironment } = useAsaas();

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      Nenhuma cobrança sincronizada. Clique em "Sincronizar" para importar do Asaas.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.slice(0, 100).map((p) => {
                    const statusConfig = PAYMENT_STATUS_CONFIG[p.status] || { label: p.status, color: "outline" as const };
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
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
