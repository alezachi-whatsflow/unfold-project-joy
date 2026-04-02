import { fmtDate } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSalesPeople } from "@/lib/asaasQueries";
import { formatCurrency } from "@/lib/calculations";
import type { SalesPerson } from "@/types/asaas";
import { toast } from "sonner";
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

interface CommissionSummary {
  salesperson: SalesPerson;
  totalPending: number;
  totalPaid: number;
  countPending: number;
  countPaid: number;
}

export default function CommissionDashboardTab() {
  const tenantId = useTenantId();
  const [salesPeople, setSalesPeople] = useState<SalesPerson[]>([]);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sp, { data: splitsData }] = await Promise.all([
        fetchSalesPeople(tenantId || ""),
        supabase
          .from("asaas_splits")
          .select("*")
          .eq("tenant_id", tenantId || "")
          .order("created_at", { ascending: false }),
      ]);
      setSalesPeople(sp);
      setSplits((splitsData || []) as SplitRow[]);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados de comissões");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const summaries: CommissionSummary[] = salesPeople.map((sp) => {
    const personSplits = splits.filter((s) => s.salesperson_id === sp.id);
    const pending = personSplits.filter((s) => s.status === "PENDING");
    const paid = personSplits.filter((s) => s.status !== "PENDING");
    return {
      salesperson: sp,
      totalPending: pending.reduce((sum, s) => sum + (s.total_value || s.fixed_value || 0), 0),
      totalPaid: paid.reduce((sum, s) => sum + (s.total_value || s.fixed_value || 0), 0),
      countPending: pending.length,
      countPaid: paid.length,
    };
  });

  const totalPending = summaries.reduce((s, c) => s + c.totalPending, 0);
  const totalPaid = summaries.reduce((s, c) => s + c.totalPaid, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-4 pb-3">
            <div className="flex h-9 w-9 items-center justify-center bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Vendedores Ativos</p>
              <p className="font-display text-lg font-bold">{salesPeople.filter((s) => s.is_active).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-4 pb-3">
            <div className="flex h-9 w-9 items-center justify-center bg-warning/10">
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Comissões Pendentes</p>
              <p className="font-display text-lg font-bold">{formatCurrency(totalPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-4 pb-3">
            <div className="flex h-9 w-9 items-center justify-center bg-primary/10">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Comissões Pagas</p>
              <p className="font-display text-lg font-bold">{formatCurrency(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Salesperson Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Resumo por Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">Vendedor</TableHead>
                <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs text-muted-foreground">Comissão Padrão</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Pendente</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Pago</TableHead>
                <TableHead className="text-xs text-muted-foreground text-center">Splits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum vendedor cadastrado. Cadastre vendedores em Configurações.
                  </TableCell>
                </TableRow>
              ) : (
                summaries.map((s) => (
                  <TableRow key={s.salesperson.id} className="border-border">
                    <TableCell className="text-xs font-medium">{s.salesperson.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.salesperson.email || "-"}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {s.salesperson.commission_percent}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-warning">
                      {formatCurrency(s.totalPending)}
                      {s.countPending > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-1">({s.countPending})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-primary">
                      {formatCurrency(s.totalPaid)}
                      {s.countPaid > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-1">({s.countPaid})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {s.countPending + s.countPaid}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Splits */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Últimos Splits</CardTitle>
          <CardDescription className="text-xs">Detalhamento dos splits recentes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">Data</TableHead>
                <TableHead className="text-xs text-muted-foreground">Vendedor</TableHead>
                <TableHead className="text-xs text-muted-foreground">Wallet</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Valor</TableHead>
                <TableHead className="text-xs text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {splits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum split registrado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                splits.slice(0, 50).map((s) => {
                  const person = salesPeople.find((sp) => sp.id === s.salesperson_id);
                  return (
                    <TableRow key={s.id} className="border-border">
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(s.created_at)}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{person?.name || "-"}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{s.wallet_id}</TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatCurrency(s.total_value || s.fixed_value || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === "PENDING" ? "secondary" : "default"} className="text-[10px]">
                          {s.status === "PENDING" ? "Pendente" : "Pago"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
