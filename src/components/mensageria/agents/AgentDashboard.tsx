import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Users, UserCheck, UserX, Clock, Plus, Settings2, CircleDot } from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CircleDot }> = {
  online: { label: "Online", color: "#10b981", icon: CircleDot },
  away: { label: "Ausente", color: "#f59e0b", icon: Clock },
  busy: { label: "Ocupado", color: "#ef4444", icon: UserX },
  offline: { label: "Offline", color: "#6b7280", icon: UserX },
};

interface AgentStatusRow {
  id: string;
  user_id: string;
  status: string;
  max_conversations: number;
  current_conversations: number;
  last_activity_at: string;
  profile?: { full_name?: string; role?: string; email?: string };
}

interface Department {
  id: string;
  name: string;
  color: string;
  distribution_mode: string;
  is_default: boolean;
}

export default function AgentDashboard() {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deptOpen, setDeptOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", color: "#6366f1", distribution_mode: "round_robin" });

  // Fetch agents with status
  const { data: agents = [] } = useQuery({
    queryKey: ["agent-status", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("agent_status")
        .select("*, profile:profiles(full_name, role, email)")
        .eq("tenant_id", tenantId)
        .order("status");
      return (data || []) as AgentStatusRow[];
    },
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("departments").select("*").eq("tenant_id", tenantId).order("name");
      return (data || []) as Department[];
    },
    enabled: !!tenantId,
  });

  // Update own status
  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!tenantId || !user?.id) return;
      await supabase.from("agent_status").upsert(
        { tenant_id: tenantId, user_id: user.id, status, updated_at: new Date().toISOString() },
        { onConflict: "tenant_id,user_id" }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agent-status", tenantId] }),
  });

  // Create department
  const createDept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("departments").insert({ ...deptForm, tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", tenantId] });
      setDeptOpen(false);
      toast.success("Setor criado");
    },
  });

  const onlineCount = agents.filter((a) => a.status === "online").length;
  const totalConvs = agents.reduce((s, a) => s + a.current_conversations, 0);

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Gestão de Atendentes</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {onlineCount} online · {totalConvs} conversas ativas
          </p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="online" onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="w-32 text-xs h-8">
              <SelectValue placeholder="Meu status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                    {cfg.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Online", value: onlineCount, color: "#10b981", icon: UserCheck },
          { label: "Ausentes", value: agents.filter((a) => a.status === "away").length, color: "#f59e0b", icon: Clock },
          { label: "Conversas", value: totalConvs, color: "#6366f1", icon: Users },
          { label: "Setores", value: departments.length, color: "#3b82f6", icon: Settings2 },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <s.icon size={16} className="mx-auto mb-1" style={{ color: s.color }} />
            <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Agent List */}
      <div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Atendentes</h3>
        <div className="space-y-2">
          {agents.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Nenhum atendente configurado</p>
          ) : (
            agents.map((a) => {
              const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.offline;
              return (
                <Card key={a.id} className="p-3 flex items-center gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                    {(a.profile?.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{a.profile?.full_name || a.user_id}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{a.profile?.role || "atendente"}</p>
                  </div>
                  <Badge className="text-[10px]" style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                    {cfg.label}
                  </Badge>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {a.current_conversations}/{a.max_conversations}
                  </span>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Departments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Setores</h3>
          <Button onClick={() => setDeptOpen(true)} variant="outline" size="sm" className="gap-1 text-xs h-7">
            <Plus size={12} /> Novo Setor
          </Button>
        </div>
        <div className="space-y-2">
          {departments.map((d) => (
            <Card key={d.id} className="p-3 flex items-center gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
              <span className="text-sm flex-1" style={{ color: "var(--text-primary)" }}>{d.name}</span>
              <Badge variant="outline" className="text-[10px]">{d.distribution_mode === "round_robin" ? "Round Robin" : d.distribution_mode === "least_busy" ? "Menor Carga" : "Manual"}</Badge>
              {d.is_default && <Badge className="text-[9px] bg-green-500/20 text-green-400">Padrão</Badge>}
            </Card>
          ))}
        </div>
      </div>

      {/* Create Department Dialog */}
      <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Novo Setor</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nome do setor" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
            <Select value={deptForm.distribution_mode} onValueChange={(v) => setDeptForm({ ...deptForm, distribution_mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="round_robin">Round Robin</SelectItem>
                <SelectItem value="least_busy">Menor Carga</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => createDept.mutate()} disabled={!deptForm.name} className="w-full">Criar Setor</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
