import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { GitBranch, GripVertical, Save, Plus, Trash2, Star, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { usePipelines, type SalesPipeline } from "@/hooks/usePipelines";
import { useTenantId } from "@/hooks/useTenantId";
import { cn } from "@/lib/utils";

export interface FunnelStage {
  key: string;
  label: string;
  color: string;
  enabled: boolean;
  ordem: number;
}

// Keep legacy export for compatibility
export interface FunnelConfig {
  stages: FunnelStage[];
  pipelineTitle: string;
  currencyPrefix: string;
  showProbability: boolean;
  showForecast: boolean;
  defaultOrigin: string;
}

export function useFunnelConfig() {
  const DEFAULT_CONFIG: FunnelConfig = {
    stages: [],
    pipelineTitle: 'Pipeline de Vendas',
    currencyPrefix: 'R$',
    showProbability: true,
    showForecast: true,
    defaultOrigin: 'inbound',
  };
  return { config: DEFAULT_CONFIG, saveConfig: () => {}, defaultConfig: DEFAULT_CONFIG };
}

/* ─────────────── Pipeline Card (one per pipeline) ─────────────── */

function PipelineCard({
  pipeline,
  onUpdate,
  onDelete,
  onSetDefault,
  canDelete,
}: {
  pipeline: SalesPipeline;
  onUpdate: (id: string, data: Partial<SalesPipeline>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  canDelete: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(pipeline.name);
  const [description, setDescription] = useState(pipeline.description || "");
  const [currencyPrefix, setCurrencyPrefix] = useState(pipeline.currency_prefix);
  const [showProbability, setShowProbability] = useState(pipeline.show_probability);
  const [showForecast, setShowForecast] = useState(pipeline.show_forecast);
  const [stages, setStages] = useState<FunnelStage[]>(pipeline.stages);
  const [saving, setSaving] = useState(false);

  // Sync when pipeline changes externally
  useEffect(() => {
    setName(pipeline.name);
    setDescription(pipeline.description || "");
    setCurrencyPrefix(pipeline.currency_prefix);
    setShowProbability(pipeline.show_probability);
    setShowForecast(pipeline.show_forecast);
    setStages(pipeline.stages);
  }, [pipeline]);

  const hasChanges =
    name !== pipeline.name ||
    description !== (pipeline.description || "") ||
    currencyPrefix !== pipeline.currency_prefix ||
    showProbability !== pipeline.show_probability ||
    showForecast !== pipeline.show_forecast ||
    JSON.stringify(stages) !== JSON.stringify(pipeline.stages);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(pipeline.id, {
        name,
        description: description || null,
        currency_prefix: currencyPrefix,
        show_probability: showProbability,
        show_forecast: showForecast,
        stages,
      } as any);
      toast.success(`Pipeline "${name}" salvo!`);
    } catch {
      toast.error("Erro ao salvar pipeline");
    }
    setSaving(false);
  };

  const updateStage = (index: number, field: keyof FunnelStage, value: any) => {
    const updated = [...stages];
    updated[index] = { ...updated[index], [field]: value };
    setStages(updated);
  };

  const addStage = () => {
    const insertAt = Math.max(0, stages.length - 2);
    const newStages = [...stages];
    newStages.splice(insertAt, 0, {
      key: `etapa_${Date.now()}`,
      label: "Nova Etapa",
      color: "#94a3b8",
      enabled: true,
      ordem: insertAt + 1,
    });
    newStages.forEach((s, i) => (s.ordem = i + 1));
    setStages(newStages);
  };

  const removeStage = (index: number) => {
    const stage = stages[index];
    if (stage.key === "fechado_ganho" || stage.key === "fechado_perdido") {
      toast.error("Etapas de fechamento não podem ser removidas");
      return;
    }
    const updated = stages.filter((_, i) => i !== index);
    updated.forEach((s, i) => (s.ordem = i + 1));
    setStages(updated);
  };

  return (
    <div className="border border-border bg-card overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{pipeline.name}</span>
            {pipeline.is_default && (
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
            )}
            {hasChanges && (
              <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/30">
                Alterado
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {pipeline.description || "Sem descrição"} · {stages.filter(s => s.enabled).length} etapas ativas
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {stages.filter(s => s.enabled).slice(0, 6).map(s => (
            <span
              key={s.key}
              className="w-3 h-3 rounded-full border border-background"
              style={{ background: s.color }}
              title={s.label}
            />
          ))}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50">
          {/* General Settings */}
          <div className="grid gap-3 sm:grid-cols-3 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Opcional" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prefixo Moeda</Label>
              <Input value={currencyPrefix} onChange={e => setCurrencyPrefix(e.target.value)} placeholder="R$" className="h-9 text-sm w-24" />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={showProbability} onCheckedChange={setShowProbability} />
              <Label className="text-xs text-muted-foreground">Probabilidade</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showForecast} onCheckedChange={setShowForecast} />
              <Label className="text-xs text-muted-foreground">Previsão (Forecast)</Label>
            </div>
          </div>

          <Separator />

          {/* Stages */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Etapas do Funil</h4>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addStage}>
                <Plus className="h-3 w-3" /> Etapa
              </Button>
            </div>
            <div className="space-y-1.5">
              {stages.map((stage, i) => {
                const isProtected = stage.key === "fechado_ganho" || stage.key === "fechado_perdido";
                return (
                  <div key={stage.key} className="flex items-center gap-2 border border-border p-2">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    <div
                      className="h-6 w-6 rounded shrink-0 border border-border cursor-pointer relative overflow-hidden"
                      style={{ backgroundColor: stage.color }}
                    >
                      <input
                        type="color"
                        value={stage.color}
                        onChange={e => updateStage(i, "color", e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                    <Input
                      value={stage.label}
                      onChange={e => updateStage(i, "label", e.target.value)}
                      className="h-7 text-xs flex-1"
                    />
                    <Badge variant="outline" className="text-[9px] shrink-0">{stage.ordem}</Badge>
                    <Switch
                      checked={stage.enabled}
                      onCheckedChange={v => updateStage(i, "enabled", v)}
                      disabled={isProtected}
                    />
                    {!isProtected ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeStage(i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-[9px] shrink-0">Protegido</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {!pipeline.is_default && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => onSetDefault(pipeline.id)}
                >
                  <Star className="h-3 w-3" /> Definir como padrão
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Excluir pipeline "${pipeline.name}"?`)) {
                      onDelete(pipeline.id);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" /> Excluir
                </Button>
              )}
            </div>
            <Button size="sm" className="gap-1 text-xs" onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Main Card ─────────────── */

export function SalesFunnelConfigCard() {
  const tenantId = useTenantId();
  const { pipelines, isLoading, createPipeline, updatePipeline, deletePipeline } = usePipelines(tenantId);

  // Sort pipelines by name (alphabetical)
  const sorted = [...pipelines].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const handleSetDefault = useCallback(async (id: string) => {
    // Remove default from all, set on chosen
    for (const p of pipelines) {
      if (p.is_default && p.id !== id) {
        await updatePipeline(p.id, { is_default: false } as any);
      }
    }
    await updatePipeline(id, { is_default: true } as any);
    toast.success("Pipeline definido como padrão!");
  }, [pipelines, updatePipeline]);

  const handleCreate = async () => {
    try {
      await createPipeline({ name: `Pipeline ${pipelines.length + 1}` });
      toast.success("Novo pipeline criado!");
    } catch (err: any) {
      console.error("[Pipeline] Create error:", err);
      toast.error("Erro ao criar pipeline: " + (err?.message || "Erro desconhecido"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePipeline(id);
      toast.success("Pipeline removido!");
    } catch {
      toast.error("Erro ao remover pipeline");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="h-5 w-5" />
              Pipelines de Vendas
            </CardTitle>
            <CardDescription>
              Gerencie todos os seus pipelines — etapas, cores e configurações individuais
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCreate}>
            <Plus className="h-3.5 w-3.5" /> Novo Pipeline
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhum pipeline criado. Clique em "Novo Pipeline" para começar.
          </div>
        ) : (
          sorted.map(p => (
            <PipelineCard
              key={p.id}
              pipeline={p}
              onUpdate={updatePipeline}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              canDelete={pipelines.length > 1}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
