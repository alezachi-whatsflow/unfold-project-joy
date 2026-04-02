import { fmtDate } from "@/lib/dateUtils";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, FileSpreadsheet, DollarSign, CalendarDays, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSalesPeople } from "@/lib/asaasQueries";
import { formatCurrency } from "@/lib/calculations";
import type { SalesPerson } from "@/types/asaas";
import type { CommissionRule } from "@/types/commissions";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useTenantId } from "@/hooks/useTenantId";

interface SplitRow {
  id: string;
  payment_id: string;
  salesperson_id: string | null;
  wallet_id: string;
  fixed_value: number | null;
  percent_value: number | null;
  total_value: number | null;
  status: string;
  created_at: string;
}

interface PaymentRow {
  id: string;
  description: string | null;
  value: number;
  due_date: string;
  payment_date: string | null;
  created_at: string | null;
  status: string;
  customer_id: string | null;
  external_reference: string | null;
}

interface CustomerRow {
  id: string;
  name: string;
}

interface DetailedEntry {
  splitId: string;
  salesperson: SalesPerson;
  customerName: string;
  productName: string;
  saleDate: string;
  dueDate: string;
  paymentDate: string | null;
  saleValue: number;
  commissionValue: number;
  installmentNumber: number;
  type: "comissao" | "recorrente";
  status: string;
}

function getMonthOptions() {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return months;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return fmtDate(dateStr + "T00:00:00");
  } catch {
    return dateStr;
  }
}

function guessInstallment(description: string | null): number {
  if (!description) return 1;
  const match = description.match(/parcela\s*(\d+)/i) || description.match(/(\d+)\s*\/\s*\d+/);
  return match ? parseInt(match[1], 10) : 1;
}

function guessProduct(description: string | null, rules: CommissionRule[]): string {
  if (!description) return "Serviço";
  for (const rule of rules) {
    if (description.toLowerCase().includes(rule.product_name.toLowerCase())) {
      return rule.product_name;
    }
  }
  return description.length > 40 ? description.slice(0, 40) + "…" : description || "Serviço";
}

