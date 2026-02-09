import { useFinancial } from "@/contexts/FinancialContext";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CostBreakdownChart } from "@/components/dashboard/CostBreakdownChart";
import { OverviewChart } from "@/components/dashboard/OverviewChart";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  getMonthFullLabel,
  getTrendPercent,
} from "@/lib/calculations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Activity,
  Wallet,
  Clock,
  BarChart3,
} from "lucide-react";

export default function DashboardPage() {
  const {
    currentMetrics,
    previousMetrics,
    selectedMonth,
    setSelectedMonth,
    entries,
  } = useFinancial();

  if (!currentMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Selecione um mês com dados disponíveis.
        </p>
      </div>
    );
  }

  const trend = (current: number, field: keyof typeof previousMetrics) => {
    if (!previousMetrics) return undefined;
    const prev = previousMetrics[field] as number;
    return getTrendPercent(current, prev);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Dashboard Financeiro
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão geral das métricas SaaS da Whatsflow
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px] bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entries.map((e) => (
              <SelectItem key={e.month} value={e.month}>
                {getMonthFullLabel(e.month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="MRR"
          value={formatCurrency(currentMetrics.mrr)}
          change={trend(currentMetrics.mrr, "mrr")}
          icon={DollarSign}
          accentColor="primary"
          delay={0}
        />
        <KPICard
          title="ARR"
          value={formatCurrency(currentMetrics.arr)}
          change={trend(currentMetrics.arr, "arr")}
          icon={TrendingUp}
          accentColor="primary"
          delay={50}
        />
        <KPICard
          title="Clientes Ativos"
          value={formatNumber(
            entries.find((e) => e.month === selectedMonth)?.customers
              .totalCustomers ?? 0
          )}
          change={
            previousMetrics
              ? getTrendPercent(
                  entries.find((e) => e.month === selectedMonth)?.customers
                    .totalCustomers ?? 0,
                  entries[
                    entries.findIndex((e) => e.month === selectedMonth) - 1
                  ]?.customers.totalCustomers
                )
              : undefined
          }
          icon={Users}
          accentColor="accent"
          delay={100}
        />
        <KPICard
          title="Receita Total"
          value={formatCurrency(currentMetrics.totalRevenue)}
          change={trend(currentMetrics.totalRevenue, "totalRevenue")}
          icon={BarChart3}
          accentColor="primary"
          delay={150}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="CAC"
          value={formatCurrency(currentMetrics.cac)}
          change={trend(currentMetrics.cac, "cac")}
          icon={Target}
          accentColor="warning"
          delay={200}
        />
        <KPICard
          title="LTV"
          value={formatCurrency(currentMetrics.ltv)}
          change={trend(currentMetrics.ltv, "ltv")}
          icon={Activity}
          accentColor="accent"
          delay={250}
        />
        <KPICard
          title="LTV / CAC"
          value={`${currentMetrics.ltvCacRatio.toFixed(1)}x`}
          change={trend(currentMetrics.ltvCacRatio, "ltvCacRatio")}
          icon={TrendingUp}
          accentColor={currentMetrics.ltvCacRatio >= 3 ? "primary" : "warning"}
          delay={300}
          description={
            currentMetrics.ltvCacRatio >= 3 ? "Saudável (≥3x)" : "Atenção (<3x)"
          }
        />
        <KPICard
          title="Revenue Churn"
          value={formatPercent(currentMetrics.revenueChurnRate)}
          change={
            previousMetrics
              ? -(currentMetrics.revenueChurnRate - previousMetrics.revenueChurnRate)
              : undefined
          }
          icon={Activity}
          accentColor={
            currentMetrics.revenueChurnRate <= 5 ? "primary" : "destructive"
          }
          delay={350}
        />
      </div>

      {/* Financial KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Margem Bruta"
          value={formatPercent(currentMetrics.grossMargin)}
          change={trend(currentMetrics.grossMargin, "grossMargin")}
          icon={TrendingUp}
          accentColor={currentMetrics.grossMargin >= 60 ? "primary" : "warning"}
          delay={400}
        />
        <KPICard
          title="Margem Líquida"
          value={formatPercent(currentMetrics.netMargin)}
          change={trend(currentMetrics.netMargin, "netMargin")}
          icon={DollarSign}
          accentColor={currentMetrics.netMargin >= 0 ? "primary" : "destructive"}
          delay={450}
        />
        <KPICard
          title="Burn Rate"
          value={formatCurrency(currentMetrics.burnRate)}
          icon={Wallet}
          accentColor={
            currentMetrics.burnRate === 0 ? "primary" : "destructive"
          }
          delay={500}
          description={
            currentMetrics.burnRate === 0 ? "Cash flow positivo" : "Queimando caixa"
          }
        />
        <KPICard
          title="Runway"
          value={
            currentMetrics.runway >= 999
              ? "∞"
              : `${currentMetrics.runway.toFixed(0)} meses`
          }
          icon={Clock}
          accentColor={currentMetrics.runway >= 12 ? "primary" : "destructive"}
          delay={550}
          description={
            currentMetrics.runway >= 18
              ? "Posição confortável"
              : currentMetrics.runway >= 12
              ? "Monitorar de perto"
              : "Atenção urgente"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <CostBreakdownChart />
      </div>

      <OverviewChart />
    </div>
  );
}
