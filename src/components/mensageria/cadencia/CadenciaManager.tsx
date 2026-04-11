import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Search, Edit2, Trash2, Play, Pause, Clock,
  ArrowDown, GripVertical, Globe, Building2, Lock,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */
interface CadenceStep {
  id?: string;
  step_order: number;
  delay_minutes: number;
  body: string;
  media_url?: string | null;
}

interface Cadence {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  stop_on_reply: boolean;
  visibility: "all" | "sector" | "exclusive";
  sector_ids: string[];
  steps: CadenceStep[];
  usage_count: number;
  created_at: string;
}

type Visibility = "all" | "sector" | "exclusive";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: typeof Globe }[] = [
  { value: "all", label: "Todos", icon: Globe },
  { value: "sector", label: "Setor específico", icon: Building2 },
  { value: "exclusive", label: "Exclusivo (só eu)", icon: Lock },
];

const DELAY_PRESETS = [
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
  { label: "6h", value: 360 },
  { label: "12h", value: 720 },
  { label: "24h", value: 1440 },
  { label: "48h", value: 2880 },
];

function formatDelay(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ""}`;
  const days = Math.floor(minutes / 1440);
  const rem = minutes % 1440;
  return `${days}d${rem ? ` ${Math.floor(rem / 60)}h` : ""}`;
}

export default function CadenciaManager() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Cadence | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    is_active: true,
    stop_on_reply: true,
    visibility: "all" as Visibility,
    sector_ids: [] as string[],
  });
  const [steps, setSteps] = useState<CadenceStep[]>([
    { step_order: 1, delay_minutes: 5, body: "" },
  ]);

  const { data: cadences = [], isLoading } = useQuery({
    queryKey: ["cadences", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("message_cadences")
        .select("*, cadence_steps(*)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        steps: (c.cadence_steps || []).sort((a: any, b: any) => a.step_order - b.step_order),
      })) as Cadence[];
    },
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant não identificado");
      if (!form.name.trim()) throw new Error("Informe o nome da cadência");
      if (steps.length === 0) throw new Error("Adicione pelo menos 1 etapa");
      if (steps.some((s) => !s.body.trim())) throw new Error("Preencha o texto de todas as etapas");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
        stop_on_reply: form.stop_on_reply,
        visibility: form.visibility,
        sector_ids: form.sector_ids,
        tenant_id: tenantId,
      };

      let cadenceId: string;

      if (editing?.id) {
        const { error } = await supabase.from("message_cadences").update(payload).eq("id", editing.id);
        if (error) throw error;
        cadenceId = editing.id;
        // Delete old steps then re-insert
        await supabase.from("cadence_steps").delete().eq("cadence_id", cadenceId);
      } else {
        const { data, error } = await supabase.from("message_cadences").insert(payload).select("id").single();
        if (error) throw error;
        cadenceId = data.id;
      }

      // Insert steps
      const stepPayloads = steps.map((s, i) => ({
        cadence_id: cadenceId,
        step_order: i + 1,
        delay_minutes: s.delay_minutes,
        body: s.body.trim(),
        media_url: s.media_url || null,
      }));
      const { error: stepErr } = await supabase.from("cadence_steps").insert(stepPayloads);
      if (stepErr) throw stepErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadences", tenantId] });
      setEditOpen(false);
      toast.success(editing ? "Cadência atualizada" : "Cadência criada");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("cadence_steps").delete().eq("cadence_id", id);
      const { error } = await supabase.from("message_cadences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadences", tenantId] });
      toast.success("Cadência excluída");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("message_cadences").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cadences", tenantId] }),
  });

  const filtered = cadences.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", is_active: true, stop_on_reply: true, visibility: "all", sector_ids: [] });
    setSteps([{ step_order: 1, delay_minutes: 5, body: "" }]);
    setEditOpen(true);
  };

  const openEdit = (c: Cadence) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || "",
      is_active: c.is_active,
      stop_on_reply: c.stop_on_reply,
      visibility: c.visibility || "all",
      sector_ids: c.sector_ids || [],
    });
    setSteps(
      c.steps.length > 0
        ? c.steps.map((s) => ({ ...s }))
        : [{ step_order: 1, delay_minutes: 5, body: "" }],
    );
    setEditOpen(true);
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { step_order: prev.length + 1, delay_minutes: 60, body: "" }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof CadenceStep, value: any) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Cadência de Mensagens</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Sequências automatizadas de follow-up. Param automaticamente quando o cliente responde.
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1">
          <Plus size={14} /> Nova Cadência
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <Input placeholder="Buscar cadências..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
            {search ? "Nenhuma cadência encontrada" : "Nenhuma cadência cadastrada. Crie a primeira!"}
          </p>
        ) : (
          filtered.map((c) => {
            const visOpt = VISIBILITY_OPTIONS.find((v) => v.value === c.visibility) || VISIBILITY_OPTIONS[0];
            const VisIcon = visOpt.icon;
            return (
              <Card
                key={c.id}
                className="p-3 flex items-start gap-3 group"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", opacity: c.is_active ? 1 : 0.6 }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] gap-1"
                      style={{ color: c.is_active ? "#10b981" : "var(--text-muted)" }}
                    >
                      {c.is_active ? <Play size={8} /> : <Pause size={8} />}
                      {c.is_active ? "Ativa" : "Pausada"}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] gap-0.5">
                      <VisIcon size={8} /> {visOpt.label}
                    </Badge>
                    {c.stop_on_reply && (
                      <Badge variant="secondary" className="text-[9px]">Para ao responder</Badge>
                    )}
                  </div>
                  {c.description && (
                    <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{c.description}</p>
                  )}
                  <div className="flex items-center gap-1 flex-wrap">
                    {c.steps.map((step, i) => (
                      <span key={i} className="flex items-center gap-0.5">
                        {i > 0 && <ArrowDown size={10} style={{ color: "var(--text-muted)" }} />}
                        <Badge variant="outline" className="text-[9px] font-mono">
                          <Clock size={8} className="mr-0.5" />
                          {formatDelay(step.delay_minutes)}
                        </Badge>
                      </span>
                    ))}
                    <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>
                      ({c.steps.length} {c.steps.length === 1 ? "etapa" : "etapas"})
                    </span>
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Usado {c.usage_count || 0}×
                  </span>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: c.id, is_active: !c.is_active })}
                    className="p-1 rounded hover:bg-accent/10"
                    title={c.is_active ? "Pausar" : "Ativar"}
                  >
                    {c.is_active ? <Pause size={14} style={{ color: "var(--text-secondary)" }} /> : <Play size={14} style={{ color: "#10b981" }} />}
                  </button>
                  <button onClick={() => openEdit(c)} className="p-1 rounded hover:bg-accent/10">
                    <Edit2 size={14} style={{ color: "var(--text-secondary)" }} />
                  </button>
                  <button onClick={() => deleteMutation.mutate(c.id)} className="p-1 rounded hover:bg-red-500/10">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cadência" : "Nova Cadência de Mensagens"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              placeholder="Nome da cadência (ex: Follow-up pós-contato)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              placeholder="Descrição (opcional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.stop_on_reply} onCheckedChange={(v) => setForm({ ...form, stop_on_reply: v })} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Parar quando cliente responder</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Ativa</span>
              </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Visibilidade:</span>
              {VISIBILITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = form.visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, visibility: opt.value })}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors"
                    style={{
                      background: isSelected ? "var(--acc, hsl(var(--primary)))" : "transparent",
                      color: isSelected ? "#fff" : "var(--text-muted)",
                      border: `1px solid ${isSelected ? "transparent" : "var(--border)"}`,
                    }}
                  >
                    <Icon size={10} /> {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  Etapas ({steps.length})
                </span>
                <Button variant="ghost" size="sm" onClick={addStep} className="text-xs gap-1 h-7">
                  <Plus size={12} /> Etapa
                </Button>
              </div>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg space-y-2"
                    style={{ background: "var(--bg-card, hsl(var(--muted)))", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} style={{ color: "var(--text-muted)" }} />
                      <Badge variant="outline" className="text-[10px]">Etapa {i + 1}</Badge>
                      <div className="flex-1" />
                      {/* Delay selector */}
                      <Select
                        value={String(step.delay_minutes)}
                        onValueChange={(v) => updateStep(i, "delay_minutes", Number(v))}
                      >
                        <SelectTrigger className="w-24 h-7 text-[11px]">
                          <Clock size={10} className="mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DELAY_PRESETS.map((p) => (
                            <SelectItem key={p.value} value={String(p.value)} className="text-xs">
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {steps.length > 1 && (
                        <button onClick={() => removeStep(i)} className="p-1 rounded hover:bg-red-500/10">
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      )}
                    </div>
                    <Textarea
                      placeholder={`Mensagem da etapa ${i + 1}... Use {{nome}} para variáveis`}
                      value={step.body}
                      onChange={(e) => updateStep(i, "body", e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    {i < steps.length - 1 && (
                      <div className="flex justify-center pt-1">
                        <ArrowDown size={14} style={{ color: "var(--text-muted)" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name.trim() || steps.some((s) => !s.body.trim()) || saveMutation.isPending}
              className="w-full"
            >
              {saveMutation.isPending ? "Salvando..." : editing ? "Salvar Alterações" : "Criar Cadência"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
