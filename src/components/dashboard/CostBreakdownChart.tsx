import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useFinancial } from "@/contexts/FinancialContext";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#f97316"];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="border border-border bg-popover p-3">
      <p className="text-xs text-muted-foreground">{name}</p>
      <p className="text-sm font-bold text-foreground">
        {formatCurrency(value)}
      </p>
    </div>
  );
};

export function CostBreakdownChart() {
  const { filteredEntries } = useFinancial();
  if (filteredEntries.length === 0) return null;

  const avg = (fn: (e: typeof filteredEntries[0]) => number) =>
    filteredEntries.reduce((s, e) => s + fn(e), 0) / filteredEntries.length;

  const data = [
    { name: "CSP (Custo de Serviço)", value: avg((e) => e.costs.csp) },
    { name: "MKT (Marketing)", value: avg((e) => e.costs.mkt) },
    { name: "SAL (Pessoal)", value: avg((e) => e.costs.sal) },
    { name: "G&A (Administrativo)", value: avg((e) => e.costs.ga) },
    { name: "FIN (Financeiro)", value: avg((e) => e.costs.fin) },
    { name: "TAX (Impostos)", value: avg((e) => e.costs.tax) },
    { name: "REV- (Deduções)", value: avg((e) => e.costs.revDeductions) },
  ].filter((d) => d.value > 0);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Distribuição de Custos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
