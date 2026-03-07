import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, BarChart3, Receipt, ShieldCheck, Settings, Construction } from "lucide-react";
import TributosTab from "@/components/fiscal/TributosTab";
import CertificadosTab from "@/components/fiscal/CertificadosTab";
import ConfiguracoesFiscaisTab from "@/components/fiscal/ConfiguracoesFiscaisTab";

const tabs = [
  { value: "visao-geral", label: "Visão Geral", icon: BarChart3 },
  { value: "notas-fiscais", label: "Notas Fiscais", icon: FileText },
  { value: "tributos", label: "Tributos", icon: Receipt },
  { value: "certificados", label: "Certificados", icon: ShieldCheck },
  { value: "configuracoes", label: "Configurações Fiscais", icon: Settings },
];

function PlaceholderTab({ label, Icon }: { label: string; Icon: React.ElementType }) {
  return (
    <Card className="border-border/40" style={{ borderRadius: 12 }}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
        <div className="rounded-full p-4 bg-primary/10">
          <Icon className="h-8 w-8 text-primary opacity-70" />
        </div>
        <Construction className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground/60">Em construção — próxima fase</p>
      </CardContent>
    </Card>
  );
}

export default function FiscalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão Fiscal</h1>
        <p className="text-sm text-muted-foreground">
          Notas fiscais, certificados digitais, tributos municipais, estaduais e federais
        </p>
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/30">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs sm:text-sm">
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.value === "tributos" ? (
              <TributosTab />
            ) : tab.value === "certificados" ? (
              <CertificadosTab />
            ) : (
              <PlaceholderTab label={tab.label} Icon={tab.icon} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}