import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AsaasPaymentsPanel } from "@/components/asaas/AsaasPaymentsPanel";
import { AsaasDunningPanel } from "@/components/asaas/AsaasDunningPanel";
import { AsaasBillingManagerPanel } from "@/components/asaas/AsaasBillingManagerPanel";
import { AsaasCockpitPanel } from "@/components/asaas/AsaasCockpitPanel";
import { AsaasReconciliationPanel } from "@/components/asaas/AsaasReconciliationPanel";
import { Receipt, Shield, Send, Gauge, ArrowLeftRight } from "lucide-react";

export default function CobrancasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Cobranças & Dunning
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie cobranças, cockpit operacional, réguas de cobrança e reconciliação
        </p>
      </div>

      <Tabs defaultValue="cockpit" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cockpit" className="gap-2 text-xs sm:text-sm">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">Cockpit</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 text-xs sm:text-sm">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Cobranças</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 text-xs sm:text-sm">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Criar</span>
          </TabsTrigger>
          <TabsTrigger value="dunning" className="gap-2 text-xs sm:text-sm">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Régua</span>
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-2 text-xs sm:text-sm">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Reconciliar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cockpit" className="mt-6">
          <AsaasCockpitPanel />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <AsaasPaymentsPanel />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <AsaasBillingManagerPanel />
        </TabsContent>

        <TabsContent value="dunning" className="mt-6">
          <AsaasDunningPanel />
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-6">
          <AsaasReconciliationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
