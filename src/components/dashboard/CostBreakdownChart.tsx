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

const COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-xl">
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

  // Average costs across filtered entries
  const avg = (fn: (e: typeof filteredEntries[0]) => number) =>
    filteredEntries.reduce((s, e) => s + fn(e), 0) / filteredEntries.length;

  const data = [
    { name: "Custos Fixos", value: avg((e) => e.costs.fixedCosts) },
    { name: "Custos Variáveis", value: avg((e) => e.costs.variableCosts) },
    { name: "Infraestrutura", value: avg((e) => e.costs.infrastructure) },
    { name: "Marketing", value: avg((e) => e.costs.marketing) },
    { name: "Impostos", value: avg((e) => e.costs.taxes) },
    {
      name: "Pessoal",
      value: avg(
        (e) =>
          e.personnel.payroll + e.personnel.benefits + e.personnel.contractors
      ),
    },
  ];

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
