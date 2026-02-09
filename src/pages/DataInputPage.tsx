import { MonthlyInputForm } from "@/components/input/MonthlyInputForm";
import { CSVImport } from "@/components/input/CSVImport";
import { useFinancial } from "@/contexts/FinancialContext";
import { formatCurrency, getMonthLabel } from "@/lib/calculations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Database } from "lucide-react";

export default function DataInputPage() {
  const { entries, deleteEntry, setSelectedMonth } = useFinancial();

  const handleEdit = (month: string) => {
    setSelectedMonth(month);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Inserir Dados Financeiros
        </h1>
        <p className="text-sm text-muted-foreground">
          Adicione ou edite os dados financeiros mensais da Whatsflow
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        <MonthlyInputForm />
        <div className="space-y-6">
          <CSVImport />
        </div>
      </div>

      {/* Entries Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-muted-foreground" />
            Dados Registrados ({entries.length} meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">
                    Mês
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    MRR
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    Receita Total
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    Custos Totais
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    Clientes
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    Caixa
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground w-24">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const totalRevenue =
                    entry.revenue.mrr + entry.revenue.otherRevenue;
                  const totalCosts =
                    entry.costs.fixedCosts +
                    entry.costs.variableCosts +
                    entry.costs.infrastructure +
                    entry.costs.marketing +
                    entry.costs.taxes +
                    entry.personnel.payroll +
                    entry.personnel.benefits +
                    entry.personnel.contractors;

                  return (
                    <TableRow
                      key={entry.id}
                      className="border-border hover:bg-secondary/50"
                    >
                      <TableCell className="font-medium text-sm">
                        {getMonthLabel(entry.month)}
                      </TableCell>
                      <TableCell className="text-right font-display text-sm">
                        {formatCurrency(entry.revenue.mrr)}
                      </TableCell>
                      <TableCell className="text-right font-display text-sm">
                        {formatCurrency(totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right font-display text-sm text-destructive">
                        {formatCurrency(totalCosts)}
                      </TableCell>
                      <TableCell className="text-right font-display text-sm">
                        {entry.customers.totalCustomers}
                      </TableCell>
                      <TableCell className="text-right font-display text-sm">
                        {formatCurrency(entry.cashBalance)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(entry.month)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteEntry(entry.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
