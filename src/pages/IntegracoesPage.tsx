import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, Puzzle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import ProviderSelector, { type Provider } from "@/components/mensageria/ProviderSelector";
import UazapiInstancesTab from "@/components/mensageria/UazapiInstancesTab";
import WhatsAppConnectionsTab from "@/components/mensageria/WhatsAppConnectionsTab";
import MetaOficialTab from "@/components/mensageria/MetaOficialTab";
import WaConnectionsContent from "@/components/mensageria/WaConnectionsContent";
import MetaChannelsTab from "@/components/integracoes/MetaChannelsTab";

const IntegracoesPage = () => {
  const [provider, setProvider] = useState<Provider>("uazapi");
  const [activeTab, setActiveTab] = useState("canais-meta");
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle OAuth callback success/error toasts
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) {
      const msgs: Record<string, string> = {
        whatsapp_connected: "WhatsApp conectado com sucesso!",
        whatsapp_updated: "WhatsApp reconectado com sucesso!",
        instagram_connected: "Instagram conectado com sucesso!",
        instagram_updated: "Instagram reconectado com sucesso!",
      };
      toast.success(msgs[success] || "Integração concluída!");
      setActiveTab("canais-meta");
      searchParams.delete("success");
      setSearchParams(searchParams, { replace: true });
    }
    if (error) {
      toast.error(`Erro na integração: ${decodeURIComponent(error)}`);
      setActiveTab("canais-meta");
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas conexões com WhatsApp, Instagram e outros canais.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="canais-meta" className="gap-2"><Smartphone className="h-4 w-4" /> Canais Meta</TabsTrigger>
          <TabsTrigger value="conexoes" className="gap-2"><Wifi className="h-4 w-4" /> Conexões WA</TabsTrigger>
          <TabsTrigger value="provedores" className="gap-2"><Puzzle className="h-4 w-4" /> Provedores</TabsTrigger>
        </TabsList>

        <TabsContent value="canais-meta" className="mt-4">
          <MetaChannelsTab />
        </TabsContent>

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
