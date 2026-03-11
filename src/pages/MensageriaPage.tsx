import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, Inbox, Receipt, ScrollText, Send, Users, Kanban, Server, Megaphone } from "lucide-react";
import WhatsAppConnectionsTab from "@/components/mensageria/WhatsAppConnectionsTab";
import UazapiInstancesTab from "@/components/mensageria/UazapiInstancesTab";
import InboxTab from "@/components/mensageria/inbox/InboxTab";
import BillingRulesTab from "@/components/mensageria/BillingRulesTab";
import LogsTab from "@/components/mensageria/LogsTab";
import MessageComposer from "@/components/mensageria/MessageComposer";
import ContactChecker from "@/components/mensageria/ContactChecker";
import LeadKanban from "@/components/mensageria/LeadKanban";
import CampaignsTab from "@/components/mensageria/CampaignsTab";

const MensageriaPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mensageria</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas conexões WhatsApp, instâncias uazapi, caixa de entrada, envios e leads.</p>
      </div>

      <Tabs defaultValue="uazapi" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="uazapi" className="gap-2"><Server className="h-4 w-4" /> uazapi</TabsTrigger>
          <TabsTrigger value="conexoes" className="gap-2"><Wifi className="h-4 w-4" /> Conexões</TabsTrigger>
          <TabsTrigger value="inbox" className="gap-2"><Inbox className="h-4 w-4" /> Caixa de Entrada</TabsTrigger>
          <TabsTrigger value="enviar" className="gap-2"><Send className="h-4 w-4" /> Enviar</TabsTrigger>
          <TabsTrigger value="campanhas" className="gap-2"><Megaphone className="h-4 w-4" /> Campanhas</TabsTrigger>
          <TabsTrigger value="leads" className="gap-2"><Kanban className="h-4 w-4" /> Leads</TabsTrigger>
          <TabsTrigger value="contatos" className="gap-2"><Users className="h-4 w-4" /> Contatos</TabsTrigger>
          <TabsTrigger value="cobranca" className="gap-2"><Receipt className="h-4 w-4" /> Cobrança</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><ScrollText className="h-4 w-4" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="uazapi">
          <UazapiInstancesTab />
        </TabsContent>

        <TabsContent value="conexoes">
          <WhatsAppConnectionsTab />
        </TabsContent>

        <TabsContent value="inbox">
          <InboxTab />
        </TabsContent>

        <TabsContent value="enviar">
          <MessageComposer />
        </TabsContent>

        <TabsContent value="campanhas">
          <CampaignsTab />
        </TabsContent>

        <TabsContent value="leads">
          <LeadKanban />
        </TabsContent>

        <TabsContent value="contatos">
          <ContactChecker />
        </TabsContent>

        <TabsContent value="cobranca">
          <BillingRulesTab />
        </TabsContent>

        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MensageriaPage;
