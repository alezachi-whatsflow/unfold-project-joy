import { useState, useEffect } from 'react';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { usePipelines } from '@/hooks/usePipelines';
import { useTenantId } from '@/hooks/useTenantId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2, GitBranch, Check, Wand2 } from 'lucide-react';
import { getTemplateForSegment } from '@/utils/sales/icpTemplates';

interface Props { onNext: () => void; onBack: () => void; }

export default function WizardStep4({ onNext, onBack }: Props) {
  const tenantId = useTenantId();
  const { profile } = useCompanyProfile(tenantId);
  const { pipelines, createPipeline } = usePipelines(tenantId);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'suggested' | 'existing' | null>(null);

  const template = profile?.segment ? getTemplateForSegment(profile.segment) : null;
  const hasExistingPipeline = pipelines.length > 0;

  const handleUseSuggested = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const stages = template.funnel_stages.map((s, i) => ({
        key: s.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_'),
        label: s.name,
        color: s.color,
        enabled: true,
        ordem: i + 1,
      }));
      await createPipeline({
        name: `Pipeline ${profile?.segment || 'Principal'}`,
        stages: stages as any,
        is_default: !hasExistingPipeline,
      });
      toast.success('Funil criado!');
      onNext();
    } catch {
      toast.error('Erro ao criar funil.');
    } finally {
      setSaving(false);
    }
  };

  const handleUseExisting = () => {
    toast.success('Pipeline existente mantido!');
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <GitBranch className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Funil de Vendas</h2>
          <p className="text-sm text-muted-foreground">Configure as etapas do seu pipeline de vendas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Suggested */}
        {template && (
          <button
            onClick={() => setMode('suggested')}
            className={`p-4 rounded-xl border text-left transition-all ${
              mode === 'suggested' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border/40 hover:border-primary/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Funil sugerido por segmento</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {template.funnel_stages.map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs text-muted-foreground">{s.name}</span>
                  {i < template.funnel_stages.length - 1 && <span className="text-xs text-muted-foreground/40">→</span>}
                </div>
              ))}
            </div>
          </button>
        )}

        {/* Use existing */}
        {hasExistingPipeline && (
          <button
            onClick={() => setMode('existing')}
            className={`p-4 rounded-xl border text-left transition-all ${
              mode === 'existing' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border/40 hover:border-primary/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-foreground">Usar pipeline existente</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {pipelines.map(p => (
                <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>
              ))}
            </div>
          </button>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <Button
          onClick={mode === 'existing' ? handleUseExisting : handleUseSuggested}
          disabled={!mode || saving}
          className="gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Continuar
        </Button>
      </div>
    </div>
  );
}
