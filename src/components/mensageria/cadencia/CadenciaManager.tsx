import { useState, useRef, useCallback, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Search, Edit2, Trash2, Play, Pause, Clock, ArrowDown,
  Globe, Building2, Lock, Image, FileText, Mic, Video, Type,
  Upload, X, Repeat,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */
type MediaType = "text" | "image" | "audio" | "video" | "document";

interface CadenceStep {
  id?: string;
  step_order: number;
  delay_minutes: number;
  media_type: MediaType;
  body: string;
  caption?: string | null;
  media_url?: string | null;
  _file?: File | null; // local only, not persisted
  _preview?: string | null;
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

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: typeof Globe; color: string }[] = [
  { value: "all", label: "Todos", icon: Globe, color: "#10B981" },
  { value: "sector", label: "Setor", icon: Building2, color: "#3B82F6" },
  { value: "exclusive", label: "Só eu", icon: Lock, color: "#F59E0B" },
];

const DELAY_PRESETS = [
  { label: "Imediato", value: 0 },
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
  { label: "6h", value: 360 },
  { label: "12h", value: 720 },
  { label: "24h", value: 1440 },
  { label: "48h", value: 2880 },
  { label: "72h", value: 4320 },
];

const MEDIA_TYPES: { type: MediaType; icon: typeof Type; label: string; color: string; accept?: string }[] = [
  { type: "text", icon: Type, label: "Texto", color: "#10B981" },
  { type: "image", icon: Image, label: "Imagem", color: "#3B82F6", accept: "image/*" },
  { type: "audio", icon: Mic, label: "Áudio", color: "#F59E0B", accept: "audio/*" },
  { type: "video", icon: Video, label: "Vídeo", color: "#EF4444", accept: "video/*" },
  { type: "document", icon: FileText, label: "Documento", color: "#818CF8", accept: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx" },
];

function formatDelay(minutes: number) {
  if (minutes === 0) return "Imediato";
  if (minutes < 60) return `${minutes}min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ""}`;
  const days = Math.floor(minutes / 1440);
  const rem = minutes % 1440;
  return `${days}d${rem ? ` ${Math.floor(rem / 60)}h` : ""}`;
}

function mediaIcon(type: MediaType) {
  const m = MEDIA_TYPES.find((mt) => mt.type === type);
  return m ? { Icon: m.icon, color: m.color, label: m.label } : { Icon: Type, color: "#10B981", label: "Texto" };
}

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

export default function CadenciaManager() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Cadence | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFileStep, setActiveFileStep] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "", description: "", is_active: true, stop_on_reply: true,
    visibility: "all" as Visibility, sector_ids: [] as string[],
  });
  const [steps, setSteps] = useState<CadenceStep[]>([
    { step_order: 1, delay_minutes: 0, media_type: "text", body: "" },
  ]);

  const { data: cadences = [], isLoading } = useQuery({
    queryKey: ["cadences", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase as any)
        .from("message_cadences")
        .select("*, cadence_steps(*)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        steps: (c.cadence_steps || []).sort((a: any, b: any) => a.step_order - b.step_order).map((s: any) => ({
          ...s,
          media_type: s.media_type || "text",
        })),
      })) as Cadence[];
    },
    enabled: !!tenantId,
  });

  /* ── Upload helper ── */
  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "bin";
    const fileName = `cadence/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (error) throw new Error("Upload falhou: " + error.message);
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant não identificado");
      if (!form.name.trim()) throw new Error("Informe o nome da cadência");
      if (steps.length === 0) throw new Error("Adicione pelo menos 1 etapa");

      // Validate: each step needs content
      for (const s of steps) {
        if (s.media_type === "text" && !s.body.trim()) throw new Error("Preencha o texto de todas as etapas de texto");
        if (s.media_type !== "text" && !s.media_url && !s._file) throw new Error(`Etapa "${mediaIcon(s.media_type).label}" precisa de um arquivo`);
      }

      // Upload pending files
      const uploadedSteps = await Promise.all(
        steps.map(async (s) => {
          if (s._file) {
            const url = await uploadFile(s._file);
            return { ...s, media_url: url, _file: null, _preview: null };
          }
          return s;
        })
      );

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
        const { error } = await (supabase as any).from("message_cadences").update(payload).eq("id", editing.id);
        if (error) throw error;
        cadenceId = editing.id;
        await (supabase as any).from("cadence_steps").delete().eq("cadence_id", cadenceId);
      } else {
        const { data, error } = await (supabase as any).from("message_cadences").insert(payload).select("id").single();
        if (error) throw error;
        cadenceId = data.id;
      }

      const stepPayloads = uploadedSteps.map((s, i) => ({
        cadence_id: cadenceId,
        step_order: i + 1,
        delay_minutes: s.delay_minutes,
        media_type: s.media_type,
        body: s.body.trim(),
        caption: s.caption?.trim() || null,
        media_url: s.media_url || null,
      }));
      const { error: stepErr } = await (supabase as any).from("cadence_steps").insert(stepPayloads);
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
      await (supabase as any).from("cadence_steps").delete().eq("cadence_id", id);
      const { error } = await (supabase as any).from("message_cadences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadences", tenantId] });
      toast.success("Cadência excluída");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("message_cadences").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cadences", tenantId] }),
  });

  const filtered = cadences.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", is_active: true, stop_on_reply: true, visibility: "all", sector_ids: [] });
    setSteps([{ step_order: 1, delay_minutes: 0, media_type: "text", body: "" }]);
    setEditOpen(true);
  };

  const openEdit = (c: Cadence) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || "", is_active: c.is_active, stop_on_reply: c.stop_on_reply, visibility: c.visibility || "all", sector_ids: c.sector_ids || [] });
    setSteps(c.steps.length > 0 ? c.steps.map((s) => ({ ...s })) : [{ step_order: 1, delay_minutes: 0, media_type: "text", body: "" }]);
    setEditOpen(true);
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { step_order: prev.length + 1, delay_minutes: 60, media_type: "text", body: "" }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, updates: Partial<CadenceStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const handleFileSelect = (index: number) => {
    setActiveFileStep(index);
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || activeFileStep === null) return;
    if (file.size > MAX_FILE_SIZE) { toast.error("Arquivo muito grande. Máximo 16MB."); return; }
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    updateStep(activeFileStep, { _file: file, _preview: preview, media_url: null });
    setActiveFileStep(null);
  }, [activeFileStep]);

  const getAcceptForStep = (index: number) => {
    const mt = MEDIA_TYPES.find((m) => m.type === steps[index]?.media_type);
    return mt?.accept || "*/*";
  };

  /* ── Validate save button ── */
  const canSave = form.name.trim() && steps.every((s) => {
    if (s.media_type === "text") return !!s.body.trim();
    return !!(s.media_url || s._file);
  });

  return (
    <div className="flex flex-col h-full p-5 gap-5">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={activeFileStep !== null ? getAcceptForStep(activeFileStep) : "*/*"}
        onChange={handleFileChange}
      />

      {/* Header */}
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(129,140,248,0.02) 100%)", border: "1px solid rgba(129,140,248,0.15)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(129,140,248,0.15)" }}>
            <Repeat size={20} style={{ color: "#818CF8" }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "hsl(var(--foreground))" }}>Cadência de Mensagens</h2>
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Sequências automatizadas de follow-up com texto, imagem, áudio e vídeo.
            </p>
          </div>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus size={14} /> Nova Cadência
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
        <Input placeholder="Buscar cadências..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm rounded-lg" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Carregando...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Repeat size={32} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.3 }} />
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              {search ? "Nenhuma cadência encontrada" : "Nenhuma cadência cadastrada. Crie a primeira!"}
            </p>
          </div>
        ) : (
          filtered.map((c) => {
            const visOpt = VISIBILITY_OPTIONS.find((v) => v.value === c.visibility) || VISIBILITY_OPTIONS[0];
            return (
              <div
                key={c.id}
                className="group rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", opacity: c.is_active ? 1 : 0.55 }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(129,140,248,0.12)" }}>
                    <Repeat size={16} style={{ color: "#818CF8" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ background: c.is_active ? "rgba(16,185,129,0.12)" : "hsl(var(--muted))", color: c.is_active ? "#10B981" : "hsl(var(--muted-foreground))" }}>
                        {c.is_active ? <Play size={8} /> : <Pause size={8} />} {c.is_active ? "Ativa" : "Pausada"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ background: `${visOpt.color}12`, color: visOpt.color }}>
                        <visOpt.icon size={8} /> {visOpt.label}
                      </span>
                      {c.stop_on_reply && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                          Para ao responder
                        </span>
                      )}
                    </div>
                    {c.description && <p className="text-xs mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>{c.description}</p>}
                    {/* Step timeline */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {c.steps.map((step, i) => {
                        const mi = mediaIcon(step.media_type);
                        return (
                          <span key={i} className="flex items-center gap-0.5">
                            {i > 0 && <ArrowDown size={10} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.4 }} />}
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ background: `${mi.color}10`, color: mi.color, border: `1px solid ${mi.color}20` }}>
                              <mi.Icon size={9} />
                              {formatDelay(step.delay_minutes)}
                            </span>
                          </span>
                        );
                      })}
                      <span className="text-[10px] ml-1" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.6 }}>
                        ({c.steps.length} {c.steps.length === 1 ? "etapa" : "etapas"})
                      </span>
                    </div>
                    <span className="text-[10px] mt-1 inline-block" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }}>
                      Usado {c.usage_count || 0}×
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => toggleActiveMutation.mutate({ id: c.id, is_active: !c.is_active })} className="p-2 rounded-lg transition-colors hover:bg-[hsl(var(--muted))]" title={c.is_active ? "Pausar" : "Ativar"}>
                      {c.is_active ? <Pause size={14} style={{ color: "hsl(var(--muted-foreground))" }} /> : <Play size={14} style={{ color: "#10B981" }} />}
                    </button>
                    <button onClick={() => openEdit(c)} className="p-2 rounded-lg transition-colors hover:bg-[hsl(var(--muted))]"><Edit2 size={14} style={{ color: "hsl(var(--muted-foreground))" }} /></button>
                    <button onClick={() => deleteMutation.mutate(c.id)} className="p-2 rounded-lg transition-colors hover:bg-[rgba(239,68,68,0.1)]"><Trash2 size={14} color="#EF4444" /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cadência" : "Nova Cadência de Mensagens"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input placeholder="Nome da cadência (ex: Follow-up pós-contato)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg" />
            <Input placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg" />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.stop_on_reply} onCheckedChange={(v) => setForm({ ...form, stop_on_reply: v })} />
                <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Parar ao responder</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Ativa</span>
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Visibilidade</span>
              <div className="flex gap-2">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = form.visibility === opt.value;
                  return (
                    <button key={opt.value} onClick={() => setForm({ ...form, visibility: opt.value })}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] rounded-lg transition-all"
                      style={{ background: isSelected ? `${opt.color}18` : "transparent", color: isSelected ? opt.color : "hsl(var(--muted-foreground))", border: `1px solid ${isSelected ? `${opt.color}40` : "hsl(var(--border))"}` }}>
                      <Icon size={12} /> {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Steps ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: "hsl(var(--foreground))" }}>Etapas ({steps.length})</span>
                <Button variant="ghost" size="sm" onClick={addStep} className="text-xs gap-1 h-7 rounded-lg">
                  <Plus size={12} /> Etapa
                </Button>
              </div>
              <div className="space-y-3">
                {steps.map((step, i) => {
                  const mi = mediaIcon(step.media_type);
                  const hasFile = !!(step._file || step.media_url);
                  return (
                    <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${mi.color}25`, background: "hsl(var(--card))" }}>
                      {/* Step header */}
                      <div className="flex items-center gap-2 px-3 py-2" style={{ background: `${mi.color}08`, borderBottom: `1px solid ${mi.color}15` }}>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${mi.color}15`, color: mi.color }}>
                          {i + 1}
                        </span>

                        {/* Media type selector */}
                        <div className="flex items-center gap-0.5">
                          {MEDIA_TYPES.map((mt) => {
                            const isActive = step.media_type === mt.type;
                            return (
                              <button
                                key={mt.type}
                                onClick={() => updateStep(i, { media_type: mt.type, _file: null, _preview: null, media_url: null, body: step.media_type === "text" ? step.body : "", caption: "" })}
                                className="p-1.5 rounded-lg transition-all"
                                style={{ background: isActive ? `${mt.color}20` : "transparent", color: isActive ? mt.color : "hsl(var(--muted-foreground))" }}
                                title={mt.label}
                              >
                                <mt.icon size={14} />
                              </button>
                            );
                          })}
                        </div>

                        <span className="text-[10px] font-medium" style={{ color: mi.color }}>{mi.label}</span>
                        <div className="flex-1" />

                        {/* Delay */}
                        <Select value={String(step.delay_minutes)} onValueChange={(v) => updateStep(i, { delay_minutes: Number(v) })}>
                          <SelectTrigger className="w-24 h-7 text-[11px] rounded-lg">
                            <Clock size={10} className="mr-1" /><SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DELAY_PRESETS.map((p) => (
                              <SelectItem key={p.value} value={String(p.value)} className="text-xs">{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {steps.length > 1 && (
                          <button onClick={() => removeStep(i)} className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)]">
                            <Trash2 size={12} color="#EF4444" />
                          </button>
                        )}
                      </div>

                      {/* Step content */}
                      <div className="p-3 space-y-2">
                        {step.media_type === "text" ? (
                          <Textarea
                            placeholder={`Mensagem da etapa ${i + 1}... Use {{nome}} para variáveis`}
                            value={step.body}
                            onChange={(e) => updateStep(i, { body: e.target.value })}
                            rows={2}
                            className="text-sm rounded-lg"
                          />
                        ) : (
                          <>
                            {/* File upload zone */}
                            {hasFile ? (
                              <div className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: "hsl(var(--muted))" }}>
                                {step._preview ? (
                                  <img src={step._preview} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${mi.color}15` }}>
                                    <mi.Icon size={20} style={{ color: mi.color }} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                                    {step._file?.name || step.media_url?.split("/").pop() || "Arquivo"}
                                  </p>
                                  <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                                    {step._file ? `${(step._file.size / (1024 * 1024)).toFixed(1)} MB` : "Enviado"}
                                  </p>
                                </div>
                                <button onClick={() => updateStep(i, { _file: null, _preview: null, media_url: null })} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]">
                                  <X size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleFileSelect(i)}
                                className="w-full py-4 rounded-lg border-2 border-dashed flex flex-col items-center gap-1.5 transition-colors hover:border-solid"
                                style={{ borderColor: `${mi.color}30`, color: mi.color }}
                              >
                                <Upload size={20} />
                                <span className="text-xs font-medium">
                                  Clique para selecionar {mi.label.toLowerCase()}
                                </span>
                                <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                                  Máximo 16MB
                                </span>
                              </button>
                            )}

                            {/* Caption (for image/video/document) */}
                            {step.media_type !== "audio" && (
                              <Input
                                placeholder="Legenda (opcional)... Use {{nome}} para variáveis"
                                value={step.caption || ""}
                                onChange={(e) => updateStep(i, { caption: e.target.value })}
                                className="text-sm rounded-lg"
                              />
                            )}
                          </>
                        )}
                      </div>

                      {/* Arrow connector */}
                      {i < steps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown size={14} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.3 }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700"
            >
              {saveMutation.isPending ? "Salvando..." : editing ? "Salvar Alterações" : "Criar Cadência"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
