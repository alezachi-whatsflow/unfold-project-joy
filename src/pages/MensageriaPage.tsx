import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, Receipt, ScrollText, Send, Users, Kanban, Megaphone } from "lucide-react";
import InboxTab from "@/components/mensageria/inbox/InboxTab";
import BillingRulesTab from "@/components/mensageria/BillingRulesTab";
import LogsTab from "@/components/mensageria/LogsTab";
import MessageComposer from "@/components/mensageria/MessageComposer";
import ContactChecker from "@/components/mensageria/ContactChecker";
import LeadKanban from "@/components/mensageria/LeadKanban";
import CampaignsTab from "@/components/mensageria/CampaignsTab";

const MensageriaPage = () => {
  const [activeTab, setActiveTab] = useState("inbox");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mensageria</h1>
        <p className="text-muted-foreground text-sm">Caixa de entrada, envios, campanhas, leads e contatos.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="inbox" className="gap-2"><Inbox className="h-4 w-4" /> Caixa de Entrada</TabsTrigger>
          <TabsTrigger value="enviar" className="gap-2"><Send className="h-4 w-4" /> Enviar</TabsTrigger>
          <TabsTrigger value="campanhas" className="gap-2"><Megaphone className="h-4 w-4" /> Campanhas</TabsTrigger>
          <TabsTrigger value="leads" className="gap-2"><Kanban className="h-4 w-4" /> Leads</TabsTrigger>
          <TabsTrigger value="contatos" className="gap-2"><Users className="h-4 w-4" /> Contatos</TabsTrigger>
          <TabsTrigger value="cobranca" className="gap-2"><Receipt className="h-4 w-4" /> Cobrança</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><ScrollText className="h-4 w-4" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox"><InboxTab /></TabsContent>
        <TabsContent value="enviar"><MessageComposer onClose={() => setActiveTab("inbox")} /></TabsContent>
        <TabsContent value="campanhas"><CampaignsTab /></TabsContent>
        <TabsContent value="leads"><LeadKanban /></TabsContent>
        <TabsContent value="contatos"><ContactChecker /></TabsContent>
        <TabsContent value="cobranca"><BillingRulesTab /></TabsContent>
        <TabsContent value="logs"><LogsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default MensageriaPage;
