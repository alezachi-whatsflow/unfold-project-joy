import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GitBranch, GripVertical, RotateCcw, Save, Plus, Trash2 } from "lucide-react";

export interface FunnelStage {
  key: string;
  label: string;
  color: string;
  enabled: boolean;
  ordem: number;
}

export interface FunnelConfig {
  stages: FunnelStage[];
  pipelineTitle: string;
  currencyPrefix: string;
  showProbability: boolean;
  showForecast: boolean;
  defaultOrigin: string;
}

const DEFAULT_CONFIG: FunnelConfig = {
  stages: [
    { key: 'prospeccao', label: 'Prospecção', color: '#60a5fa', enabled: true, ordem: 1 },
    { key: 'qualificado', label: 'Qualificado', color: '#a78bfa', enabled: true, ordem: 2 },
    { key: 'proposta', label: 'Proposta Enviada', color: '#f59e0b', enabled: true, ordem: 3 },
    { key: 'negociacao', label: 'Em Negociação', color: '#fb923c', enabled: true, ordem: 4 },
    { key: 'fechado_ganho', label: 'Fechado — Ganho', color: '#4ade80', enabled: true, ordem: 5 },
    { key: 'fechado_perdido', label: 'Fechado — Perdido', color: '#f87171', enabled: true, ordem: 6 },
  ],
  pipelineTitle: 'Pipeline de Vendas',
  currencyPrefix: 'R$',
  showProbability: true,
  showForecast: true,
  defaultOrigin: 'inbound',
};

const STORAGE_KEY = 'whatsflow_funnel_config';

export function useFunnelConfig() {
  const [config, setConfig] = useState<FunnelConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const saveConfig = (newConfig: FunnelConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  return { config, saveConfig, defaultConfig: DEFAULT_CONFIG };
}

export function SalesFunnelConfigCard() {
  const { config, saveConfig, defaultConfig } = useFunnelConfig();
  const [draft, setDraft] = useState<FunnelConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(JSON.stringify(draft) !== JSON.stringify(config));
  }, [draft, config]);

  const updateStage = (index: number, field: keyof FunnelStage, value: any) => {
    const stages = [...draft.stages];
    stages[index] = { ...stages[index], [field]: value };
    setDraft({ ...draft, stages });
  };

  const addStage = () => {
    const newKey = `custom_${Date.now()}`;
    const stages = [...draft.stages];
    // Insert before the last two (fechado_ganho, fechado_perdido)
    const insertAt = Math.max(0, stages.length - 2);
    stages.splice(insertAt, 0, {
      key: newKey,
      label: 'Nova Etapa',
      color: '#94a3b8',
      enabled: true,
      ordem: insertAt + 1,
    });
    // Re-order
    stages.forEach((s, i) => (s.ordem = i + 1));
    setDraft({ ...draft, stages });
  };

  const removeStage = (index: number) => {
    const stage = draft.stages[index];
    // Don't allow removing fechado_ganho or fechado_perdido
    if (stage.key === 'fechado_ganho' || stage.key === 'fechado_perdido') {
      toast.error('Não é possível remover etapas de fechamento.');
      return;
    }
    const stages = draft.stages.filter((_, i) => i !== index);
    stages.forEach((s, i) => (s.ordem = i + 1));
    setDraft({ ...draft, stages });
  };

  const handleSave = () => {
    saveConfig(draft);
    toast.success('Configurações do funil salvas!');
  };

  const handleReset = () => {
    if (confirm('Restaurar configurações padrão do funil de vendas?')) {
      setDraft(defaultConfig);
      saveConfig(defaultConfig);
      toast.success('Configurações do funil restauradas!');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitBranch className="h-5 w-5" />
          Funil de Vendas
        </CardTitle>
        <CardDescription>
          Personalize as etapas, títulos e comportamentos do pipeline comercial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* General Settings */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Título do Pipeline</Label>
            <Input
              value={draft.pipelineTitle}
              onChange={(e) => setDraft({ ...draft, pipelineTitle: e.target.value })}
              placeholder="Pipeline de Vendas"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prefixo de Moeda</Label>
            <Input
              value={draft.currencyPrefix}
              onChange={(e) => setDraft({ ...draft, currencyPrefix: e.target.value })}
              placeholder="R$"
              className="w-24"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Exibições</Label>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Mostrar probabilidade</p>
              <p className="text-xs text-muted-foreground">Exibir % de chance de fechamento nos cards</p>
            </div>
            <Switch
              checked={draft.showProbability}
              onCheckedChange={(v) => setDraft({ ...draft, showProbability: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Mostrar previsão (Forecast)</p>
              <p className="text-xs text-muted-foreground">Exibir valor ponderado por probabilidade</p>
            </div>
            <Switch
              checked={draft.showForecast}
              onCheckedChange={(v) => setDraft({ ...draft, showForecast: v })}
            />
          </div>
        </div>

        {/* Stages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Etapas do Funil</Label>
            <Button variant="outline" size="sm" onClick={addStage}>
              <Plus className="mr-1 h-3 w-3" /> Adicionar Etapa
            </Button>
          </div>
          <div className="space-y-2">
            {draft.stages.map((stage, i) => {
              const isClosing = stage.key === 'fechado_ganho' || stage.key === 'fechado_perdido';
              return (
                <div
                  key={stage.key}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-colors"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div
                    className="h-8 w-8 rounded-md shrink-0 border border-border cursor-pointer relative overflow-hidden"
                    style={{ backgroundColor: stage.color }}
                  >
                    <input
                      type="color"
                      value={stage.color}
                      onChange={(e) => updateStage(i, 'color', e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Escolher cor"
                    />
                  </div>
                  <Input
                    value={stage.label}
                    onChange={(e) => updateStage(i, 'label', e.target.value)}
                    className="flex-1 h-8 text-sm"
                    placeholder="Nome da etapa"
                  />
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {stage.ordem}
                  </Badge>
                  <Switch
                    checked={stage.enabled}
                    onCheckedChange={(v) => updateStage(i, 'enabled', v)}
                    disabled={isClosing}
                  />
                  {!isClosing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeStage(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isClosing && <div className="w-7" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            onClick={handleReset}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            <RotateCcw className="inline mr-1 h-3 w-3" />
            Restaurar padrões
          </button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
