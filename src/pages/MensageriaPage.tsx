import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, Inbox, Receipt, ScrollText } from "lucide-react";
import WhatsAppConnectionsTab from "@/components/mensageria/WhatsAppConnectionsTab";
import InboxTab from "@/components/mensageria/inbox/InboxTab";
import BillingRulesTab from "@/components/mensageria/BillingRulesTab";
import LogsTab from "@/components/mensageria/LogsTab";

const MensageriaPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mensageria</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas conexões WhatsApp, caixa de entrada, réguas de cobrança e logs.</p>
      </div>

      <Tabs defaultValue="conexoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conexoes" className="gap-2"><Wifi className="h-4 w-4" /> Conexões</TabsTrigger>
          <TabsTrigger value="inbox" className="gap-2"><Inbox className="h-4 w-4" /> Caixa de Entrada</TabsTrigger>
          <TabsTrigger value="cobranca" className="gap-2"><Receipt className="h-4 w-4" /> Cobrança</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><ScrollText className="h-4 w-4" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="conexoes">
          <WhatsAppConnectionsTab />
        </TabsContent>

        <TabsContent value="inbox">
          <InboxTab />
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
