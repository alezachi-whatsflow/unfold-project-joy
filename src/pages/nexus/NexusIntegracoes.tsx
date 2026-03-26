import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wifi, WifiOff, Search, RefreshCw, AlertTriangle, CheckCircle2,
  MessageSquare, Clock, ChevronDown, ChevronRight, Loader2, Settings2,
} from "lucide-react";
import { toast } from "sonner";

interface InstanceRow {
  id: string;
  instance_name: string;
  instance_token: string;
  status: string;
  phone_number: string | null;
  profile_name: string | null;
  webhook_url: string | null;
  ultimo_ping: string | null;
  current_presence: string | null;
  tenant_id: string;
  tenant_name?: string;
  license_plan?: string;
  license_type?: string;
  provedor: string;
}

interface ChannelRow {
  id: string;
  provider: string;
  is_active: boolean;
  config: any;
  tenant_id: string;
  tenant_name?: string;
}

export default function NexusIntegracoes() {
  const [search, setSearch] = useState("");
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch ALL instances across all tenants (service role via nexus context)
  const { data: instances = [], isLoading, refetch } = useQuery({
    queryKey: ["nexus-all-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*, tenants!inner(name)")
        .order("status", { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        tenant_name: d.tenants?.name || "—",
      })) as InstanceRow[];
    },
  });

  // Fetch ALL Meta channel integrations
  const { data: channels = [] } = useQuery({
    queryKey: ["nexus-all-channels"],
    queryFn: async () => {
      const { data } = await supabase
        .from("channel_integrations")
        .select("*, tenants!inner(name)")
        .order("created_at", { ascending: false });
      return (data || []).map((d: any) => ({
        ...d,
        tenant_name: d.tenants?.name || "—",
      })) as ChannelRow[];
    },
  });

  // Group instances by tenant
  const tenantMap = new Map<string, { name: string; instances: InstanceRow[]; channels: ChannelRow[] }>();
  for (const inst of instances) {
    if (!tenantMap.has(inst.tenant_id)) {
      tenantMap.set(inst.tenant_id, { name: inst.tenant_name || "—", instances: [], channels: [] });
    }
    tenantMap.get(inst.tenant_id)!.instances.push(inst);
  }
  for (const ch of channels) {
    if (!tenantMap.has(ch.tenant_id)) {
      tenantMap.set(ch.tenant_id, { name: ch.tenant_name || "—", instances: [], channels: [] });
    }
    tenantMap.get(ch.tenant_id)!.channels.push(ch);
  }

  // Filter
  const filteredTenants = Array.from(tenantMap.entries()).filter(([_, t]) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.instances.some((i) => i.instance_name.toLowerCase().includes(search.toLowerCase()) || i.phone_number?.includes(search))
  );

  // Stats
  const totalInstances = instances.length + channels.length;
  const connectedInstances = instances.filter((i) => i.status === "connected").length;
  const disconnected = instances.filter((i) => i.status !== "connected").length;
  const noWebhook = instances.filter((i) => !i.webhook_url).length;
  const metaActive = channels.filter((c) => c.is_active).length;

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast.success("Dados atualizados");
  };

  const timeAgo = (d: string | null) => {
    if (!d) return "—";
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6" /> Controle de Integrações
          </h1>
          <p className="text-sm text-muted-foreground">Visão global de todas as conexões de todos os clientes e WhiteLabels.</p>
        </div>
        <Button variant="outline" onClick={handleRefreshAll} disabled={refreshing} className="gap-2">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total Instâncias", value: totalInstances, icon: Wifi, color: "#6366f1" },
          { label: "Conectadas (uazapi)", value: connectedInstances, icon: CheckCircle2, color: "#10b981" },
          { label: "Desconectadas", value: disconnected, icon: WifiOff, color: "#ef4444" },
          { label: "Sem Webhook", value: noWebhook, icon: AlertTriangle, color: "#f59e0b" },
          { label: "Meta Ativas", value: metaActive, icon: MessageSquare, color: "#3b82f6" },
        ].map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-4 text-center">
              <s.icon size={18} className="mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por empresa, instância ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tenant list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filteredTenants.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">Nenhum resultado encontrado</p>
        ) : (
          filteredTenants.map(([tenantId, tenant]) => {
            const isExpanded = expandedTenant === tenantId;
            const allConnected = tenant.instances.every((i) => i.status === "connected");
            const hasDisconnected = tenant.instances.some((i) => i.status !== "connected");
            const totalInst = tenant.instances.length + tenant.channels.length;

            return (
              <Card key={tenantId} className="border-border/60 overflow-hidden">
                {/* Tenant header */}
                <button
                  onClick={() => setExpandedTenant(isExpanded ? null : tenantId)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <div className={`w-2.5 h-2.5 rounded-full ${allConnected && totalInst > 0 ? "bg-emerald-500" : hasDisconnected ? "bg-red-400" : "bg-gray-300"}`} />
                  <span className="text-sm font-semibold flex-1">{tenant.name}</span>
                  <div className="flex items-center gap-2">
                    {tenant.instances.length > 0 && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Wifi size={10} /> {tenant.instances.filter((i) => i.status === "connected").length}/{tenant.instances.length}
                      </Badge>
                    )}
                    {tenant.channels.length > 0 && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <MessageSquare size={10} /> {tenant.channels.filter((c) => c.is_active).length}/{tenant.channels.length} Meta
                      </Badge>
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/40">
                    {/* uazapi instances */}
                    {tenant.instances.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">WhatsApp Web (uazapi)</p>
                        <div className="space-y-2">
                          {tenant.instances.map((inst) => (
                            <div key={inst.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 text-sm">
                              <div className={`w-2 h-2 rounded-full ${inst.status === "connected" ? "bg-emerald-500" : "bg-red-400"}`} />
                              <span className="font-medium flex-1">{inst.instance_name}</span>
                              {inst.phone_number && <span className="text-xs text-muted-foreground">📱 {inst.phone_number}</span>}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock size={10} /> {timeAgo(inst.ultimo_ping)}
                              </span>
                              <Badge variant="outline" className={`text-[9px] ${inst.status === "connected" ? "text-emerald-500 border-emerald-500/30" : "text-red-400 border-red-400/30"}`}>
                                {inst.status === "connected" ? "Conectado" : "Desconectado"}
                              </Badge>
                              {!inst.webhook_url && (
                                <Badge variant="destructive" className="text-[9px]">Sem webhook</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta channels */}
                    {tenant.channels.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Meta Cloud API</p>
                        <div className="space-y-2">
                          {tenant.channels.map((ch) => (
                            <div key={ch.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 text-sm">
                              <div className={`w-2 h-2 rounded-full ${ch.is_active ? "bg-blue-500" : "bg-gray-300"}`} />
                              <span className="font-medium flex-1">{ch.provider === "meta_whatsapp" ? "WhatsApp Cloud" : "Instagram"}</span>
                              {ch.config?.phone_number && <span className="text-xs text-muted-foreground">📱 {ch.config.phone_number}</span>}
                              <Badge variant="outline" className={`text-[9px] ${ch.is_active ? "text-blue-500 border-blue-500/30" : "text-gray-400"}`}>
                                {ch.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {totalInst === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhuma integração configurada</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
