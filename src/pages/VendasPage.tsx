import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Kanban, List, BarChart3, User } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useNegocios } from "@/hooks/useNegocios";
import VendasPipeline from "@/components/vendas/VendasPipeline";
import VendasLista from "@/components/vendas/VendasLista";
import VendasRelatorios from "@/components/vendas/VendasRelatorios";
import VendasMeusNegocios from "@/components/vendas/VendasMeusNegocios";

export default function VendasPage() {
  const { userRole } = usePermissions();
  const isRepresentante = userRole === 'representante';
  const defaultTab = isRepresentante ? 'meus-negocios' : 'pipeline';
  const [tab, setTab] = useState(defaultTab);

  const tabs = useMemo(() => {
    const all = [
      { value: 'pipeline', label: 'Pipeline', icon: Kanban, hidden: isRepresentante },
      { value: 'lista', label: 'Lista', icon: List, hidden: isRepresentante },
      { value: 'relatorios', label: 'Relatórios', icon: BarChart3, hidden: isRepresentante },
      { value: 'meus-negocios', label: 'Meus Negócios', icon: User, hidden: false },
    ];
    return all.filter(t => !t.hidden);
  }, [isRepresentante]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Vendas</h1>
        <p className="text-sm text-muted-foreground">Pipeline de negócios, propostas e fechamento</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs">
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="pipeline"><VendasPipeline /></TabsContent>
        <TabsContent value="lista"><VendasLista /></TabsContent>
        <TabsContent value="relatorios"><VendasRelatorios /></TabsContent>
        <TabsContent value="meus-negocios"><VendasMeusNegocios /></TabsContent>
      </Tabs>
    </div>
  );
}
