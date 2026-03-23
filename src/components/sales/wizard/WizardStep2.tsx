import { useState, useEffect, useMemo } from 'react';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { useICPProfile } from '@/hooks/useICPProfile';
import { useTenantId } from '@/hooks/useTenantId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Pencil, HelpCircle, ToggleLeft, SlidersHorizontal, List, Type, Weight } from 'lucide-react';
import { getTemplateForSegment, type ICPCriterionTemplate } from '@/utils/sales/icpTemplates';

interface Props { onNext: () => void; onBack: () => void; }

export default function WizardStep2({ onNext, onBack }: Props) {
  const tenantId = useTenantId();
  const { profile } = useCompanyProfile(tenantId);
  const { icpProfile, upsertICP } = useICPProfile(tenantId);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [criteria, setCriteria] = useState<ICPCriterionTemplate[]>([]);
  const [hotThreshold, setHotThreshold] = useState(70);
  const [warmThreshold, setWarmThreshold] = useState(40);

  useEffect(() => {
    if (icpProfile?.criteria?.length) {
      setCriteria(icpProfile.criteria);
      setHotThreshold(icpProfile.hot_score_threshold);
      setWarmThreshold(icpProfile.warm_score_threshold);
    } else if (profile?.segment) {
      const template = getTemplateForSegment(profile.segment);
      setCriteria(template.criteria);
      setHotThreshold(template.hot_threshold);
      setWarmThreshold(template.warm_threshold);
    }
  }, [icpProfile, profile?.segment]);

  const totalWeight = useMemo(() => criteria.reduce((s, c) => s + c.weight, 0), [criteria]);
  const isWeightValid = totalWeight === 100;

  const updateCriterion = (index: number, field: string, value: any) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const handleSave = async () => {
    if (!isWeightValid) { toast.error('Os pesos devem somar exatamente 100.'); return; }
    setSaving(true);
    try {
      await upsertICP({
        name: `ICP — ${profile?.segment || 'Principal'}`,
        description: `ICP gerado para ${profile?.company_name || 'empresa'}`,
        criteria,
        hot_score_threshold: hotThreshold,
        warm_score_threshold: warmThreshold,
        is_auto_generated: !editing,
      } as any);
      toast.success('ICP salvo!');
      onNext();
    } catch {
      toast.error('Erro ao salvar ICP.');
    } finally {
      setSaving(false);
    }
  };

  const renderTypePreview = (c: ICPCriterionTemplate) => {
    const iconClass = "h-3.5 w-3.5 shrink-0 text-muted-foreground";
    switch (c.type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <ToggleLeft className={iconClass} />
            <span className="text-[11px] text-muted-foreground">Resposta:</span>
            <span className="text-[11px] font-medium text-primary">Sim</span>
            <span className="text-[11px] text-muted-foreground">/</span>
            <span className="text-[11px] font-medium text-muted-foreground">Não</span>
          </div>
        );
      case 'multiple_choice':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <List className={iconClass} />
              <span className="text-[11px] text-muted-foreground">Resposta: escolher entre {c.options?.length || 0} opções</span>
            </div>
            <div className="flex flex-wrap gap-1 pl-5">
              {c.options?.map((opt, oi) => (
                <span key={oi} className="text-[10px] px-2 py-0.5 rounded bg-accent/50 text-accent-foreground border border-border/30">
                  {opt}
                </span>
              ))}
            </div>
          </div>
        );
      case 'scale': {
        const min = c.scale_min ?? 1;
        const max = c.scale_max ?? 10;
        return (
          <div className="flex items-center gap-2">
            <SlidersHorizontal className={iconClass} />
            <span className="text-[11px] text-muted-foreground">Resposta: nota de</span>
            <span className="text-[11px] font-bold text-foreground">{min}</span>
            <span className="text-[11px] text-muted-foreground">a</span>
            <span className="text-[11px] font-bold text-foreground">{max}</span>
          </div>
        );
      }
      case 'text':
        return (
          <div className="flex items-center gap-2">
            <Type className={iconClass} />
            <span className="text-[11px] text-muted-foreground">Resposta: texto livre</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Cliente Ideal (ICP)</h2>
            <p className="text-sm text-muted-foreground">
              {editing ? 'Ajuste os critérios e pesos do ICP.' : 'ICP gerado com base no perfil da empresa.'}
            </p>
          </div>
        </div>

        {/* Help box */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Como funciona o ICP?</p>
            <p>Cada critério possui um <strong>peso (importância)</strong> que define quanto ele influencia no score final do lead. A soma dos pesos deve ser <strong>exatamente 100</strong>. O <strong>formato de resposta</strong> (Sim/Não, Escala, Faixas) define como o vendedor preencherá ao qualificar um lead.</p>
          </div>
        </div>

        {/* Weight indicator */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Soma dos pesos:</span>
          <Badge variant={isWeightValid ? 'default' : 'destructive'} className="text-xs">
            {totalWeight}/100
          </Badge>
          {!editing && (
            <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" /> Ajustar critérios
            </Button>
          )}
        </div>

        {/* Thresholds */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Score mínimo — Lead Quente</Label>
            <div className="flex items-center gap-3">
              <Slider value={[hotThreshold]} onValueChange={v => setHotThreshold(v[0])} min={0} max={100} step={1} disabled={!editing} />
              <Badge variant="outline" className="shrink-0 text-emerald-500 border-emerald-500/30">{hotThreshold}</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Score mínimo — Lead Morno</Label>
            <div className="flex items-center gap-3">
              <Slider value={[warmThreshold]} onValueChange={v => setWarmThreshold(v[0])} min={0} max={100} step={1} disabled={!editing} />
              <Badge variant="outline" className="shrink-0 text-amber-500 border-amber-500/30">{warmThreshold}</Badge>
            </div>
          </div>
        </div>

        {/* Criteria list */}
        <div className="space-y-4">
          {criteria.map((c, i) => (
            <div key={c.id} className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
              {/* Top bar: Label */}
              <div className="flex items-center gap-3 p-4 pb-2">
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <Input value={c.label} onChange={e => updateCriterion(i, 'label', e.target.value)} className="text-sm h-8" />
                  ) : (
                    <span className="text-sm font-semibold text-foreground">{c.label}</span>
                  )}
                </div>
              </div>

              {/* Hint */}
              {c.hint && (
                <div className="px-4 pb-2">
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                    💡 {c.hint}
                  </p>
                </div>
              )}

              {c.disqualifier && (
                <div className="px-4 pb-2">
                  <Badge variant="destructive" className="text-[10px]">⚠ Eliminatório — se não atende, desqualifica o lead</Badge>
                </div>
              )}

              {/* Type preview */}
              <div className="px-4 pb-3 pt-1">
                {renderTypePreview(c)}
              </div>

              {/* Weight slider - always at the bottom */}
              <div className="px-4 pb-4 pt-1 border-t border-border/20">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest shrink-0">Peso</span>
                  <Slider
                    value={[c.weight]}
                    onValueChange={v => updateCriterion(i, 'weight', v[0])}
                    min={0}
                    max={30}
                    step={1}
                    disabled={!editing}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="shrink-0 text-xs font-bold min-w-[40px] justify-center">
                    {c.weight}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={handleSave} disabled={saving || !isWeightValid} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Salvar e continuar
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
