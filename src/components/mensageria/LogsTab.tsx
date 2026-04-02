import { fmtDateTime } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  timestamp: string;
  session_id: string;
  conversa_id: string;
  tipo: string;
  status: string;
  origem: string;
  conteudo: string;
  direcao: string;
}

export default function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [origemFilter, setOrigemFilter] = useState("todos");
  const [sessionFilter, setSessionFilter] = useState("todos");
  const [sessions, setSessions] = useState<{ session_id: string; label: string }[]>([]);

  useEffect(() => {
    fetchLogs();
    supabase.from("whatsapp_instances").select("session_id, label").then(({ data }) => {
      if (data) setSessions(data);
    });
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("message_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(500);
    if (data) setLogs(data);
    setLoading(false);
  };

  const filtered = logs.filter((l) => {
    if (search && !l.conversa_id.includes(search) && !l.conteudo.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "todos" && l.status !== statusFilter) return false;
    if (origemFilter !== "todos" && l.origem !== origemFilter) return false;
    if (sessionFilter !== "todos" && l.session_id !== sessionFilter) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ["Data", "Sessão", "Número", "Direção", "Tipo", "Status", "Origem", "Conteúdo"];
    const rows = filtered.map((l) => [
      fmtDateTime(l.timestamp),
      l.session_id,
      l.conversa_id,
      l.direcao,
      l.tipo,
      l.status,
      l.origem,
      `"${(l.conteudo || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-mensageria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Logs de Mensagens</h2>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número ou conteúdo" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={sessionFilter} onValueChange={setSessionFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Conexão" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas conexões</SelectItem>
            {sessions.map((s) => (
              <SelectItem key={s.session_id} value={s.session_id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={origemFilter} onValueChange={setOrigemFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas origens</SelectItem>
            <SelectItem value="suporte">Suporte</SelectItem>
            <SelectItem value="prospeccao">Prospecção</SelectItem>
            <SelectItem value="cobranca">Cobrança</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Sessão</TableHead>
              <TableHead className="text-xs">Número</TableHead>
              <TableHead className="text-xs">Dir.</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Origem</TableHead>
              <TableHead className="text-xs">Conteúdo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum log encontrado.</TableCell>
              </TableRow>
            )}
            {filtered.map((l) => (
              <TableRow key={l.id} className={cn(l.status === "failed" && "bg-destructive/10")}>
                <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(l.timestamp)}</TableCell>
                <TableCell className="text-xs font-mono">{l.session_id}</TableCell>
                <TableCell className="text-xs">{l.conversa_id}</TableCell>
                <TableCell className="text-xs">
                  <Badge variant="secondary" className="text-[10px]">{l.direcao === "enviado" ? "↑" : "↓"}</Badge>
                </TableCell>
                <TableCell className="text-xs">{l.tipo}</TableCell>
                <TableCell className="text-xs">
                  <Badge variant={l.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{l.status}</Badge>
                </TableCell>
                <TableCell className="text-xs">{l.origem}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{l.conteudo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
