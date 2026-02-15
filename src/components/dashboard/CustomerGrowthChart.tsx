import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useFinancial } from "@/contexts/FinancialContext";
import { getMonthLabel, formatNumber } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-xl">
      <p className="mb-1 text-sm font-medium text-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
};

export function CustomerGrowthChart() {
  const { filteredEntries } = useFinancial();

  const data = filteredEntries.map((e) => ({
    month: getMonthLabel(e.month),
    "Total Clientes": e.customers.totalCustomers,
    "Novos": e.customers.newCustomers,
    "Churned": -e.customers.churnedCustomers,
  }));

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Crescimento de Clientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barGap={2}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(215, 20%, 16%)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="hsl(215, 15%, 45%)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(215, 15%, 45%)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
            <Bar
              dataKey="Novos"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
            <Bar
              dataKey="Churned"
              fill="#ef4444"
              radius={[0, 0, 4, 4]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
