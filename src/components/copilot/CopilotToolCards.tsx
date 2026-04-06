/**
 * Rich visual cards rendered inside the Copilot chat when AI tools execute.
 */
import { CheckCircle2, Calendar, FileText, MessageSquare, TrendingDown, AlertCircle } from "lucide-react"

interface ToolResult {
  tool: string
  success: boolean
  data?: any
}

export function ToolResultCard({ result }: { result: ToolResult }) {
  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 my-1">
        <div className="flex items-center gap-2 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          Erro ao executar: {toolLabel(result.tool)}
        </div>
        {result.data?.error && (
          <p className="text-[10px] text-muted-foreground mt-1">{result.data.error}</p>
        )}
      </div>
    )
  }

  switch (result.tool) {
    case "extract_and_save_expense":
      return <ExpenseCard data={result.data} />
    case "schedule_activity":
      return <ActivityCard data={result.data} />
    case "summarize_content":
      return <SummaryCard data={result.data} />
    case "generate_expense_summary":
      return <ExpenseSummaryCard data={result.data} />
    case "schedule_outbound_message":
      return <ScheduledMessageCard data={result.data} />
    default:
      return null
  }
}

function toolLabel(tool: string): string {
  const map: Record<string, string> = {
    extract_and_save_expense: "Despesa",
    schedule_activity: "Atividade",
    summarize_content: "Resumo",
    generate_expense_summary: "Relatorio Financeiro",
    schedule_outbound_message: "Mensagem Agendada",
  }
  return map[tool] || tool
}

function ExpenseCard({ data }: { data: any }) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 my-1 space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Despesa registrada
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <div>
          <span className="text-muted-foreground">Fornecedor:</span>{" "}
          <span className="font-medium text-foreground">{data?.supplier || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Valor:</span>{" "}
          <span className="font-bold text-foreground">R$ {Number(data?.amount || 0).toFixed(2)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Categoria:</span>{" "}
          <span className="font-medium text-foreground">{data?.category || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Data:</span>{" "}
          <span className="font-medium text-foreground">{formatDate(data?.date)}</span>
        </div>
      </div>
      {data?.confidence != null && (
        <div className="text-[10px] text-muted-foreground">
          Confianca: {(data.confidence * 100).toFixed(0)}%
        </div>
      )}
    </div>
  )
}

function ActivityCard({ data }: { data: any }) {
  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 my-1 space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
        <Calendar className="h-3.5 w-3.5" />
        Atividade agendada
      </div>
      <p className="text-xs font-medium text-foreground">{data?.title || "—"}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <div>
          <span className="text-muted-foreground">Data:</span>{" "}
          <span className="font-medium text-foreground">{formatDate(data?.due_date)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Hora:</span>{" "}
          <span className="font-medium text-foreground">{data?.due_time || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Tipo:</span>{" "}
          <span className="font-medium text-foreground">{data?.activity_type || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Prioridade:</span>{" "}
          <span className="font-medium text-foreground">{data?.priority || "medium"}</span>
        </div>
      </div>
      {data?.description && (
        <p className="text-[10px] text-muted-foreground">{data.description}</p>
      )}
    </div>
  )
}

function SummaryCard({ data }: { data: any }) {
  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 my-1 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
        <FileText className="h-3.5 w-3.5" />
        Resumo gerado
      </div>
      <p className="text-xs text-foreground">{data?.summary}</p>
      {data?.key_points?.length > 0 && (
        <ul className="text-[11px] text-foreground space-y-0.5 pl-3">
          {data.key_points.map((p: string, i: number) => (
            <li key={i} className="list-disc">{p}</li>
          ))}
        </ul>
      )}
      {data?.action_items?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground mt-1">Proximos passos:</p>
          <ul className="text-[11px] text-foreground space-y-0.5 pl-3">
            {data.action_items.map((a: any, i: number) => (
              <li key={i} className="list-disc">
                {a.task}
                {a.responsible && <span className="text-muted-foreground"> — {a.responsible}</span>}
                {a.deadline && <span className="text-muted-foreground"> (ate {a.deadline})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ExpenseSummaryCard({ data }: { data: any }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 my-1 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
        <TrendingDown className="h-3.5 w-3.5" />
        Relatorio de despesas
      </div>
      <div className="flex items-center gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground">{data?.context || "Periodo"}</p>
          <p className="text-lg font-bold text-foreground">R$ {Number(data?.total_amount || 0).toFixed(2)}</p>
        </div>
      </div>
      {data?.by_category?.length > 0 && (
        <div className="grid grid-cols-2 gap-1 text-[11px]">
          {data.by_category.map((c: any, i: number) => (
            <div key={i} className="flex justify-between">
              <span className="text-muted-foreground">{c.category} ({c.count}x)</span>
              <span className="font-medium text-foreground">R$ {Number(c.amount || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      {data?.summary_text && (
        <p className="text-[10px] text-muted-foreground">{data.summary_text}</p>
      )}
    </div>
  )
}

function ScheduledMessageCard({ data }: { data: any }) {
  const channelIcons: Record<string, string> = { whatsapp: "WhatsApp", email: "E-mail", sms: "SMS" }
  return (
    <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 my-1 space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
        <MessageSquare className="h-3.5 w-3.5" />
        Mensagem agendada ({channelIcons[data?.channel] || data?.channel})
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <div>
          <span className="text-muted-foreground">Para:</span>{" "}
          <span className="font-medium text-foreground">{data?.target_name || data?.target_contact || "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Envio:</span>{" "}
          <span className="font-medium text-foreground">{formatDateTime(data?.send_at)}</span>
        </div>
      </div>
      <p className="text-[10px] text-foreground bg-background/50 rounded p-1.5 border border-border/50">
        {data?.content?.substring(0, 200)}{data?.content?.length > 200 ? "..." : ""}
      </p>
    </div>
  )
}

function formatDate(d?: string): string {
  if (!d) return "—"
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—"
  try {
    const dt = new Date(iso)
    return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getFullYear()} ${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`
  } catch {
    return iso
  }
}
