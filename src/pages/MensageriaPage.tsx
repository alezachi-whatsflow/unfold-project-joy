import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, Inbox } from "lucide-react";
import WhatsAppConnectionsTab from "@/components/mensageria/WhatsAppConnectionsTab";
import InboxTab from "@/components/mensageria/inbox/InboxTab";

const MensageriaPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mensageria</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas conexões WhatsApp e caixa de entrada.</p>
      </div>

      <Tabs defaultValue="conexoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conexoes" className="gap-2"><Wifi className="h-4 w-4" /> Conexões</TabsTrigger>
          <TabsTrigger value="inbox" className="gap-2"><Inbox className="h-4 w-4" /> Caixa de Entrada</TabsTrigger>
        </TabsList>

        <TabsContent value="conexoes">
          <WhatsAppConnectionsTab />
        </TabsContent>

        <TabsContent value="inbox">
          <InboxTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MensageriaPage;
