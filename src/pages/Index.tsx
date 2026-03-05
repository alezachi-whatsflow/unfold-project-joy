import { PERIOD_OPTIONS, AnalysisPeriod } from "@/contexts/FinancialContext";
import { useEnrichedMetrics } from "@/hooks/useEnrichedMetrics";
import { useAsaas } from "@/contexts/AsaasContext";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  CalendarRange,
  CreditCard,
  QrCode,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { BILLING_TYPE_LABELS } from "@/types/asaas";

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
    periodMetrics,
    previousMetrics,
    selectedMonth,
    setSelectedMonth,
    analysisPeriod,
    setAnalysisPeriod,
    entries,
    filteredEntries,
    isLoading,
    customerMRR,
    activeCount,
  } = useEnrichedMetrics();
  const { stats } = useAsaas();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!periodMetrics) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Nenhum dado disponível. Insira dados financeiros para começar.
          </p>
          <Link to="/input">
            <Button className="gap-2">
              <PenLine className="h-4 w-4" />
              Inserir Dados
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const metrics = periodMetrics;
  const mrr = metrics.mrr;
  const arr = metrics.arr;
  const totalCustomers = activeCount > 0 ? activeCount : 0;
  const newCustomers = filteredEntries.length > 0
    ? filteredEntries.reduce((s, e) => s + e.customers.newCustomers, 0) /
      filteredEntries.length
    : 0;
  const arpu = totalCustomers > 0 ? mrr / totalCustomers : 0;
  const { totalRevenue, netProfit, grossMargin, netMargin, ebitda, burnRate, runway, cac, ltv, ltvCacRatio } = metrics;

  const trend = (
    current: number,
    field: keyof NonNullable<typeof previousMetrics>
  ) => {
    if (!previousMetrics || analysisPeriod > 1) return undefined;
    const prev = previousMetrics[field] as number;
    return getTrendPercent(current, prev);
  };

  const periodLabel = PERIOD_OPTIONS.find(
    (p) => p.value === analysisPeriod
  )?.label;

  return (
    <div className="min-h-screen bg-background">
      {/* Period & Month Selectors */}
      <div className="mx-auto flex max-w-[1600px] items-center justify-end gap-3 px-6 pt-4">
        <Select
          value={String(analysisPeriod)}
          onValueChange={(v) =>
            setAnalysisPeriod(Number(v) as AnalysisPeriod)
          }
        >
          <SelectTrigger className="h-9 w-[160px] border-border bg-secondary text-sm">
            <CalendarRange className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={String(p.value)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      </div>

      <div className="mx-auto max-w-[1600px] space-y-8 px-6 py-8">
        {/* Period info banner */}
        {analysisPeriod > 1 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2 text-xs text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            Análise {periodLabel}: média dos últimos {filteredEntries.length}{" "}
            meses até {getMonthFullLabel(selectedMonth)}
          </div>
        )}

        {/* Section: Receita */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <div className="h-1 w-4 rounded-full bg-primary" />
            Receita
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
             <KPICard
              title="MRR"
              value={formatCurrency(mrr)}
              change={trend(metrics.mrr, "mrr")}
              icon={DollarSign}
              accentColor="primary"
              tooltip={TOOLTIPS.mrr}
              delay={0}
            />
            <KPICard
              title="ARR"
              value={formatCurrency(arr)}
              change={trend(metrics.arr, "arr")}
              icon={TrendingUp}
              accentColor="primary"
              tooltip={TOOLTIPS.arr}
              delay={50}
            />
            <KPICard
              title="Receita Total"
              value={formatCurrency(totalRevenue)}
              change={trend(totalRevenue, "totalRevenue")}
              icon={BarChart3}
              accentColor="primary"
              tooltip={TOOLTIPS.totalRevenue}
              delay={100}
            />
            <KPICard
              title="Lucro Líquido"
              value={formatCurrency(netProfit)}
              change={trend(netProfit, "netProfit")}
              icon={PiggyBank}
              accentColor={
                netProfit >= 0 ? "primary" : "destructive"
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
              value={formatCurrency(cac)}
              change={trend(cac, "cac")}
              icon={Target}
              accentColor="warning"
              tooltip={TOOLTIPS.cac}
              delay={200}
            />
            <KPICard
              title="LTV"
              value={formatCurrency(ltv)}
              change={trend(ltv, "ltv")}
              icon={Activity}
              accentColor="accent"
              tooltip={TOOLTIPS.ltv}
              delay={250}
            />
            <KPICard
              title="LTV / CAC"
              value={`${ltvCacRatio.toFixed(1)}x`}
              change={trend(ltvCacRatio, "ltvCacRatio")}
              icon={TrendingUp}
              accentColor={
                ltvCacRatio >= 3 ? "primary" : "warning"
              }
              tooltip={TOOLTIPS.ltvCac}
              delay={300}
              description={
                ltvCacRatio >= 3
                  ? "Saudável (≥3x)"
                  : "Atenção (<3x)"
              }
            />
            <KPICard
              title="ARPU"
              value={formatCurrency(arpu)}
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
              value={formatPercent(metrics.revenueChurnRate)}
              change={
                analysisPeriod === 1 && previousMetrics
                  ? -(
                      metrics.revenueChurnRate -
                      previousMetrics.revenueChurnRate
                    )
                  : undefined
              }
              icon={Percent}
              accentColor={
                metrics.revenueChurnRate <= 5
                  ? "primary"
                  : "destructive"
              }
              tooltip={TOOLTIPS.revenueChurn}
              delay={400}
            />
            <KPICard
              title="Logo Churn"
              value={formatPercent(metrics.logoChurnRate)}
              change={
                analysisPeriod === 1 && previousMetrics
                  ? -(
                      metrics.logoChurnRate -
                      previousMetrics.logoChurnRate
                    )
                  : undefined
              }
              icon={UserMinus}
              accentColor={
                metrics.logoChurnRate <= 3 ? "primary" : "destructive"
              }
              tooltip={TOOLTIPS.logoChurn}
              delay={450}
            />
            <KPICard
              title="Clientes Ativos"
              value={formatNumber(totalCustomers)}
              icon={Users}
              accentColor="accent"
              tooltip={TOOLTIPS.customers}
              delay={500}
            />
            <KPICard
              title="Novos Clientes"
              value={formatNumber(Math.round(newCustomers))}
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
              value={formatPercent(grossMargin)}
              change={trend(grossMargin, "grossMargin")}
              icon={TrendingUp}
              accentColor={
                grossMargin >= 60 ? "primary" : "warning"
              }
              tooltip={TOOLTIPS.grossMargin}
              delay={600}
            />
            <KPICard
              title="Margem Líquida"
              value={formatPercent(netMargin)}
              change={trend(netMargin, "netMargin")}
              icon={DollarSign}
              accentColor={
                netMargin >= 0 ? "primary" : "destructive"
              }
              tooltip={TOOLTIPS.netMargin}
              delay={650}
            />
            <KPICard
              title="EBITDA"
              value={formatCurrency(ebitda)}
              change={trend(ebitda, "ebitda")}
              icon={BarChart3}
              accentColor={
                ebitda >= 0 ? "primary" : "destructive"
              }
              tooltip={TOOLTIPS.ebitda}
              delay={700}
            />
            <KPICard
              title="Burn Rate"
              value={formatCurrency(burnRate)}
              icon={Wallet}
              accentColor={
                burnRate === 0 ? "primary" : "destructive"
              }
              tooltip={TOOLTIPS.burnRate}
              delay={750}
              description={
                burnRate === 0
                  ? "Cash flow positivo"
                  : "Queimando caixa"
              }
            />
            <KPICard
              title="Runway"
              value={
                runway >= 999
                  ? "∞"
                  : `${runway.toFixed(0)} meses`
              }
              icon={Clock}
              accentColor={
                runway >= 12 ? "primary" : "destructive"
              }
              tooltip={TOOLTIPS.runway}
              delay={800}
              description={
                runway >= 18
                  ? "Posição confortável"
                  : runway >= 12
                  ? "Monitorar de perto"
                  : "Atenção urgente"
              }
            />
          </div>
        </section>

        {/* Asaas Revenue Section */}
        {stats && stats.total > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <div className="h-1 w-4 rounded-full bg-accent" />
              Cobranças (Asaas)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard
                title="Receita Recebida"
                value={formatCurrency(stats.receivedValue)}
                icon={DollarSign}
                accentColor="primary"
                tooltip="Total de cobranças com status recebido/confirmado no Asaas"
                delay={0}
                description={`${stats.received} cobranças`}
              />
              <KPICard
                title="Pendente"
                value={formatCurrency(stats.pendingValue)}
                icon={Clock}
                accentColor="warning"
                tooltip="Total de cobranças pendentes de pagamento"
                delay={50}
                description={`${stats.pending} cobranças`}
              />
              <KPICard
                title="Inadimplência"
                value={formatCurrency(stats.overdueValue)}
                icon={AlertTriangle}
                accentColor="destructive"
                tooltip="Total de cobranças vencidas e não pagas"
                delay={100}
                description={`${stats.overdue} cobranças (${stats.total > 0 ? ((stats.overdue / stats.total) * 100).toFixed(1) : 0}%)`}
              />
              <KPICard
                title="Taxa Inadimplência"
                value={formatPercent(stats.total > 0 ? (stats.overdueValue / stats.totalValue) * 100 : 0)}
                icon={Percent}
                accentColor={stats.total > 0 && (stats.overdueValue / stats.totalValue) * 100 > 10 ? "destructive" : "primary"}
                tooltip="Percentual do valor total que está em atraso"
                delay={150}
              />
            </div>
            {Object.keys(stats.byBillingType).length > 0 && (
              <div className="grid gap-3 sm:grid-cols-3 mt-4">
                {Object.entries(stats.byBillingType).map(([type, info]) => {
                  const Icon = type === "CREDIT_CARD" ? CreditCard : type === "PIX" ? QrCode : FileText;
                  return (
                    <Card key={type} className="border-border">
                      <CardContent className="flex items-center gap-3 pt-4 pb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
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
          </section>
        )}

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
            Whatsflow Finance Dashboard — {periodLabel} até{" "}
            {getMonthFullLabel(selectedMonth)}
          </p>
        </footer>
      </div>
    </div>
  );
}
