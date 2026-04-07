/**
 * MassSendHub — Unified "Envios em Massa" hub.
 * Combines: New Send (composer), Campaign History, and Active Campaigns.
 */
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, History, Megaphone, BarChart3 } from "lucide-react"
import MessageComposer from "./MessageComposer"
import CampaignsTab from "./CampaignsTab"
import UsageReportTable from "@/components/reports/UsageReportTable"

interface MassSendHubProps {
  onClose?: () => void
}

export default function MassSendHub({ onClose }: MassSendHubProps) {
  const [tab, setTab] = useState("novo")

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Envios em Massa
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Crie envios, gerencie campanhas e acompanhe resultados
        </p>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="novo" className="text-xs gap-1.5">
              <Send className="h-3 w-3" /> Novo Envio
            </TabsTrigger>
            <TabsTrigger value="campanhas" className="text-xs gap-1.5">
              <Megaphone className="h-3 w-3" /> Campanhas
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs gap-1.5">
              <BarChart3 className="h-3 w-3" /> Relatorios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="novo" className="mt-3 flex-1 overflow-auto">
            <MessageComposer onClose={onClose} />
          </TabsContent>

          <TabsContent value="campanhas" className="mt-3 flex-1 overflow-auto">
            <CampaignsTab />
          </TabsContent>

          <TabsContent value="relatorios" className="mt-3 flex-1 overflow-auto">
            <UsageReportTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
