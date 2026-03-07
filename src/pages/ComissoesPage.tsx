import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Settings2, FileText } from "lucide-react";
import CommissionDashboardTab from "@/components/comissoes/CommissionDashboardTab";
import CommissionRulesTab from "@/components/comissoes/CommissionRulesTab";
import CommissionClosingTab from "@/components/comissoes/CommissionClosingTab";

export default function ComissoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Comissões
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestão de comissões por vendedor — regras, splits e fechamento mensal
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <Settings2 className="h-3.5 w-3.5" /> Regras de Comissão
          </TabsTrigger>
          <TabsTrigger value="closing" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Fechamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <CommissionDashboardTab />
        </TabsContent>

        <TabsContent value="rules">
          <CommissionRulesTab />
        </TabsContent>

        <TabsContent value="closing">
          <CommissionClosingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
