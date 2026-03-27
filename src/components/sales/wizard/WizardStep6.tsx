import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { useICPProfile } from '@/hooks/useICPProfile';
import { usePipelines } from '@/hooks/usePipelines';
import { useTenantId } from '@/hooks/useTenantId';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Rocket } from 'lucide-react';
import { SEGMENTS } from '@/utils/sales/icpTemplates';

interface Props { onFinish: () => void; onBack: () => void; }

export default function WizardStep6({ onFinish, onBack }: Props) {
  const tenantId = useTenantId();
  const { profile } = useCompanyProfile(tenantId);
  const { icpProfile, questionnaire } = useICPProfile(tenantId);
  const { pipelines } = usePipelines(tenantId);

  const segmentLabel = SEGMENTS.find(s => s.value === profile?.segment)?.label || profile?.segment || '—';

  const items = [
    { label: 'Perfil', value: `${segmentLabel}${profile?.sub_segment ? ` / ${profile.sub_segment}` : ''}`, done: !!profile?.segment },
    { label: 'ICP', value: `${icpProfile?.criteria?.length || 0} critérios, score mínimo ${icpProfile?.hot_score_threshold || 70}`, done: !!icpProfile },
    { label: 'Questionário', value: `${questionnaire?.questions?.length || 0} perguntas ativas`, done: !!questionnaire?.questions?.length },
    { label: 'Funil', value: `${pipelines.length} pipeline(s) configurado(s)`, done: pipelines.length > 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-emerald-500/10 flex items-center justify-center">
          <Rocket className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Tudo pronto!</h2>
          <p className="text-sm text-muted-foreground">Confira o resumo da configuração.</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-3 border border-border/40">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center ${item.done ? 'bg-emerald-500' : 'bg-muted'}`}>
              {item.done ? <Check className="h-3.5 w-3.5 text-white" /> : <span className="text-xs text-muted-foreground">—</span>}
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-foreground">{item.label}</span>
              <p className="text-xs text-muted-foreground">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <Button onClick={onFinish} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Rocket className="h-4 w-4" /> Ir para o Funil de Vendas
        </Button>
      </div>
    </div>
  );
}
