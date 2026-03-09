import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, Inbox } from "lucide-react";
import WhatsAppConnectionsTab from "@/components/mensageria/WhatsAppConnectionsTab";

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
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Caixa de Entrada</p>
            <p className="text-sm">Em breve — aguardando integração com provedores.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MensageriaPage;
