import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, Search, Download, Loader2 } from "lucide-react";

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  tenant_id: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  metadata: any;
  ip_address: string | null;
  created_at: string;
  tenant_name?: string;
}

export default function SuperAdminAuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auditData } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: tenants } = await supabase.from("tenants").select("id, name");
    const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t.name]));

    const enriched = (auditData || []).map((l: any) => ({
      ...l,
      tenant_name: l.tenant_id ? tenantMap.get(l.tenant_id) || "—" : "Global",
    }));

    setLogs(enriched as AuditEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const actions = [...new Set(logs.map((l) => l.action))];

  const filtered = logs.filter((l) => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.action.toLowerCase().includes(q) ||
        l.resource?.toLowerCase().includes(q) ||
        l.tenant_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const headers = "Data,Ator,Role,Tenant,Ação,Recurso,IP\n";
    const rows = filtered.map((l) =>
      `${new Date(l.created_at).toLocaleString("pt-BR")},${l.actor_id || ""},${l.actor_role || ""},${l.tenant_name || ""},${l.action},${l.resource || ""},${l.ip_address || ""}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const actionColor = (action: string) => {
    if (action.includes("created")) return "default";
    if (action.includes("suspended") || action.includes("deleted")) return "destructive";
    if (action.includes("reactivated")) return "default";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="h-6 w-6" /> Audit Log
          </h1>
          <p className="text-sm text-muted-foreground">Registro cronológico de ações — LGPD compliance</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Ações</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data/Hora</TableHead>
                  <TableHead className="text-xs">Tenant</TableHead>
                  <TableHead className="text-xs">Ação</TableHead>
                  <TableHead className="text-xs">Recurso</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs">{log.tenant_name}</TableCell>
                    <TableCell>
                      <Badge variant={actionColor(log.action) as any} className="text-[10px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.resource || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{log.actor_role || "system"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.metadata ? JSON.stringify(log.metadata).slice(0, 60) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
