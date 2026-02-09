import { useFinancial } from "@/contexts/FinancialContext";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CostBreakdownChart } from "@/components/dashboard/CostBreakdownChart";
import { OverviewChart } from "@/components/dashboard/OverviewChart";
import { MarginTrendChart } from "@/components/dashboard/MarginTrendChart";
import { CustomerGrowthChart } from "@/components/dashboard/CustomerGrowthChart";
import { ChurnTrendChart } from "@/components/dashboard/ChurnTrendChart";
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
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Activity,
  Wallet,
  Clock,
  BarChart3,
  PenLine,
  UserPlus,
  UserMinus,
  Percent,
  PiggyBank,
} from "lucide-react";

// Tooltip descriptions for each metric
const TOOLTIPS = {
  mrr: "Receita Mensal Recorrente (MRR) — soma de toda receita previsível e recorrente gerada mensalmente por assinaturas ativas.",
  arr: "Receita Anual Recorrente (ARR) — projeção anualizada do MRR. Calculado como MRR × 12.",
  totalRevenue:
    "Receita Total — soma do MRR com outras fontes de receita não recorrentes no período.",
  netProfit:
    "Lucro Líquido — receita total menos todos os custos operacionais, pessoal, marketing e impostos.",
  cac: "Custo de Aquisição de Cliente (CAC) — investimento médio em marketing para conquistar cada novo cliente.",
  ltv: "Lifetime Value (LTV) — receita total estimada de um cliente durante todo o período de relacionamento com a empresa.",
  ltvCac:
    "Razão LTV/CAC — indica quantas vezes o valor do cliente supera o custo de aquisição. Saudável quando ≥ 3x.",
  arpu: "Receita Média por Usuário (ARPU) — MRR dividido pelo número total de clientes ativos.",
  revenueChurn:
    "Revenue Churn — percentual da receita recorrente perdida por mês devido a cancelamentos e downgrades.",
  logoChurn:
    "Logo Churn — percentual de clientes que cancelaram no mês em relação ao total de clientes.",
  customers:
    "Clientes Ativos — número total de clientes com assinatura ativa no final do período.",
  newCustomers:
    "Novos Clientes — clientes que iniciaram assinatura durante o período.",
  grossMargin:
    "Margem Bruta — percentual de receita restante após deduzir custos variáveis e infraestrutura (COGS).",
  netMargin:
    "Margem Líquida — percentual de receita restante após deduzir todos os custos e despesas operacionais.",
  ebitda:
    "EBITDA — Lucro antes de juros, impostos, depreciação e amortização. Indica a geração de caixa operacional.",
  burnRate:
    "Burn Rate — valor mensal que a empresa gasta além do que gera de receita. Zero indica cash flow positivo.",
  runway:
    "Runway — número estimado de meses que a empresa pode operar com o saldo de caixa atual, no ritmo atual de burn rate.",
};

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
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">
          Selecione um mês com dados disponíveis.
        </p>
      </div>
    );
  }

  const currentEntry = entries.find((e) => e.month === selectedMonth);
  const prevIdx = entries.findIndex((e) => e.month === selectedMonth) - 1;
  const prevEntry = prevIdx >= 0 ? entries[prevIdx] : undefined;

  const trend = (
    current: number,
    field: keyof NonNullable<typeof previousMetrics>
  ) => {
    if (!previousMetrics) return undefined;
    const prev = previousMetrics[field] as number;
    return getTrendPercent(current, prev);
  };

  const arpu =
    currentEntry && currentEntry.customers.totalCustomers > 0
      ? currentMetrics.mrr / currentEntry.customers.totalCustomers
      : 0;
  const prevArpu =
    prevEntry && prevEntry.customers.totalCustomers > 0 && previousMetrics
      ? previousMetrics.mrr / prevEntry.customers.totalCustomers
      : undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="font-display text-sm font-bold text-primary-foreground">
                W
              </span>
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-foreground">
                Whatsflow
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Dashboard Financeiro
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 w-[200px] border-border bg-secondary text-sm">
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
            <Link to="/input">
              <Button variant="outline" size="sm" className="gap-2">
                <PenLine className="h-3.5 w-3.5" />
                Inserir Dados
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-8 px-6 py-8">
        {/* Section: Receita */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <div className="h-1 w-4 rounded-full bg-primary" />
            Receita
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="MRR"
              value={formatCurrency(currentMetrics.mrr)}
              change={trend(currentMetrics.mrr, "mrr")}
              icon={DollarSign}
              accentColor="primary"
              tooltip={TOOLTIPS.mrr}
              delay={0}
            />
            <KPICard
              title="ARR"
              value={formatCurrency(currentMetrics.arr)}
              change={trend(currentMetrics.arr, "arr")}
              icon={TrendingUp}
              accentColor="primary"
              tooltip={TOOLTIPS.arr}
              delay={50}
            />
            <KPICard
              title="Receita Total"
              value={formatCurrency(currentMetrics.totalRevenue)}
              change={trend(currentMetrics.totalRevenue, "totalRevenue")}
              icon={BarChart3}
              accentColor="primary"
              tooltip={TOOLTIPS.totalRevenue}
              delay={100}
            />
            <KPICard
              title="Lucro Líquido"
              value={formatCurrency(currentMetrics.netProfit)}
              change={trend(currentMetrics.netProfit, "netProfit")}
              icon={PiggyBank}
              accentColor={
                currentMetrics.netProfit >= 0 ? "primary" : "destructive"
              }
              tooltip={TOOLTIPS.netProfit}
              delay={150}
            />
          </div>
        </section>

        {/* Section: Unit Economics */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <div className="h-1 w-4 rounded-full bg-accent" />
            Unit Economics
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="CAC"
              value={formatCurrency(currentMetrics.cac)}
              change={trend(currentMetrics.cac, "cac")}
              icon={Target}
              accentColor="warning"
              tooltip={TOOLTIPS.cac}
              delay={200}
            />
            <KPICard
              title="LTV"
              value={formatCurrency(currentMetrics.ltv)}
              change={trend(currentMetrics.ltv, "ltv")}
              icon={Activity}
              accentColor="accent"
              tooltip={TOOLTIPS.ltv}
              delay={250}
            />
            <KPICard
              title="LTV / CAC"
              value={`${currentMetrics.ltvCacRatio.toFixed(1)}x`}
              change={trend(currentMetrics.ltvCacRatio, "ltvCacRatio")}
              icon={TrendingUp}
              accentColor={
                currentMetrics.ltvCacRatio >= 3 ? "primary" : "warning"
              }
              tooltip={TOOLTIPS.ltvCac}
              delay={300}
              description={
                currentMetrics.ltvCacRatio >= 3
                  ? "Saudável (≥3x)"
                  : "Atenção (<3x)"
              }
            />
            <KPICard
              title="ARPU"
              value={formatCurrency(arpu)}
              change={
                prevArpu !== undefined
                  ? getTrendPercent(arpu, prevArpu)
                  : undefined
              }
              icon={DollarSign}
              accentColor="accent"
              tooltip={TOOLTIPS.arpu}
              delay={350}
            />
          </div>
        </section>

        {/* Section: Retenção & Clientes */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <div className="h-1 w-4 rounded-full bg-warning" />
            Retenção & Clientes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Revenue Churn"
              value={formatPercent(currentMetrics.revenueChurnRate)}
              change={
                previousMetrics
                  ? -(
                      currentMetrics.revenueChurnRate -
                      previousMetrics.revenueChurnRate
                    )
                  : undefined
              }
              icon={Percent}
              accentColor={
                currentMetrics.revenueChurnRate <= 5
                  ? "primary"
                  : "destructive"
              }
              tooltip={TOOLTIPS.revenueChurn}
              delay={400}
            />
            <KPICard
              title="Logo Churn"
              value={formatPercent(currentMetrics.logoChurnRate)}
              change={
                previousMetrics
                  ? -(
                      currentMetrics.logoChurnRate -
                      previousMetrics.logoChurnRate
                    )
                  : undefined
              }
              icon={UserMinus}
              accentColor={
                currentMetrics.logoChurnRate <= 3 ? "primary" : "destructive"
              }
              tooltip={TOOLTIPS.logoChurn}
              delay={450}
            />
            <KPICard
              title="Clientes Ativos"
              value={formatNumber(currentEntry?.customers.totalCustomers ?? 0)}
              change={
                prevEntry
                  ? getTrendPercent(
                      currentEntry?.customers.totalCustomers ?? 0,
                      prevEntry.customers.totalCustomers
                    )
                  : undefined
              }
              icon={Users}
              accentColor="accent"
              tooltip={TOOLTIPS.customers}
              delay={500}
            />
            <KPICard
              title="Novos Clientes"
              value={formatNumber(currentEntry?.customers.newCustomers ?? 0)}
              change={
                prevEntry
                  ? getTrendPercent(
                      currentEntry?.customers.newCustomers ?? 0,
                      prevEntry.customers.newCustomers
                    )
                  : undefined
              }
              icon={UserPlus}
              accentColor="primary"
              tooltip={TOOLTIPS.newCustomers}
              delay={550}
            />
          </div>
        </section>

        {/* Section: Saúde Financeira */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <div className="h-1 w-4 rounded-full bg-destructive" />
            Saúde Financeira
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KPICard
              title="Margem Bruta"
              value={formatPercent(currentMetrics.grossMargin)}
              change={trend(currentMetrics.grossMargin, "grossMargin")}
              icon={TrendingUp}
              accentColor={
                currentMetrics.grossMargin >= 60 ? "primary" : "warning"
              }
              tooltip={TOOLTIPS.grossMargin}
              delay={600}
            />
            <KPICard
              title="Margem Líquida"
              value={formatPercent(currentMetrics.netMargin)}
              change={trend(currentMetrics.netMargin, "netMargin")}
              icon={DollarSign}
              accentColor={
                currentMetrics.netMargin >= 0 ? "primary" : "destructive"
              }
              tooltip={TOOLTIPS.netMargin}
              delay={650}
            />
            <KPICard
              title="EBITDA"
              value={formatCurrency(currentMetrics.ebitda)}
              change={trend(currentMetrics.ebitda, "ebitda")}
              icon={BarChart3}
              accentColor={
                currentMetrics.ebitda >= 0 ? "primary" : "destructive"
              }
              tooltip={TOOLTIPS.ebitda}
              delay={700}
            />
            <KPICard
              title="Burn Rate"
              value={formatCurrency(currentMetrics.burnRate)}
              icon={Wallet}
              accentColor={
                currentMetrics.burnRate === 0 ? "primary" : "destructive"
              }
              tooltip={TOOLTIPS.burnRate}
              delay={750}
              description={
                currentMetrics.burnRate === 0
                  ? "Cash flow positivo"
                  : "Queimando caixa"
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
              accentColor={
                currentMetrics.runway >= 12 ? "primary" : "destructive"
              }
              tooltip={TOOLTIPS.runway}
              delay={800}
              description={
                currentMetrics.runway >= 18
                  ? "Posição confortável"
                  : currentMetrics.runway >= 12
                  ? "Monitorar de perto"
                  : "Atenção urgente"
              }
            />
          </div>
        </section>

        {/* Charts Row 1 */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <div className="h-1 w-4 rounded-full bg-primary" />
            Análise Gráfica
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <RevenueChart />
            <OverviewChart />
          </div>
        </section>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-3">
          <CostBreakdownChart />
          <MarginTrendChart />
          <ChurnTrendChart />
        </div>

        {/* Charts Row 3 */}
        <div className="grid gap-6 lg:grid-cols-1">
          <CustomerGrowthChart />
        </div>

        {/* Footer */}
        <footer className="border-t border-border pt-6 pb-4 text-center">
          <p className="text-xs text-muted-foreground">
            Whatsflow Finance Dashboard — Dados atualizados para{" "}
            {getMonthFullLabel(selectedMonth)}
          </p>
        </footer>
      </div>
    </div>
  );
}
