import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AsaasPaymentsPanel } from "@/components/asaas/AsaasPaymentsPanel";
import { AsaasDunningPanel } from "@/components/asaas/AsaasDunningPanel";
import { AsaasBillingManagerPanel } from "@/components/asaas/AsaasBillingManagerPanel";
import { Receipt, Shield, Send } from "lucide-react";

export default function CobrancasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Cobranças & Dunning
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie cobranças do Asaas e configure réguas de cobrança automatizadas
        </p>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments" className="gap-2 text-xs sm:text-sm">
            <Receipt className="h-4 w-4" />
            Cobranças
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 text-xs sm:text-sm">
            <Send className="h-4 w-4" />
            Criar Cobranças
          </TabsTrigger>
          <TabsTrigger value="dunning" className="gap-2 text-xs sm:text-sm">
            <Shield className="h-4 w-4" />
            Régua de Cobrança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6">
          <AsaasPaymentsPanel />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <AsaasBillingManagerPanel />
        </TabsContent>

        <TabsContent value="dunning" className="mt-6">
          <AsaasDunningPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
