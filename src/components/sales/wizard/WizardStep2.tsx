import { useState, useEffect, useMemo } from 'react';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { useICPProfile } from '@/hooks/useICPProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Pencil, HelpCircle, ToggleLeft, SlidersHorizontal, List, Type } from 'lucide-react';
import { getTemplateForSegment, type ICPCriterionTemplate } from '@/utils/sales/icpTemplates';

interface Props { onNext: () => void; onBack: () => void; }

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  boolean: { icon: <ToggleLeft className="h-3 w-3" />, label: 'Sim / Não', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  scale: { icon: <SlidersHorizontal className="h-3 w-3" />, label: 'Escala', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  multiple_choice: { icon: <List className="h-3 w-3" />, label: 'Seleção', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  text: { icon: <Type className="h-3 w-3" />, label: 'Texto', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
};

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
            <p>Cada critério possui um <strong>peso</strong> que define sua importância na qualificação do lead. A soma dos pesos deve ser <strong>exatamente 100</strong>. Quando um vendedor preencher o questionário, o sistema calcula automaticamente o score e classifica o lead como <span className="text-emerald-500 font-medium">Quente 🔥</span>, <span className="text-amber-500 font-medium">Morno 🌡️</span> ou <span className="text-blue-400 font-medium">Frio ❄️</span>.</p>
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
        <div className="space-y-3">
          {criteria.map((c, i) => {
            const meta = TYPE_META[c.type] || TYPE_META.text;
            return (
              <div key={c.id} className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-2">
                {/* Row 1: Label + Weight */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {editing ? (
                      <Input value={c.label} onChange={e => updateCriterion(i, 'label', e.target.value)} className="text-sm h-8" />
                    ) : (
                      <span className="text-sm font-medium text-foreground">{c.label}</span>
                    )}
                  </div>
                  <div className="shrink-0 w-20">
                    {editing ? (
                      <Input
                        type="number"
                        value={c.weight}
                        onChange={e => updateCriterion(i, 'weight', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        className="text-sm h-8 text-center"
                        min={0}
                        max={100}
                      />
                    ) : (
                      <Badge variant="outline" className="text-xs w-full justify-center">{c.weight}%</Badge>
                    )}
                  </div>
                </div>

                {/* Row 2: Type badge + hint */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${meta.color}`}>
                    {meta.icon} {meta.label}
                    {c.type === 'scale' && ` (${c.scale_min ?? 1}–${c.scale_max ?? 10})`}
                    {c.type === 'multiple_choice' && ` (${c.options?.length || 0} opções)`}
                  </span>
                  {c.disqualifier && <Badge variant="destructive" className="text-[10px]">Eliminatório</Badge>}
                  {c.hint && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        {c.hint}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Row 3: Hint text always visible */}
                {c.hint && (
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed pl-0.5">
                    💡 {c.hint}
                  </p>
                )}

                {/* Row 4: Options preview for multiple_choice */}
                {c.type === 'multiple_choice' && c.options?.length && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.options.map((opt, oi) => (
                      <span key={oi} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 border border-border/30 text-muted-foreground">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