export default function CommissionClosingTab() {
  const tenantId = useTenantId();
  const [salesPeople, setSalesPeople] = useState<SalesPerson[]>([]);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [sp, { data: splitsData }, { data: paymentsData }, { data: customersData }, { data: rulesData }] = await Promise.all([
        fetchSalesPeople(tenantId || ""),
        supabase.from("asaas_splits").select("*").eq("tenant_id", tenantId || ""),
        supabase.from("asaas_payments").select("id,description,value,due_date,payment_date,created_at,status,customer_id,external_reference").eq("tenant_id", tenantId || ""),
        supabase.from("asaas_customers").select("id,name").eq("tenant_id", tenantId || ""),
        supabase.from("commission_rules").select("*").eq("tenant_id", tenantId || "").eq("is_active", true),
      ]);
      setSalesPeople(sp);
      setSplits((splitsData || []) as SplitRow[]);
      setPayments((paymentsData || []) as PaymentRow[]);
      setCustomers((customersData || []) as CustomerRow[]);
      setRules((rulesData || []) as CommissionRule[]);
      setLoading(false);
    };
    load();
  }, []);

  const monthOptions = useMemo(() => getMonthOptions(), []);

  const paymentMap = useMemo(() => {
    const m = new Map<string, PaymentRow>();
    payments.forEach((p) => m.set(p.id, p));
    return m;
  }, [payments]);

  const customerMap = useMemo(() => {
    const m = new Map<string, string>();
    customers.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [customers]);

  const spMap = useMemo(() => {
    const m = new Map<string, SalesPerson>();
    salesPeople.forEach((sp) => m.set(sp.id, sp));
    return m;
  }, [salesPeople]);

  const detailedEntries = useMemo(() => {
    const entries: DetailedEntry[] = [];

    for (const split of splits) {
      if (!split.created_at?.startsWith(selectedMonth)) continue;
      const sp = split.salesperson_id ? spMap.get(split.salesperson_id) : null;
      if (!sp) continue;

      const payment = paymentMap.get(split.payment_id);
      const customerName = payment?.customer_id ? customerMap.get(payment.customer_id) || "Cliente" : "Cliente";
      const installment = guessInstallment(payment?.description || null);
      const productName = guessProduct(payment?.description || null, rules);
      const commissionValue = split.total_value || split.fixed_value || 0;

      // Determine type based on rules
      let type: "comissao" | "recorrente" = "comissao";
      for (const rule of rules) {
        if (rule.recurring_start_installment && installment >= rule.recurring_start_installment && rule.recurring_rate_min > 0) {
          type = "recorrente";
          break;
        }
      }

      entries.push({
        splitId: split.id,
        salesperson: sp,
        customerName,
        productName,
        saleDate: payment?.created_at?.split("T")[0] || split.created_at?.split("T")[0] || "",
        dueDate: payment?.due_date || "",
        paymentDate: payment?.payment_date || null,
        saleValue: payment?.value || 0,
        commissionValue,
        installmentNumber: installment,
        type,
        status: split.status || "PENDING",
      });
    }

    return entries.sort((a, b) => a.salesperson.name.localeCompare(b.salesperson.name));
  }, [splits, selectedMonth, spMap, paymentMap, customerMap, rules]);

  const comissaoEntries = detailedEntries.filter((e) => e.type === "comissao");
  const recorrenteEntries = detailedEntries.filter((e) => e.type === "recorrente");

  const grandTotalComissao = comissaoEntries.reduce((s, e) => s + e.commissionValue, 0);
  const grandTotalRecorrente = recorrenteEntries.reduce((s, e) => s + e.commissionValue, 0);
  const grandTotal = grandTotalComissao + grandTotalRecorrente;
  const grandPending = detailedEntries.filter((e) => e.status === "PENDING").reduce((s, e) => s + e.commissionValue, 0);
  const grandPaid = detailedEntries.filter((e) => e.status !== "PENDING").reduce((s, e) => s + e.commissionValue, 0);

  const renderTable = (entries: DetailedEntry[], label: string) => (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-xs text-muted-foreground">Vendedor</TableHead>
          <TableHead className="text-xs text-muted-foreground">Cliente</TableHead>
          <TableHead className="text-xs text-muted-foreground">Produto</TableHead>
          <TableHead className="text-xs text-muted-foreground">Parcela</TableHead>
          <TableHead className="text-xs text-muted-foreground">Data Venda</TableHead>
          <TableHead className="text-xs text-muted-foreground">Vencimento</TableHead>
          <TableHead className="text-xs text-muted-foreground">Pgto Cliente</TableHead>
          <TableHead className="text-xs text-muted-foreground text-right">Valor Venda</TableHead>
          <TableHead className="text-xs text-muted-foreground text-right">{label === "comissao" ? "Comissão" : "Recorrente"}</TableHead>
          <TableHead className="text-xs text-muted-foreground text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
              Nenhum registro para o período.
            </TableCell>
          </TableRow>
        ) : (
          <>
            {entries.map((e) => (
              <TableRow key={e.splitId} className="border-border">
                <TableCell className="text-xs font-medium">{e.salesperson.name}</TableCell>
                <TableCell className="text-xs">{e.customerName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.productName}</TableCell>
                <TableCell className="text-xs text-center">{e.installmentNumber}ª</TableCell>
                <TableCell className="text-xs">{formatDate(e.saleDate)}</TableCell>
                <TableCell className="text-xs">{formatDate(e.dueDate)}</TableCell>
                <TableCell className="text-xs">{formatDate(e.paymentDate)}</TableCell>
                <TableCell className="text-right text-xs">{formatCurrency(e.saleValue)}</TableCell>
                <TableCell className="text-right text-xs font-semibold text-primary">{formatCurrency(e.commissionValue)}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={e.status === "PENDING" ? "outline" : "default"} className="text-[10px]">
                    {e.status === "PENDING" ? "Pendente" : "Pago"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-border bg-muted/30 font-semibold">
              <TableCell className="text-xs" colSpan={8}>TOTAL</TableCell>
              <TableCell className="text-right text-xs text-primary">
                {formatCurrency(entries.reduce((s, e) => s + e.commissionValue, 0))}
              </TableCell>
              <TableCell />
            </TableRow>
          </>
        )}
      </TableBody>
    </Table>
  );

  const exportCSV = () => {
    const BOM = "\uFEFF";
    const headers = ["Tipo", "Vendedor", "Cliente", "Produto", "Parcela", "Data Venda", "Vencimento", "Pgto Cliente", "Valor Venda", "Valor Comissão/Recorrente", "Status"];
    const rows = detailedEntries.map((e) => [
      e.type === "comissao" ? "Comissão" : "Recorrente",
      e.salesperson.name,
      e.customerName,
      e.productName,
      `${e.installmentNumber}ª`,
      formatDate(e.saleDate),
      formatDate(e.dueDate),
      formatDate(e.paymentDate),
      e.saleValue.toFixed(2),
      e.commissionValue.toFixed(2),
      e.status === "PENDING" ? "Pendente" : "Pago",
    ]);

    const csv = BOM + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fechamento-comissoes-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const exportPDF = () => {
    const monthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth;
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text("Whatsflow Finance", 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Relatório de Fechamento de Comissões — ${monthLabel}`, 14, 30);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 38);

    let y = 48;
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(`Total Geral: ${formatCurrency(grandTotal)}`, 14, y);
    doc.text(`Comissões: ${formatCurrency(grandTotalComissao)}`, 90, y);
    doc.text(`Recorrente: ${formatCurrency(grandTotalRecorrente)}`, 170, y);
    y += 10;

    const renderPDFTable = (entries: DetailedEntry[], title: string) => {
      if (y > 180) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setTextColor(16, 185, 129);
      doc.text(title, 14, y);
      y += 7;

      // Header
      doc.setFillColor(30, 30, 30);
      doc.rect(14, y, 269, 7, "F");
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(7);
      const cols = [16, 52, 88, 118, 135, 157, 179, 201, 228, 255];
      ["Vendedor", "Cliente", "Produto", "Parcela", "Data Venda", "Vencimento", "Pgto Cliente", "Valor Venda", "Valor", "Status"].forEach((h, i) => {
        doc.text(h, cols[i], y + 5);
      });
      y += 9;

      doc.setTextColor(60, 60, 60);
      for (const e of entries) {
        if (y > 190) { doc.addPage(); y = 20; }
        doc.text(e.salesperson.name.slice(0, 18), cols[0], y + 4);
        doc.text(e.customerName.slice(0, 18), cols[1], y + 4);
        doc.text(e.productName.slice(0, 14), cols[2], y + 4);
        doc.text(`${e.installmentNumber}ª`, cols[3], y + 4);
        doc.text(formatDate(e.saleDate), cols[4], y + 4);
        doc.text(formatDate(e.dueDate), cols[5], y + 4);
        doc.text(formatDate(e.paymentDate), cols[6], y + 4);
        doc.text(formatCurrency(e.saleValue), cols[7], y + 4);
        doc.text(formatCurrency(e.commissionValue), cols[8], y + 4);
        doc.text(e.status === "PENDING" ? "Pendente" : "Pago", cols[9], y + 4);
        y += 6;
      }
      y += 5;
    };

    if (comissaoEntries.length > 0) renderPDFTable(comissaoEntries, "Comissões (Split Direto)");
    if (recorrenteEntries.length > 0) renderPDFTable(recorrenteEntries, "Recorrente");

    doc.save(`fechamento-comissoes-${selectedMonth}.pdf`);
    toast.success("PDF exportado");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Relatório de Fechamento</h2>
          <p className="text-xs text-muted-foreground">Detalhamento de comissões e recorrente por vendedor</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48 text-xs">
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-4 pb-3">
            <div className="flex h-9 w-9 items-center justify-center bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total Geral</p>
              <p className="font-display text-lg font-bold">{formatCurrency(grandTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-4 pb-3">
            <div className="flex h-9 w-9 items-center justify-center bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Comissões</p>
              <p className="font-display text-lg font-bold">{formatCurrency(grandTotalComissao)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-4 pb-3">
            <div className="flex h-9 w-9 items-center justify-center bg-primary/10">
              <Repeat className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Recorrente</p>
              <p className="font-display text-lg font-bold">{formatCurrency(grandTotalRecorrente)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-4 pb-3">
            <div className="flex h-9 w-9 items-center justify-center bg-warning/10">
              <DollarSign className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Pendente</p>
              <p className="font-display text-lg font-bold">{formatCurrency(grandPending)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comissões Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Comissões (Split Direto)</CardTitle>
              <CardDescription className="text-xs">Parcelas com split direto ao vendedor</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderTable(comissaoEntries, "comissao")}
        </CardContent>
      </Card>

      {/* Recorrente Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" /> Recorrente
          </CardTitle>
          <CardDescription className="text-xs">Valores recorrentes por performance (a partir da parcela configurada)</CardDescription>
        </CardHeader>
        <CardContent>
          {renderTable(recorrenteEntries, "recorrente")}
        </CardContent>
      </Card>

      {/* Active Rules */}
      {rules.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Regras de Comissão Aplicadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="border border-border p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground">{rule.name}</span>
                  <Badge variant="outline" className="text-[10px]">{rule.product_name} — {formatCurrency(rule.product_price)}</Badge>
                </div>
                <div className="text-muted-foreground space-y-0.5">
                  {(rule.installment_rates || []).map((r: any, i: number) => (
                    <span key={i} className="mr-3">{r.installment}ª: <span className="text-primary">{r.percent}%</span> ({r.type === "split_direto" ? "split" : "recorrente"})</span>
                  ))}
                  {rule.recurring_rate_min > 0 && (
                    <p className="mt-1">Recorrente: {rule.recurring_rate_min}% - {rule.recurring_rate_max}% (a partir da {rule.recurring_start_installment}ª parcela)</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
