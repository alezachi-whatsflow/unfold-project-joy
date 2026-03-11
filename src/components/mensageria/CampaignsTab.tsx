import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Play, Pause, Trash2, Eye, Loader2, Send, RefreshCw,
  Clock, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { campaignService } from "@/services/campaignService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string | null;
  instance_name: string;
  type: string | null;
  status: string | null;
  total_contacts: number | null;
  sent_count: number | null;
  failed_count: number | null;
  delay_min: number | null;
  delay_max: number | null;
  folder_id: string | null;
  created_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; icon: any; cls: string }> = {
  scheduled: { label: "Agendada", icon: Clock, cls: "text-blue-400 bg-blue-500/20" },
  running: { label: "Enviando", icon: Play, cls: "text-emerald-400 bg-emerald-500/20" },
  paused: { label: "Pausada", icon: Pause, cls: "text-amber-400 bg-amber-500/20" },
  completed: { label: "Concluída", icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-500/20" },
  failed: { label: "Falha", icon: XCircle, cls: "text-red-400 bg-red-500/20" },
  stopped: { label: "Parada", icon: AlertCircle, cls: "text-muted-foreground bg-muted/50" },
};

export default function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [instances, setInstances] = useState<{ instance_name: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showDetails, setShowDetails] = useState<Campaign | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    instance_name: "",
    numbers: "",
    message: "",
    delayMin: 10,
    delayMax: 30,
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCampaigns(data);
    setLoading(false);
  };

  const fetchInstances = async () => {
    const { data } = await supabase
      .from("whatsapp_instances")
      .select("instance_name, label")
      .eq("provedor", "uazapi")
      .eq("status", "connected");
    if (data) setInstances(data);
  };

  useEffect(() => {
    fetchCampaigns();
    fetchInstances();
  }, []);

  const handleCreate = async () => {
    if (!form.instance_name || !form.numbers.trim() || !form.message.trim()) {
      toast.error("Preencha instância, números e mensagem.");
      return;
    }
    setCreating(true);
    try {
      const numbers = form.numbers
        .split(/[\n,;]+/)
        .map((n) => n.trim())
        .filter(Boolean);

      const result = await campaignService.createSimple(form.instance_name, {
        numbers,
        type: "text",
        text: form.message,
        delayMin: form.delayMin,
        delayMax: form.delayMax,
        scheduled_for: 0,
        info: form.name || "Campanha sem nome",
      });

      // Save to DB
      await supabase.from("whatsapp_campaigns").insert({
        name: form.name || "Campanha " + new Date().toLocaleDateString("pt-BR"),
        instance_name: form.instance_name,
        type: "simple",
        status: "scheduled",
        total_contacts: numbers.length,
        delay_min: form.delayMin,
        delay_max: form.delayMax,
        folder_id: result?.folder_id || null,
        message_type: "text",
        info: form.name,
      });

      toast.success(`Campanha criada com ${numbers.length} contatos!`);
      setShowCreate(false);
      setForm({ name: "", instance_name: "", numbers: "", message: "", delayMin: 10, delayMax: 30 });
      fetchCampaigns();
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "Falha ao criar campanha"));
    } finally {
      setCreating(false);
    }
  };

  const handleControl = async (campaign: Campaign, action: "stop" | "continue" | "delete") => {
    if (!campaign.folder_id) {
      toast.error("Campanha sem folder_id");
      return;
    }
    try {
      await campaignService.control(campaign.instance_name, campaign.folder_id, action);
      const statusMap = { stop: "stopped", continue: "running", delete: "deleted" };
      if (action === "delete") {
        await supabase.from("whatsapp_campaigns").delete().eq("id", campaign.id);
      } else {
        await supabase.from("whatsapp_campaigns").update({ status: statusMap[action] }).eq("id", campaign.id);
      }
      toast.success(action === "stop" ? "Campanha parada" : action === "continue" ? "Campanha retomada" : "Campanha excluída");
      fetchCampaigns();
    } catch (err: any) {
      toast.error("Erro: " + (err?.message || "Falha"));
    }
  };

  const syncFolders = async () => {
    if (instances.length === 0) {
      toast.error("Nenhuma instância conectada.");
      return;
    }
    setLoading(true);
    try {
      for (const inst of instances) {
        const folders = await campaignService.listFolders(inst.instance_name);
        if (Array.isArray(folders)) {
          for (const f of folders) {
            await supabase.from("whatsapp_campaigns").upsert({
              folder_id: f.folder_id || f.id,
              instance_name: inst.instance_name,
              name: f.info || f.name || "Campanha",
              status: f.status || "scheduled",
              total_contacts: f.totalMessages || 0,
              sent_count: f.sentMessages || 0,
              failed_count: f.failedMessages || 0,
            }, { onConflict: "folder_id" });
          }
        }
      }
      toast.success("Campanhas sincronizadas!");
      fetchCampaigns();
    } catch {
      toast.error("Erro ao sincronizar.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Campanhas de Disparo</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncFolders} disabled={loading} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Sincronizar
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="h-4 w-4" /> Nova Campanha
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{campaigns.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{campaigns.filter(c => c.status === "running").length}</p>
            <p className="text-xs text-muted-foreground">Enviando</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{campaigns.filter(c => c.status === "completed").length}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Msgs Enviadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign table */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Instância</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Progresso</TableHead>
                <TableHead className="text-xs">Delay</TableHead>
                <TableHead className="text-xs">Criada</TableHead>
                <TableHead className="text-xs">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma campanha encontrada.
                  </TableCell>
                </TableRow>
              )}
              {campaigns.map((c) => {
                const st = STATUS_MAP[c.status || "scheduled"] || STATUS_MAP.scheduled;
                const Icon = st.icon;
                const total = c.total_contacts || 0;
                const sent = c.sent_count || 0;
                const failed = c.failed_count || 0;
                const pct = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">{c.name || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{c.instance_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[10px] gap-1", st.cls)}>
                        <Icon className="h-3 w-3" /> {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-emerald-400">{sent}✓</span>
                          {failed > 0 && <span className="text-red-400">{failed}✗</span>}
                          <span className="text-muted-foreground">/ {total}</span>
                        </div>
                        <div className="h-1.5 w-20 bg-muted rounded-full">
                          <div
                            className="h-1.5 bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{c.delay_min}s - {c.delay_max}s</TableCell>
                    <TableCell className="text-xs">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(c.status === "running" || c.status === "scheduled") && (
                          <Button size="sm" variant="ghost" onClick={() => handleControl(c, "stop")} title="Parar">
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {(c.status === "stopped" || c.status === "paused") && (
                          <Button size="sm" variant="ghost" onClick={() => handleControl(c, "continue")} title="Retomar">
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleControl(c, "delete")}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Campanha de Disparo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome da campanha</Label>
              <Input
                placeholder="Ex: Black Friday 2026"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Instância</Label>
              <Select value={form.instance_name} onValueChange={(v) => setForm({ ...form, instance_name: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a instância" /></SelectTrigger>
                <SelectContent>
                  {instances.map((i) => (
                    <SelectItem key={i.instance_name} value={i.instance_name}>
                      {i.label || i.instance_name}
                    </SelectItem>
                  ))}
                  {instances.length === 0 && (
                    <SelectItem value="_none" disabled>Nenhuma instância conectada</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Números (um por linha ou separados por vírgula)</Label>
              <Textarea
                placeholder="5543999011234&#10;5511987654321&#10;5521976543210"
                value={form.numbers}
                onChange={(e) => setForm({ ...form, numbers: e.target.value })}
                rows={5}
              />
              <p className="text-[10px] text-muted-foreground">
                {form.numbers.split(/[\n,;]+/).filter((n) => n.trim()).length} números detectados
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Mensagem</Label>
              <Textarea
                placeholder="Olá! Temos uma oferta especial para você..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Delay mínimo (seg)</Label>
                <Input
                  type="number"
                  min={5}
                  value={form.delayMin}
                  onChange={(e) => setForm({ ...form, delayMin: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Delay máximo (seg)</Label>
                <Input
                  type="number"
                  min={5}
                  value={form.delayMax}
                  onChange={(e) => setForm({ ...form, delayMax: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Criar e Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
