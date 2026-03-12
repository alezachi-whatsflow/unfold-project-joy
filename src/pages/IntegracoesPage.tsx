import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, Puzzle } from "lucide-react";
import ProviderSelector, { type Provider } from "@/components/mensageria/ProviderSelector";
import UazapiInstancesTab from "@/components/mensageria/UazapiInstancesTab";
import WhatsAppConnectionsTab from "@/components/mensageria/WhatsAppConnectionsTab";
import MetaOficialTab from "@/components/mensageria/MetaOficialTab";
import WaConnectionsContent from "@/components/mensageria/WaConnectionsContent";

const IntegracoesPage = () => {
  const [provider, setProvider] = useState<Provider>("uazapi");
  const [activeTab, setActiveTab] = useState("conexoes");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas instâncias e conexões WhatsApp.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="conexoes" className="gap-2"><Wifi className="h-4 w-4" /> Conexões WA</TabsTrigger>
          <TabsTrigger value="provedores" className="gap-2"><Puzzle className="h-4 w-4" /> Provedores</TabsTrigger>
        </TabsList>

        <TabsContent value="conexoes" className="mt-4">
          <WaConnectionsContent />
        </TabsContent>

        <TabsContent value="provedores" className="mt-4">
          <ProviderSelector selected={provider} onChange={setProvider} />
          <div className="mt-4">
            {provider === "uazapi" && <UazapiInstancesTab />}
            {provider === "zapi" && <WhatsAppConnectionsTab />}
            {provider === "meta_oficial" && <MetaOficialTab />}
            {provider === "custom" && (
              <div className="text-center py-16 text-muted-foreground">
                <p>Provedor customizado em desenvolvimento.</p>
                <p className="text-xs mt-1">Em breve você poderá conectar Evolution API e outros provedores.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegracoesPage;
