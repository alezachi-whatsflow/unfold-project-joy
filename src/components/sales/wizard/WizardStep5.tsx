import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Users } from 'lucide-react';

interface Props { onNext: () => void; onBack: () => void; }

export default function WizardStep5({ onNext, onBack }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-violet-500/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-violet-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Equipe e Metas</h2>
          <p className="text-sm text-muted-foreground">Configure metas de vendas e vincule consultores. Esta etapa é opcional.</p>
        </div>
      </div>

      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">As metas de performance serão configuradas no painel de Vendas.</p>
        <p className="text-xs mt-1 text-muted-foreground/60">Você pode pular esta etapa por enquanto.</p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <Button onClick={onNext} className="gap-2">
          <ArrowRight className="h-4 w-4" /> Pular por agora
        </Button>
      </div>
    </div>
  );
}
