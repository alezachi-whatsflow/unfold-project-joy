import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, FileSpreadsheet, Download, DollarSign, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSalesPeople } from "@/lib/asaasQueries";
import { formatCurrency } from "@/lib/calculations";
import type { SalesPerson } from "@/types/asaas";
import type { CommissionRule } from "@/types/commissions";
import { toast } from "sonner";
import jsPDF from "jspdf";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

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

export default function CommissionClosingTab() {
  const [salesPeople, setSalesPeople] = useState<SalesPerson[]>([]);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [sp, { data: splitsData }, { data: rulesData }] = await Promise.all([
        fetchSalesPeople(),
        supabase.from("asaas_splits").select("*").eq("tenant_id", DEFAULT_TENANT_ID),
        supabase.from("commission_rules").select("*").eq("tenant_id", DEFAULT_TENANT_ID).eq("is_active", true),
      ]);
      setSalesPeople(sp);
      setSplits((splitsData || []) as SplitRow[]);
      setRules((rulesData || []) as CommissionRule[]);
      setLoading(false);
    };
    load();
  }, []);

  const monthOptions = useMemo(() => getMonthOptions(), []);

  const filteredSplits = useMemo(() => {
    return splits.filter((s) => s.created_at?.startsWith(selectedMonth));
  }, [splits, selectedMonth]);

  const closingData = useMemo(() => {
    return salesPeople.map((sp) => {
      const personSplits = filteredSplits.filter((s) => s.salesperson_id === sp.id);
      const totalValue = personSplits.reduce((sum, s) => sum + (s.total_value || s.fixed_value || 0), 0);
      const pendingValue = personSplits.filter((s) => s.status === "PENDING").reduce((sum, s) => sum + (s.total_value || s.fixed_value || 0), 0);
      const paidValue = personSplits.filter((s) => s.status !== "PENDING").reduce((sum, s) => sum + (s.total_value || s.fixed_value || 0), 0);
      return {
        salesperson: sp,
        splits: personSplits,
        totalValue,
        pendingValue,
        paidValue,
        count: personSplits.length,
      };
    }).filter((d) => d.count > 0 || true); // show all salespeople
  }, [salesPeople, filteredSplits]);

  const grandTotal = closingData.reduce((s, d) => s + d.totalValue, 0);
  const grandPending = closingData.reduce((s, d) => s + d.pendingValue, 0);
  const grandPaid = closingData.reduce((s, d) => s + d.paidValue, 0);

  const exportCSV = () => {
    const monthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth;
    const BOM = "\uFEFF";
    const headers = ["Vendedor", "Email", "Wallet ID", "Comissão Padrão (%)", "Splits no Mês", "Total Pendente", "Total Pago", "Total Geral"];
    const rows = closingData.map((d) => [
      d.salesperson.name,
      d.salesperson.email || "",
      d.salesperson.asaas_wallet_id || "",
      d.salesperson.commission_percent,
      d.count,
      d.pendingValue.toFixed(2),
      d.paidValue.toFixed(2),
      d.totalValue.toFixed(2),
    ]);
    rows.push(["TOTAL", "", "", "", closingData.reduce((s, d) => s + d.count, 0), grandPending.toFixed(2), grandPaid.toFixed(2), grandTotal.toFixed(2)] as any);

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

  const exportPDF = async () => {
    const monthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129); // primary green
    doc.text("Whatsflow Finance", 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Relatório de Fechamento de Comissões — ${monthLabel}`, 14, 30);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 38);

    let y = 48;

    // Summary
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(`Total Geral: ${formatCurrency(grandTotal)}`, 14, y);
    doc.text(`Pendente: ${formatCurrency(grandPending)}`, 80, y);
    doc.text(`Pago: ${formatCurrency(grandPaid)}`, 140, y);
    y += 10;

    // Table header
    doc.setFillColor(30, 30, 30);
    doc.rect(14, y, 182, 8, "F");
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    const cols = [14, 60, 100, 130, 160];
    doc.text("Vendedor", cols[0] + 2, y + 5.5);
    doc.text("Email", cols[1] + 2, y + 5.5);
    doc.text("Splits", cols[2] + 2, y + 5.5);
    doc.text("Pendente", cols[3] + 2, y + 5.5);
    doc.text("Total", cols[4] + 2, y + 5.5);
    y += 10;

    doc.setTextColor(60, 60, 60);
    for (const d of closingData) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(d.salesperson.name, cols[0] + 2, y + 4);
      doc.text(d.salesperson.email || "-", cols[1] + 2, y + 4);
      doc.text(String(d.count), cols[2] + 2, y + 4);
      doc.text(formatCurrency(d.pendingValue), cols[3] + 2, y + 4);
      doc.text(formatCurrency(d.totalValue), cols[4] + 2, y + 4);
      y += 7;
    }

    // Rules info
    if (rules.length > 0) {
      y += 8;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text("Regras de Comissão Ativas", 14, y);
      y += 7;
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      for (const rule of rules) {
        if (y > 275) { doc.addPage(); y = 20; }
        const ratesStr = (rule.installment_rates || []).map((r: any) => `${r.installment}ª: ${r.percent}%`).join(", ");
        doc.text(`• ${rule.name} — ${rule.product_name} (${formatCurrency(rule.product_price)})`, 14, y);
        y += 5;
        if (ratesStr) {
          doc.text(`  Split: ${ratesStr}`, 14, y);
          y += 5;
        }
        if (rule.recurring_rate_min > 0) {
          doc.text(`  Recorrente: ${rule.recurring_rate_min}% - ${rule.recurring_rate_max}% (a partir da ${rule.recurring_start_installment}ª parcela)`, 14, y);
          y += 5;
        }
        y += 2;
      }
    }

    doc.save(`fechamento-comissoes-${selectedMonth}.pdf`);
    toast.success("PDF exportado");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Relatório de Fechamento</h2>
          <p className="text-xs text-muted-foreground">Consolidação mensal de comissões para pagamento</p>
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

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-4 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total no Mês</p>
              <p className="font-display text-lg font-bold">{formatCurrency(grandTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-4 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
              <DollarSign className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Pendente</p>
              <p className="font-display text-lg font-bold">{formatCurrency(grandPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-4 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Pago</p>
              <p className="font-display text-lg font-bold">{formatCurrency(grandPaid)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Closing Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Fechamento por Vendedor</CardTitle>
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
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">Vendedor</TableHead>
                <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs text-muted-foreground text-center">Splits</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Pendente</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Pago</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closingData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum dado para o período selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {closingData.map((d) => (
                    <TableRow key={d.salesperson.id} className="border-border">
                      <TableCell className="text-xs font-medium">{d.salesperson.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.salesperson.email || "-"}</TableCell>
                      <TableCell className="text-center text-xs">{d.count}</TableCell>
                      <TableCell className="text-right text-xs text-warning">{formatCurrency(d.pendingValue)}</TableCell>
                      <TableCell className="text-right text-xs text-primary">{formatCurrency(d.paidValue)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{formatCurrency(d.totalValue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-border bg-muted/30 font-semibold">
                    <TableCell className="text-xs" colSpan={2}>TOTAL</TableCell>
                    <TableCell className="text-center text-xs">{closingData.reduce((s, d) => s + d.count, 0)}</TableCell>
                    <TableCell className="text-right text-xs text-warning">{formatCurrency(grandPending)}</TableCell>
                    <TableCell className="text-right text-xs text-primary">{formatCurrency(grandPaid)}</TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(grandTotal)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Rules */}
      {rules.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Regras de Comissão Aplicadas</CardTitle>
            <CardDescription className="text-xs">Regras ativas que impactam o fechamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-md border border-border p-3 text-xs">
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
