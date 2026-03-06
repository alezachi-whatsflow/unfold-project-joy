import { useState } from "react";
import { useFinancial } from "@/contexts/FinancialContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, FileSpreadsheet, TrendingUp, Users, DollarSign, PiggyBank, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  generateDREReport,
  generateKPIReport,
  generateCostBreakdownReport,
  generateCustomerReport,
  generateCashFlowReport,
  exportDRECSV,
  exportKPICSV,
  exportCostsCSV,
  exportCustomersCSV,
  exportCashFlowCSV,
} from "@/lib/reportUtils";

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPDF: () => Promise<void> | void;
  onCSV: () => void;
  disabled: boolean;
}

function ReportCard({ title, description, icon, onPDF, onCSV, disabled }: ReportCardProps) {
  const [loading, setLoading] = useState(false);

  const handlePDF = async () => {
    setLoading(true);
    try {
      await onPDF();
      toast.success(`${title} exportado em PDF`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleCSV = () => {
    try {
      onCSV();
      toast.success(`${title} exportado em CSV`);
    } catch {
      toast.error("Erro ao gerar CSV");
    }
  };

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-fluid-sm">{title}</CardTitle>
            <CardDescription className="text-fluid-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex gap-2 pt-0">
        <Button size="sm" onClick={handlePDF} disabled={disabled || loading} className="flex-1">
          {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileText className="mr-1 h-4 w-4" />}
          PDF
        </Button>
        <Button size="sm" variant="outline" onClick={handleCSV} disabled={disabled} className="flex-1">
          <FileSpreadsheet className="mr-1 h-4 w-4" />
          CSV
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { entries, isLoading } = useFinancial();
  const hasData = entries.length > 0;

  const reports = [
    {
      id: "dre",
      title: "DRE — Demonstrativo de Resultados",
      description: "Receitas, custos e margens por mês",
      icon: <DollarSign className="h-5 w-5" />,
      onPDF: () => generateDREReport(entries),
      onCSV: () => exportDRECSV(entries),
      category: "financeiro",
    },
    {
      id: "kpis",
      title: "KPIs SaaS",
      description: "MRR, ARR, CAC, LTV, Churn e mais",
      icon: <TrendingUp className="h-5 w-5" />,
      onPDF: () => generateKPIReport(entries),
      onCSV: () => exportKPICSV(entries),
      category: "financeiro",
    },
    {
      id: "costs",
      title: "Análise de Custos",
      description: "Decomposição por bloco contábil (CSP, MKT, SAL...)",
      icon: <PiggyBank className="h-5 w-5" />,
      onPDF: () => generateCostBreakdownReport(entries),
      onCSV: () => exportCostsCSV(entries),
      category: "financeiro",
    },
    {
      id: "customers",
      title: "Relatório de Clientes",
      description: "Evolução, novos, churn e net adds",
      icon: <Users className="h-5 w-5" />,
      onPDF: () => generateCustomerReport(entries),
      onCSV: () => exportCustomersCSV(entries),
      category: "clientes",
    },
    {
      id: "cashflow",
      title: "Fluxo de Caixa",
      description: "Posição de caixa, burn rate e runway",
      icon: <Download className="h-5 w-5" />,
      onPDF: () => generateCashFlowReport(entries),
      onCSV: () => exportCashFlowCSV(entries),
      category: "financeiro",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-fluid-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-fluid-sm text-muted-foreground">
          Exporte relatórios em PDF com logo ou CSV para análise externa
        </p>
      </div>

      {!hasData && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-fluid-sm text-muted-foreground">
              Nenhum dado financeiro encontrado. Importe dados na aba "Inserir Dados" primeiro.
            </p>
          </CardContent>
        </Card>
      )}

      {(hasData || isLoading) && (
        <Tabs defaultValue="todos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
          </TabsList>

          {["todos", "financeiro", "clientes"].map(tab => (
            <TabsContent key={tab} value={tab}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reports
                  .filter(r => tab === "todos" || r.category === tab)
                  .map(r => (
                    <ReportCard
                      key={r.id}
                      title={r.title}
                      description={r.description}
                      icon={r.icon}
                      onPDF={r.onPDF}
                      onCSV={r.onCSV}
                      disabled={!hasData || isLoading}
                    />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
