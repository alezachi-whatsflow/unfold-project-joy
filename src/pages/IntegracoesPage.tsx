import { useState } from "react";
import ProviderSelector, { type Provider } from "@/components/mensageria/ProviderSelector";
import UazapiInstancesTab from "@/components/mensageria/UazapiInstancesTab";
import WhatsAppConnectionsTab from "@/components/mensageria/WhatsAppConnectionsTab";

const IntegracoesPage = () => {
  const [provider, setProvider] = useState<Provider>("uazapi");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas instâncias e conexões WhatsApp.</p>
      </div>

      <ProviderSelector selected={provider} onChange={setProvider} />

      {provider === "uazapi" && <UazapiInstancesTab />}
      {provider === "zapi" && <WhatsAppConnectionsTab />}
      {provider === "custom" && (
        <div className="text-center py-16 text-muted-foreground">
          <p>Provedor customizado em desenvolvimento.</p>
          <p className="text-xs mt-1">Em breve você poderá conectar Evolution API e outros provedores.</p>
        </div>
      )}
    </div>
  );
};

export default IntegracoesPage;
