import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Wifi, WifiOff, Search, RefreshCw, AlertTriangle, CheckCircle2,
  MessageSquare, Clock, ChevronDown, ChevronRight, Loader2, Settings2,
  Plus, Edit2, Star, Shield, Send, Globe, ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { ChannelIcon, getChannelLabel } from "@/components/ui/ChannelIcon";
import type { ChannelType } from "@/components/ui/ChannelIcon";

// ── Types ──
interface Provider {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_url: string;
  admin_token: string | null;
  is_active: boolean;
  is_default: boolean;
  max_instances: number;
  current_instances: number;
  config: any;
}

interface InstanceRow {
  id: string;
  instance_name: string;
  status: string;
  phone_number: string | null;
  profile_name: string | null;
  webhook_url: string | null;
  ultimo_ping: string | null;
  tenant_id: string;
  tenant_name?: string;
  provedor: string;
}

interface ChannelRow {
  id: string;
  provider: string;
  name: string | null;
  status: string;
  bot_username: string | null;
  display_phone_number: string | null;
  is_active: boolean;
  tenant_id: string;
  tenant_name?: string;
}

// ── Component ──
export default function NexusIntegracoes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<Provider | null>(null);
  const [providerForm, setProviderForm] = useState({ name: "", slug: "", base_url: "", admin_token: "", description: "", max_instances: 1000 });

  // ── Fetch providers ──
  const { data: providers = [] } = useQuery({
    queryKey: ["whatsapp-providers"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_providers").select("*").order("is_default", { ascending: false });
      return (data || []) as Provider[];
    },
  });

  // ── Fetch ALL instances ──
  const { data: instances = [], isLoading, refetch } = useQuery({
    queryKey: ["nexus-all-instances"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_instances").select("*, tenants(name)").order("status");
      return (data || []).map((d: any) => ({ ...d, tenant_name: d.tenants?.name || "—" })) as InstanceRow[];
    },
  });

  // ── Fetch ALL channel integrations (Meta, Telegram, ML, etc.) ──
  const { data: channels = [] } = useQuery({
    queryKey: ["nexus-all-channels"],
    queryFn: async () => {
      const { data } = await supabase.from("channel_integrations").select("id, provider, name, status, bot_username, display_phone_number, tenant_id, tenants(name)").order("created_at", { ascending: false });
      return (data || []).map((d: any) => ({
        ...d,
        is_active: d.status === "active",
        tenant_name: d.tenants?.name || "—",
      })) as ChannelRow[];
    },
  });

  // ── Toggle provider active ──
  const toggleProvider = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from("whatsapp_providers").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["whatsapp-providers"] }); toast.success("Provedor atualizado"); },
  });

  // ── Set default provider ──
  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("whatsapp_providers").update({ is_default: false }).neq("id", id);
      await supabase.from("whatsapp_providers").update({ is_default: true }).eq("id", id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["whatsapp-providers"] }); toast.success("Provedor padrão definido"); },
  });

  // ── Save provider ──
  const saveProvider = useMutation({
    mutationFn: async () => {
      if (editProvider) {
        await supabase.from("whatsapp_providers").update({ ...providerForm, updated_at: new Date().toISOString() }).eq("id", editProvider.id);
      } else {
        await supabase.from("whatsapp_providers").insert(providerForm);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-providers"] });
      closeProviderModal();
      toast.success(editProvider ? "Provedor atualizado" : "Provedor criado");
    },
  });

  // ── Group instances by tenant ──
  const tenantMap = new Map<string, { name: string; instances: InstanceRow[]; channels: ChannelRow[] }>();
  for (const inst of instances) {
    if (!tenantMap.has(inst.tenant_id)) tenantMap.set(inst.tenant_id, { name: inst.tenant_name || "—", instances: [], channels: [] });
    tenantMap.get(inst.tenant_id)!.instances.push(inst);
  }
  for (const ch of channels) {
    if (!tenantMap.has(ch.tenant_id)) tenantMap.set(ch.tenant_id, { name: ch.tenant_name || "—", instances: [], channels: [] });
    tenantMap.get(ch.tenant_id)!.channels.push(ch);
  }

  const filteredTenants = Array.from(tenantMap.entries()).filter(([_, t]) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.instances.some((i) => i.instance_name.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Stats ──
  const connectedCount = instances.filter((i) => i.status === "connected").length;
  const disconnectedCount = instances.filter((i) => i.status !== "connected").length;
  const noWebhook = instances.filter((i) => !i.webhook_url).length;
  const metaActive = channels.filter((c) => c.is_active && (c.provider === "WABA" || c.provider === "INSTAGRAM")).length;
  const telegramActive = channels.filter((c) => c.is_active && c.provider === "TELEGRAM").length;
  const mlActive = channels.filter((c) => c.is_active && c.provider === "MERCADOLIVRE").length;
  const totalChannels = channels.filter((c) => c.is_active).length;

  const timeAgo = (d: string | null) => {
    if (!d) return "—";
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    return hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d`;
  };

  const openEditProvider = (p: Provider | null) => {
    setEditProvider(p);
    setProviderForm(p ? { name: p.name, slug: p.slug, base_url: p.base_url, admin_token: p.admin_token || "", description: p.description || "", max_instances: p.max_instances }
      : { name: "", slug: "", base_url: "", admin_token: "", description: "", max_instances: 1000 });
    setProviderModalOpen(true);
  };

  const closeProviderModal = () => {
    setProviderModalOpen(false);
    setEditProvider(null);
    setProviderForm({ name: "", slug: "", base_url: "", admin_token: "", description: "", max_instances: 1000 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings2 className="h-6 w-6" /> Controle de Integrações</h1>
          <p className="text-sm text-muted-foreground">Gerencie provedores, conexões e monitore todos os clientes.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2"><RefreshCw className="h-4 w-4" /> Atualizar</Button>
      </div>

      {/* ═══ SECTION 1: Provedores ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Provedores WhatsApp Web</h2>
          <Button variant="outline" size="sm" onClick={() => openEditProvider(null)} className="gap-1 text-xs"><Plus size={12} /> Novo Provedor</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {providers.map((p) => (
            <Card key={p.id} style={{ border: p.is_active ? "1px solid rgba(14,138,92,0.3)" : "1px solid hsl(var(--border))", background: p.is_active ? "rgba(14,138,92,0.04)" : undefined }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: p.is_active ? "rgba(14,138,92,0.15)" : "hsl(var(--muted))" }}>
                    <Wifi size={18} style={{ color: p.is_active ? "#0E8A5C" : "hsl(var(--muted-foreground))" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{p.name}</span>
                      {p.is_default && <Badge className="text-[8px] bg-amber-500/20 text-amber-500 border-amber-500/30">Padrão</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{p.base_url}</p>
                  </div>
                  <Switch checked={p.is_active} onCheckedChange={(v) => toggleProvider.mutate({ id: p.id, active: v })} />
                </div>

                {p.description && <p className="text-xs text-muted-foreground mb-3">{p.description}</p>}

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
                  <span>Instâncias: {instances.filter(i => i.provedor === p.slug || (p.slug === 'uazapi' && i.provedor === 'uazapi')).length}/{p.max_instances}</span>
                  <span>•</span>
                  <span>Token: {p.admin_token ? "••••" + p.admin_token.slice(-4) : "—"}</span>
                </div>

                <div className="flex gap-1.5">
                  {!p.is_default && p.is_active && (
                    <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => setDefault.mutate(p.id)}>
                      <Star size={10} /> Definir Padrão
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => openEditProvider(p)}>
                    <Edit2 size={10} /> Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ═══ SECTION 2: KPIs ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total Conexões", value: instances.length + totalChannels, icon: Wifi, color: "#6366f1" },
          { label: "WA Conectadas", value: connectedCount, icon: CheckCircle2, color: "#10b981" },
          { label: "WA Desconectadas", value: disconnectedCount, icon: WifiOff, color: "#ef4444" },
          { label: "Sem Webhook", value: noWebhook, icon: AlertTriangle, color: "#f59e0b" },
          { label: "Meta Ativas", value: metaActive, icon: MessageSquare, color: "#3b82f6" },
          { label: "Telegram", value: telegramActive, icon: Send, color: "#229ED9" },
          { label: "Mercado Livre", value: mlActive, icon: ShoppingBag, color: "#FFE600" },
          { label: "Webchat", value: channels.filter((c) => c.is_active && c.provider === "WEBCHAT").length, icon: Globe, color: "#11bc76" },
        ].map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-3 text-center">
              <s.icon size={16} className="mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ SECTION 3: Clientes ═══ */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Conexões por Cliente</h2>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por empresa, instância ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : filteredTenants.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhum resultado</p>
          ) : (
            filteredTenants.map(([tenantId, tenant]) => {
              const isExp = expandedTenant === tenantId;
              const allOk = tenant.instances.every((i) => i.status === "connected");
              const hasBad = tenant.instances.some((i) => i.status !== "connected");
              return (
                <Card key={tenantId} className="border-border/60 overflow-hidden">
                  <button onClick={() => setExpandedTenant(isExp ? null : tenantId)} className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors">
                    {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <div className={`w-2.5 h-2.5 rounded-full ${allOk && (tenant.instances.length + tenant.channels.length) > 0 ? "bg-emerald-500" : hasBad ? "bg-red-400" : "bg-gray-300"}`} />
                    <span className="text-sm font-semibold flex-1">{tenant.name}</span>
                    {tenant.instances.length > 0 && <Badge variant="outline" className="text-[10px] gap-1"><Wifi size={10} /> {tenant.instances.filter((i) => i.status === "connected").length}/{tenant.instances.length} WA</Badge>}
                    {tenant.channels.filter(c => c.provider === "WABA" || c.provider === "INSTAGRAM").length > 0 && <Badge variant="outline" className="text-[10px] gap-1"><MessageSquare size={10} /> {tenant.channels.filter(c => (c.provider === "WABA" || c.provider === "INSTAGRAM") && c.is_active).length} Meta</Badge>}
                    {tenant.channels.filter(c => c.provider === "TELEGRAM").length > 0 && <Badge variant="outline" className="text-[10px] gap-1"><Send size={10} /> Telegram</Badge>}
                    {tenant.channels.filter(c => c.provider === "MERCADOLIVRE").length > 0 && <Badge variant="outline" className="text-[10px] gap-1"><ShoppingBag size={10} /> ML</Badge>}
                  </button>
                  {isExp && (
                    <div className="px-4 pb-4 border-t border-border/40">
                      {tenant.instances.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">WhatsApp Web</p>
                          <div className="space-y-1.5">
                            {tenant.instances.map((inst) => (
                              <div key={inst.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 text-sm">
                                <div className={`w-2 h-2 rounded-full ${inst.status === "connected" ? "bg-emerald-500" : "bg-red-400"}`} />
                                <span className="font-medium flex-1">{inst.instance_name}</span>
                                {inst.phone_number && <span className="text-[10px] text-muted-foreground">📱 {inst.phone_number}</span>}
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={10} /> {timeAgo(inst.ultimo_ping)}</span>
                                <Badge variant="outline" className={`text-[9px] ${inst.status === "connected" ? "text-emerald-500 border-emerald-500/30" : "text-red-400 border-red-400/30"}`}>{inst.status === "connected" ? "Conectado" : "Desconectado"}</Badge>
                                {!inst.webhook_url && <Badge variant="destructive" className="text-[9px]">Sem webhook</Badge>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Group channels by type */}
                      {(() => {
                        const groups: { label: string; channel: ChannelType; items: ChannelRow[] }[] = [
                          { label: "Meta Cloud API", channel: "whatsapp_meta", items: tenant.channels.filter(c => c.provider === "WABA" || c.provider === "INSTAGRAM") },
                          { label: "Telegram", channel: "telegram", items: tenant.channels.filter(c => c.provider === "TELEGRAM") },
                          { label: "Mercado Livre", channel: "mercadolivre", items: tenant.channels.filter(c => c.provider === "MERCADOLIVRE") },
                          { label: "Webchat", channel: "webchat", items: tenant.channels.filter(c => c.provider === "WEBCHAT") },
                        ];
                        return groups.filter(g => g.items.length > 0).map((group) => (
                          <div key={group.label} className="mt-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                              <ChannelIcon channel={group.channel} size="sm" variant="badge" />
                              {group.label}
                            </p>
                            <div className="space-y-1.5">
                              {group.items.map((ch) => (
                                <div key={ch.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 text-sm">
                                  <div className={`w-2 h-2 rounded-full ${ch.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                                  <span className="font-medium flex-1">
                                    {ch.name || ch.bot_username || ch.display_phone_number || getChannelLabel(group.channel)}
                                  </span>
                                  <Badge variant="outline" className={`text-[9px] ${ch.is_active ? "text-emerald-500 border-emerald-500/30" : "text-gray-400"}`}>
                                    {ch.is_active ? "Ativo" : "Inativo"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                      {tenant.instances.length + tenant.channels.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem conexões</p>}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* ═══ Provider Edit Modal ═══ */}
      <Dialog open={providerModalOpen} onOpenChange={(o) => { if (!o) closeProviderModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editProvider ? `Editar ${editProvider.name}` : "Novo Provedor"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Nome</Label><Input value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} placeholder="uazapi v2" /></div>
            <div><Label>Slug (identificador)</Label><Input value={providerForm.slug} onChange={(e) => setProviderForm({ ...providerForm, slug: e.target.value })} placeholder="uazapi" disabled={!!editProvider} /></div>
            <div><Label>URL Base</Label><Input value={providerForm.base_url} onChange={(e) => setProviderForm({ ...providerForm, base_url: e.target.value })} placeholder="https://whatsflow.uazapi.com" /></div>
            <div><Label>Admin Token</Label><Input value={providerForm.admin_token} onChange={(e) => setProviderForm({ ...providerForm, admin_token: e.target.value })} placeholder="Token de administrador" type="password" /></div>
            <div><Label>Descrição</Label><Input value={providerForm.description} onChange={(e) => setProviderForm({ ...providerForm, description: e.target.value })} placeholder="Descrição do provedor" /></div>
            <div><Label>Máx. instâncias</Label><Input type="number" value={providerForm.max_instances} onChange={(e) => setProviderForm({ ...providerForm, max_instances: parseInt(e.target.value) || 0 })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeProviderModal}>Cancelar</Button>
            <Button onClick={() => saveProvider.mutate()} disabled={!providerForm.name || !providerForm.base_url || saveProvider.isPending}>
              {saveProvider.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editProvider ? "Salvar" : "Criar Provedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
