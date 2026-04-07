/**
 * UsageReportTable — Pzaafi Brand Kit v5.0 Cyber-Minimalist
 *
 * Displays daily messaging usage with billing breakdown.
 * Uses Geist Mono for financial data, Inter for labels.
 * Exportable to CSV.
 */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Loader2, TrendingUp, Send, AlertCircle, DollarSign } from "lucide-react"
import { isBackendAvailable } from "@/lib/apiClient"

interface UsageRow {
  date: string
  dateISO: string
  channel: string
  sends: number
  delivered: number
  failed: number
  unitValue: number
  totalValue: number
}

interface UsageTotals {
  sends: number
  delivered: number
  failed: number
  totalCost: string
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInt(n: number): string {
  return n.toLocaleString("pt-BR")
}

const CHANNEL_LABELS: Record<string, string> = {
  uazapi: "WhatsApp Web",
  meta: "Cloud API",
  messenger: "Messenger",
  telegram: "Telegram",
}

export default function UsageReportTable() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)
  const [channel, setChannel] = useState("all")

  const backendUrl = import.meta.env.VITE_BACKEND_URL || ""

  const { data, isLoading } = useQuery({
    queryKey: ["usage-report", startDate, endDate, channel],
    queryFn: async () => {
      if (!backendUrl) return { data: [], totals: { sends: 0, delivered: 0, failed: 0, totalCost: "0.00" } }

      const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
      if (channel !== "all") params.set("channel", channel)

      const res = await fetch(`${backendUrl}/api/reports/usage?${params}`, {
        headers: { Authorization: `Bearer ${(await import("@/integrations/supabase/client")).supabase.auth.getSession().then(s => s.data.session?.access_token)}` },
      })
      return res.json()
    },
    enabled: !!backendUrl,
    staleTime: 60_000,
  })

  const rows: UsageRow[] = data?.data || []
  const totals: UsageTotals = data?.totals || { sends: 0, delivered: 0, failed: 0, totalCost: "0.00" }

  // Export CSV
  const exportCSV = () => {
    const header = "DATA,CANAL,ENVIOS,ENTREGUES,FALHAS,VALOR UN,VALOR TOTAL\n"
    const body = rows.map(r =>
      `${r.date},${CHANNEL_LABELS[r.channel] || r.channel},${r.sends},${r.delivered},${r.failed},${r.unitValue.toFixed(6)},${r.totalValue.toFixed(2)}`
    ).join("\n")
    const footer = `\nTOTAL,,${totals.sends},${totals.delivered},${totals.failed},,${totals.totalCost}`

    const blob = new Blob([header + body + footer], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pzaafi-usage-${startDate}-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Send} label="Total Envios" value={fmtInt(totals.sends)} color="text-[#478BFF]" />
        <KpiCard icon={TrendingUp} label="Entregues" value={fmtInt(totals.delivered)} color="text-[#39F7B2]" />
        <KpiCard icon={AlertCircle} label="Falhas" value={fmtInt(totals.failed)} color="text-destructive" />
        <KpiCard icon={DollarSign} label="Custo Total" value={`R$ ${totals.totalCost}`} color="text-[#478BFF]" />
      </div>

      {/* Filters + Export */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#478BFF]" />
              RELATORIO DE CONSUMO
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-8 w-[130px] text-xs font-mono"
              />
              <span className="text-xs text-muted-foreground">ate</span>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-8 w-[130px] text-xs font-mono"
              />
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  <SelectItem value="uazapi" className="text-xs">WA Web</SelectItem>
                  <SelectItem value="meta" className="text-xs">Cloud API</SelectItem>
                  <SelectItem value="messenger" className="text-xs">Messenger</SelectItem>
                  <SelectItem value="telegram" className="text-xs">Telegram</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={exportCSV}>
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhum dado para o periodo selecionado
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-400px)]" data-scrollbar="visible">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border sticky top-0 bg-card z-10">
                    <th className="text-left px-4 py-3 font-mono text-[10px] tracking-wider text-muted-foreground">DATA</th>
                    <th className="text-left px-4 py-3 font-mono text-[10px] tracking-wider text-muted-foreground">CANAL</th>
                    <th className="text-right px-4 py-3 font-mono text-[10px] tracking-wider text-muted-foreground">N° ENVIOS</th>
                    <th className="text-right px-4 py-3 font-mono text-[10px] tracking-wider text-muted-foreground">ENTREGUES</th>
                    <th className="text-right px-4 py-3 font-mono text-[10px] tracking-wider text-muted-foreground">FALHAS</th>
                    <th className="text-right px-4 py-3 font-mono text-[10px] tracking-wider text-muted-foreground">VALOR UN</th>
                    <th className="text-right px-4 py-3 font-mono text-[10px] tracking-wider text-muted-foreground">VALOR TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.dateISO}-${r.channel}-${i}`} className="border-b border-border/30 hover:bg-[rgba(71,139,255,0.03)] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-foreground">{r.date}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-[9px] font-mono">
                          {CHANNEL_LABELS[r.channel] || r.channel}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground">{fmtInt(r.sends)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#39F7B2]">{fmtInt(r.delivered)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-destructive">{r.failed > 0 ? fmtInt(r.failed) : "—"}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">R$ {r.unitValue.toFixed(4)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-[#478BFF]">R$ {fmt(r.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals footer */}
                <tfoot>
                  <tr className="border-t-2 border-[#1E3757] bg-[rgba(71,139,255,0.04)]">
                    <td className="px-4 py-3 font-mono font-bold text-foreground" colSpan={2}>TOTAL</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{fmtInt(totals.sends)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#39F7B2]">{fmtInt(totals.delivered)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-destructive">{totals.failed > 0 ? fmtInt(totals.failed) : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-lg text-[#478BFF]">R$ {totals.totalCost}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">{label}</p>
            <p className={`text-xl font-bold font-mono mt-1 ${color}`}>{value}</p>
          </div>
          <Icon className={`h-5 w-5 mt-0.5 ${color} opacity-60`} />
        </div>
      </CardContent>
    </Card>
  )
}
