import { MonthlyInputForm } from "@/components/input/MonthlyInputForm";
import { CSVImport } from "@/components/input/CSVImport";
import { CustomerCSVImport } from "@/components/input/CustomerCSVImport";
import { CostDetailTable } from "@/components/input/CostDetailTable";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Edit2, Database, FileSpreadsheet, Users, Package, DollarSign } from "lucide-react";

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
          Central de Importação de Dados
        </h1>
        <p className="text-sm text-muted-foreground">
          Importe e gerencie todos os dados da Whatsflow em um só lugar
        </p>
      </div>

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="financial" className="gap-2 text-xs sm:text-sm">
            <DollarSign className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2 text-xs sm:text-sm">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
        </TabsList>

        {/* ── Financial Tab ── */}
        <TabsContent value="financial" className="space-y-8 mt-6">
          <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
            <MonthlyInputForm />
            <div className="space-y-6">
              <CSVImport />
            </div>
          </div>

          <CostDetailTable />

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
                      <TableHead className="text-xs text-muted-foreground">Mês</TableHead>
                      <TableHead className="text-xs text-muted-foreground text-right">MRR</TableHead>
                      <TableHead className="text-xs text-muted-foreground text-right">Receita Total</TableHead>
                      <TableHead className="text-xs text-muted-foreground text-right">Custos Totais</TableHead>
                      <TableHead className="text-xs text-muted-foreground text-right">Clientes</TableHead>
                      <TableHead className="text-xs text-muted-foreground text-right">Caixa</TableHead>
                      <TableHead className="text-xs text-muted-foreground w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      const totalRevenue = entry.revenue.mrr + entry.revenue.otherRevenue;
                      const totalCosts =
                        entry.costs.csp + entry.costs.mkt + entry.costs.sal +
                        entry.costs.ga + entry.costs.fin + entry.costs.tax;

                      return (
                        <TableRow key={entry.id} className="border-border hover:bg-secondary/50">
                          <TableCell className="font-medium text-sm">{getMonthLabel(entry.month)}</TableCell>
                          <TableCell className="text-right font-display text-sm">{formatCurrency(entry.revenue.mrr)}</TableCell>
                          <TableCell className="text-right font-display text-sm">{formatCurrency(totalRevenue)}</TableCell>
                          <TableCell className="text-right font-display text-sm text-destructive">{formatCurrency(totalCosts)}</TableCell>
                          <TableCell className="text-right font-display text-sm">{entry.customers.totalCustomers}</TableCell>
                          <TableCell className="text-right font-display text-sm">{formatCurrency(entry.cashBalance)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(entry.month)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteEntry(entry.id)}>
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
        </TabsContent>

        {/* ── Customers Tab ── */}
        <TabsContent value="customers" className="space-y-6 mt-6">
          <CustomerCSVImport />
        </TabsContent>

        {/* ── Products Tab ── */}
        <TabsContent value="products" className="mt-6">
          <Card className="border-border border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Importar Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Em breve: importe dados de produtos e serviços via CSV.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
