import { useState, useEffect, useMemo } from 'react';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { useICPProfile } from '@/hooks/useICPProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Pencil, Check } from 'lucide-react';
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

  // Generate ICP from template on mount if no existing ICP
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
    <div className="space-y-6">
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
        {criteria.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/20">
            <div className="flex-1 min-w-0">
              {editing ? (
                <Input value={c.label} onChange={e => updateCriterion(i, 'label', e.target.value)} className="text-sm h-8" />
              ) : (
                <span className="text-sm text-foreground">{c.label}</span>
              )}
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px]">{c.type}</Badge>
                {c.disqualifier && <Badge variant="destructive" className="text-[10px]">Eliminatório</Badge>}
              </div>
            </div>
            <div className="shrink-0 w-20">
              {editing ? (
                <Input type="number" value={c.weight} onChange={e => updateCriterion(i, 'weight', parseInt(e.target.value) || 0)} className="text-sm h-8 text-center" min={0} max={100} />
              ) : (
                <Badge variant="outline" className="text-xs">{c.weight}%</Badge>
              )}
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
  );
}
