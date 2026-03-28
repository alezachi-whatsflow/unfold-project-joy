import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";
import {
  Users, UsersRound, Percent, Search, Plus, ChevronDown,
  Copy, Lock, Unlock, Trash2, Pencil, Loader2, Check,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface GroupRow {
  id: string;
  tenant_id: string;
  instance_name: string;
  jid: string;
  name: string | null;
  description: string | null;
  invite_link: string | null;
  profile_pic_url: string | null;
  participant_count: number;
  capacity: number;
  is_admin: boolean;
  is_locked: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export default function GroupDashboard() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();

  // ── State ──
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"individual" | "batch">("individual");
  const [singleName, setSingleName] = useState("");
  const [batchPrefix, setBatchPrefix] = useState("");
  const [batchCount, setBatchCount] = useState(5);
  const [groupCapacity, setGroupCapacity] = useState(250);
  const [selectedInstance, setSelectedInstance] = useState("");
  const [creating, setCreating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Fetch groups ──
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["whatsapp-groups-dashboard", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("whatsapp_groups")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return (data || []) as GroupRow[];
    },
    enabled: !!tenantId,
    staleTime: 10_000,
  });

  // ── Fetch instances ──
  const { data: instances = [] } = useQuery({
    queryKey: ["whatsapp-instances-list", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("instance_name, status")
        .order("instance_name");
      return (data || []) as { instance_name: string; status: string }[];
    },
    enabled: !!tenantId,
  });

  // ── Computed KPIs ──
  const kpis = useMemo(() => {
    const active = groups.filter((g) => g.status === "open");
    const totalMembers = groups.reduce((s, g) => s + (g.participant_count || 0), 0);
    const occupancy =
      groups.length > 0
        ? groups.reduce((s, g) => s + ((g.participant_count || 0) / (g.capacity || 250)) * 100, 0) / groups.length
        : 0;
    return { activeCount: active.length, totalMembers, occupancy: Math.round(occupancy) };
  }, [groups]);

  // ── Filtered ──
  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter((g) => (g.name || "").toLowerCase().includes(q));
  }, [groups, search]);

  // ── Mutations ──
  const updateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("whatsapp_groups")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-groups-dashboard", tenantId] });
      setSelectedIds(new Set());
      toast.success("Grupos atualizados");
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-groups-dashboard", tenantId] });
      toast.success("Grupo removido");
    },
  });

  const toggleLock = useMutation({
    mutationFn: async ({ id, locked }: { id: string; locked: boolean }) => {
      const group = groups.find((g) => g.id === id);
      if (!group) return;
      await supabase.functions.invoke("group-manager", {
        body: {
          action: "update_settings",
          tenant_id: tenantId,
          instance_name: group.instance_name,
          group_jid: group.jid,
          locked,
        },
      });
      await supabase
        .from("whatsapp_groups")
        .update({ is_locked: locked, updated_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-groups-dashboard", tenantId] });
    },
  });

  // ── Handlers ──
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((g) => g.id)));
  };

  const copyLink = async (group: GroupRow) => {
    if (!group.invite_link) {
      toast.error("Link de convite nao disponivel");
      return;
    }
    await navigator.clipboard.writeText(group.invite_link);
    setCopiedId(group.id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async () => {
    if (!selectedInstance) {
      toast.error("Selecione uma instancia");
      return;
    }
    setCreating(true);
    setBatchProgress(0);

    try {
      if (createTab === "individual") {
        if (!singleName.trim()) { toast.error("Digite o nome do grupo"); setCreating(false); return; }
        await supabase.functions.invoke("group-manager", {
          body: { action: "create", tenant_id: tenantId, instance_name: selectedInstance, name: singleName.trim(), capacity: groupCapacity },
        });
        toast.success("Grupo criado!");
      } else {
        if (!batchPrefix.trim()) { toast.error("Digite o prefixo"); setCreating(false); return; }
        // Start a progress interval (estimate ~2s per group)
        const total = batchCount;
        let progress = 0;
        const interval = setInterval(() => {
          progress = Math.min(progress + (100 / total), 95);
          setBatchProgress(Math.round(progress));
        }, 2000);

        const { data } = await supabase.functions.invoke("group-manager", {
          body: { action: "create_batch", tenant_id: tenantId, instance_name: selectedInstance, prefix: batchPrefix.trim(), count: batchCount, capacity: groupCapacity },
        });

        clearInterval(interval);
        setBatchProgress(100);
        toast.success(`${data?.created || batchCount} grupos criados!`);
      }

      queryClient.invalidateQueries({ queryKey: ["whatsapp-groups-dashboard", tenantId] });
      setCreateOpen(false);
      setSingleName("");
      setBatchPrefix("");
      setBatchCount(5);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar grupo");
    } finally {
      setCreating(false);
      setBatchProgress(0);
    }
  };

  // ── Render ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-4 p-4 pb-0">
        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <UsersRound size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de Grupos Ativos</p>
              <p className="text-2xl font-bold text-foreground">{kpis.activeCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
              <Users size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de Membros</p>
              <p className="text-2xl font-bold text-foreground">{kpis.totalMembers.toLocaleString("pt-BR")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
              <Percent size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taxa de Ocupacao</p>
              <p className="text-2xl font-bold text-foreground">{kpis.occupancy}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar grupo..."
            className="pl-9 h-9 bg-card border-border"
          />
        </div>

        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus size={14} /> Novo Grupo
        </Button>

        {selectedIds.size > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                Acoes em Massa ({selectedIds.size}) <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => toast.info("Funcionalidade de agendamento em breve")}>
                Agendar Mensagem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus.mutate({ ids: [...selectedIds], status: "closed" })}>
                Fechar Grupos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus.mutate({ ids: [...selectedIds], status: "open" })}>
                Abrir Grupos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <Card className="bg-card border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="text-muted-foreground">Nome</TableHead>
                <TableHead className="text-muted-foreground w-[100px]">Status</TableHead>
                <TableHead className="text-muted-foreground w-[180px]">Lotacao</TableHead>
                <TableHead className="text-muted-foreground w-[130px]">Link de Convite</TableHead>
                <TableHead className="text-muted-foreground w-[130px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    {groups.length === 0 ? "Nenhum grupo encontrado" : "Nenhum resultado para a busca"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((g) => {
                  const cap = g.capacity || 250;
                  const pct = Math.round((g.participant_count / cap) * 100);
                  return (
                    <TableRow key={g.id} className="border-border">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(g.id)}
                          onCheckedChange={() => toggleSelect(g.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{g.name || g.jid}</TableCell>
                      <TableCell>
                        <Badge variant={g.status === "open" ? "default" : "secondary"} className="text-xs">
                          {g.status === "open" ? "Aberto" : "Fechado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {g.participant_count}/{cap}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => copyLink(g)}
                          disabled={!g.invite_link}
                        >
                          {copiedId === g.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                          {copiedId === g.id ? "Copiado" : "Copiar"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={g.is_locked ? "Desbloquear" : "Bloquear"}
                            onClick={() => toggleLock.mutate({ id: g.id, locked: !g.is_locked })}
                          >
                            {g.is_locked ? <Lock size={14} /> : <Unlock size={14} />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Remover"
                            onClick={() => {
                              if (confirm("Remover este grupo do painel?")) deleteGroup.mutate(g.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* ── Create Modal ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Grupo</DialogTitle>
          </DialogHeader>

          {/* Instance selector */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Instancia WhatsApp</label>
            <Select value={selectedInstance} onValueChange={setSelectedInstance}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Selecione a instancia..." />
              </SelectTrigger>
              <SelectContent>
                {instances.map((i) => (
                  <SelectItem key={i.instance_name} value={i.instance_name}>
                    {i.instance_name} {i.status === "connected" ? "" : `(${i.status})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as "individual" | "batch")}>
            <TabsList className="w-full">
              <TabsTrigger value="individual" className="flex-1">Individual</TabsTrigger>
              <TabsTrigger value="batch" className="flex-1">Em Massa</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="space-y-3 mt-3">
              <Input
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="Nome do grupo"
                className="bg-card border-border"
              />
            </TabsContent>

            <TabsContent value="batch" className="space-y-3 mt-3">
              <Input
                value={batchPrefix}
                onChange={(e) => setBatchPrefix(e.target.value)}
                placeholder="Prefixo (ex: Turma React)"
                className="bg-card border-border"
              />
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">
                  Quantidade: <span className="font-medium text-foreground">{batchCount}</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Math.min(50, Math.max(1, Number(e.target.value))))}
                  className="bg-card border-border"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Capacity selector — shared by both tabs */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">
              Limite de membros por grupo
            </label>
            <div className="flex gap-2">
              {[250, 512, 1024].map((cap) => (
                <button
                  key={cap}
                  onClick={() => setGroupCapacity(cap)}
                  className={`px-3 py-1.5 text-sm border transition-colors ${groupCapacity === cap ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}
                >
                  {cap}
                </button>
              ))}
              <Input
                type="number"
                min={2}
                max={2048}
                value={groupCapacity}
                onChange={(e) => setGroupCapacity(Math.min(2048, Math.max(2, Number(e.target.value))))}
                className="w-20 bg-card border-border text-sm"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Meta limita: 250 (padrao), 512 (comunidades) ou 1024 (grupos especiais).
            </p>
          </div>

          {creating && createTab === "batch" && (
            <div className="space-y-1">
              <Progress value={batchProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Criando grupos... {batchProgress}%
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
              {creating && <Loader2 size={14} className="animate-spin" />}
              {createTab === "individual" ? "Criar Grupo" : `Criar ${batchCount} Grupos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
