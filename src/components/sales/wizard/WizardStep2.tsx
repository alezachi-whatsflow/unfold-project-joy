import { useState, useEffect, useMemo } from 'react';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { useICPProfile } from '@/hooks/useICPProfile';
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
  const { profile } = useCompanyProfile();
  const { icpProfile, upsertICP } = useICPProfile();
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
    switch (c.type) {
      case 'boolean':
        return (
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Formato de resposta: Sim ou Não</span>
            <div className="flex gap-2">
              <span className="text-xs px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-medium">✓ Sim</span>
              <span className="text-xs px-4 py-1.5 rounded-full bg-muted/40 border border-border/30 text-muted-foreground">✗ Não</span>
            </div>
          </div>
        );
      case 'multiple_choice':
        return (
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Formato de resposta: Selecionar faixa ({c.options?.length || 0} opções)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {c.options?.map((opt, oi) => (
                <span key={oi} className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-medium">
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
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Formato de resposta: Escala de {min} a {max}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs shrink-0">{min}</Badge>
              <div className="flex-1 flex gap-0.5">
                {Array.from({ length: max - min + 1 }, (_, idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-2 rounded-sm"
                    style={{
                      backgroundColor: `hsl(${120 * (idx / (max - min))}, 60%, ${35 + idx * 3}%)`,
                      opacity: 0.6,
                    }}
                  />
                ))}
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{max}</Badge>
            </div>
          </div>
        );
      }
      case 'text':
        return (
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Formato de resposta: Texto livre</span>
            <div className="h-6 rounded border border-dashed border-border/40 bg-muted/20" />
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
        <div className="grid grid-cols-2 gap-4">
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
              {/* Top bar: Label + Weight */}
              <div className="flex items-center gap-3 p-4 pb-3">
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <Input value={c.label} onChange={e => updateCriterion(i, 'label', e.target.value)} className="text-sm h-8" />
                  ) : (
                    <span className="text-sm font-semibold text-foreground">{c.label}</span>
                  )}
                </div>

                {/* Weight - clearly separated */}
                <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg bg-accent/30 border border-accent/20">
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">Peso</span>
                  {editing ? (
                    <Input
                      type="number"
                      value={c.weight}
                      onChange={e => updateCriterion(i, 'weight', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="text-sm h-7 text-center w-14 font-bold"
                      min={0}
                      max={100}
                    />
                  ) : (
                    <span className="text-sm font-bold text-foreground">{c.weight}%</span>
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

              {/* Type preview - very visible */}
              <div className="px-4 pb-4 pt-1">
                {renderTypePreview(c)}
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
