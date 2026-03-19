import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Kanban, List, BarChart3, User, Settings2, CheckSquare } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import VendasPipeline from "@/components/vendas/VendasPipeline";
import VendasLista from "@/components/vendas/VendasLista";
import VendasRelatorios from "@/components/vendas/VendasRelatorios";
import VendasMeusNegocios from "@/components/vendas/VendasMeusNegocios";
import WizardLayout from "@/components/sales/wizard/WizardLayout";
import VendasAtividades from "@/components/vendas/VendasAtividades";

export default function VendasPage() {
  const { userRole } = usePermissions();
  const { profile, isLoading: profileLoading, invalidate } = useCompanyProfile();
  const isRepresentante = userRole === 'representante';
  const defaultTab = isRepresentante ? 'meus-negocios' : 'pipeline';
  const [tab, setTab] = useState(defaultTab);
  const [showWizard, setShowWizard] = useState(false);

  // Show wizard if not completed and not representante
  const shouldShowWizard = !profileLoading && !isRepresentante && (!profile || !profile.wizard_completed);

  const tabs = useMemo(() => {
    const all = [
      { value: 'pipeline', label: 'Pipeline', icon: Kanban, hidden: isRepresentante },
      { value: 'lista', label: 'Lista', icon: List, hidden: isRepresentante },
      { value: 'relatorios', label: 'Relatórios', icon: BarChart3, hidden: isRepresentante },
      { value: 'meus-negocios', label: 'Negócios Fechados', icon: User, hidden: false },
    ];
    return all.filter(t => !t.hidden);
  }, [isRepresentante]);

  const handleWizardComplete = useCallback(() => {
    invalidate();
    setShowWizard(false);
  }, [invalidate]);

  if (shouldShowWizard || showWizard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Inteligência Comercial</h1>
            <p className="text-sm text-muted-foreground">Configure o módulo de vendas em poucos passos</p>
          </div>
          {profile?.wizard_completed && (
            <button
              onClick={() => setShowWizard(false)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Voltar ao Pipeline
            </button>
          )}
        </div>
        <WizardLayout onComplete={handleWizardComplete} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Vendas</h1>
          <p className="text-sm text-muted-foreground">Pipeline de negócios, propostas e fechamento</p>
        </div>
        {!isRepresentante && (
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" /> Reconfigurar Wizard
          </button>
        )}
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
