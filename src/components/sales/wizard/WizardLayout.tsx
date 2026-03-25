import { useState } from 'react';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { useTenantId } from '@/hooks/useTenantId';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ArrowRight, ArrowLeft, Rocket, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onComplete: () => void;
}

const QUESTIONS = [
  {
    id: 1,
    emoji: '💼',
    title: 'Qual é o coração do seu negócio?',
    subtitle: 'Nos conte em poucas palavras o que a sua empresa faz.',
    placeholder: 'Ex: Clínica de Estética focada em harmonização facial, Imobiliária de alto padrão em SP...',
  },
  {
    id: 2,
    emoji: '🎯',
    title: 'Quais informações você PRECISA saber do cliente antes de fechar a venda?',
    subtitle: 'Pense nos dados que seu time comercial coleta durante o atendimento.',
    placeholder: 'Ex: Orçamento disponível, prazo de decisão, se já é cliente de concorrente, procedimento desejado...',
  },
  {
    id: 3,
    emoji: '🗺️',
    title: 'Como é o seu passo a passo desde o primeiro "Oi" até o dinheiro na conta?',
    subtitle: 'Descreva as etapas da sua venda como se explicasse para alguém novo.',
    placeholder: 'Ex: 1) Lead chega pelo Instagram, 2) Agendamos avaliação, 3) Fazemos proposta, 4) Negociação, 5) Fechamento e pagamento...',
  },
];

export default function WizardLayout({ onComplete }: Props) {
  const tenantId = useTenantId();
  const { upsertProfile } = useCompanyProfile(tenantId);

  const [step, setStep] = useState(0); // 0-2 = questions, 3 = loading, 4 = success
  const [answers, setAnswers] = useState(['', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ pipeline_name: string; stages: any[]; card_schema: any[] } | null>(null);

  const currentAnswer = answers[step] || '';
  const canAdvance = currentAnswer.trim().length >= 10;
  const isLastQuestion = step === 2;

  function updateAnswer(value: string) {
    setAnswers(prev => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
  }

  async function handleGenerate() {
    setStep(3); // loading state
    setIsGenerating(true);

    try {
      const combined = QUESTIONS.map((q, i) =>
        `**${q.title}**\n${answers[i]}`
      ).join('\n\n');

      const { data, error } = await supabase.functions.invoke('generate-crm-schema', {
        body: { answers: combined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (!data?.pipeline_name || !data?.stages || !data?.card_schema) {
        throw new Error('Resposta incompleta da IA');
      }

      setResult(data);

      // Save pipeline to database
      if (tenantId) {
        const stagesForDb = data.stages.map((s: any, i: number) => ({
          name: s.name,
          color: s.color || ['#60a5fa', '#a78bfa', '#f59e0b', '#fb923c', '#4ade80', '#ef4444'][i % 6],
          order: s.order ?? i + 1,
        }));

        const { error: pipelineError } = await supabase
          .from('sales_pipelines')
          .insert({
            tenant_id: tenantId,
            name: data.pipeline_name,
            description: `Gerado por IA — ${new Date().toLocaleDateString('pt-BR')}`,
            stages: stagesForDb,
            card_schema: data.card_schema,
            is_default: true,
          });

        if (pipelineError) {
          console.error('Pipeline insert error:', pipelineError);
          // Try update if insert failed (maybe default already exists)
          await supabase
            .from('sales_pipelines')
            .update({
              name: data.pipeline_name,
              stages: stagesForDb,
              card_schema: data.card_schema,
            })
            .eq('tenant_id', tenantId)
            .eq('is_default', true);
        }
      }

      setStep(4); // success
    } catch (err) {
      console.error('generate-crm-schema error:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar CRM');
      setStep(2); // go back to last question
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleFinish() {
    await upsertProfile({ wizard_completed: true, wizard_step: 6 } as any);
    toast.success('CRM personalizado ativado!');
    onComplete();
  }

  // ── Loading State ──
  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center gap-6 min-h-[400px]">
            <div className="relative">
              <Sparkles className="h-12 w-12 text-primary animate-pulse" />
              <Loader2 className="h-6 w-6 text-primary/50 animate-spin absolute -bottom-1 -right-1" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">A Inteligência Artificial está desenhando o seu CRM sob medida...</h2>
              <p className="text-sm text-muted-foreground">
                Analisando seu nicho, mapeando as etapas e criando campos personalizados.
                <br />Isso leva de 10 a 30 segundos.
              </p>
            </div>
            <div className="flex gap-1 mt-4">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success State ──
  if (step === 4 && result) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <h2 className="text-xl font-semibold">Seu CRM está pronto!</h2>
                <p className="text-sm text-muted-foreground">Pipeline "{result.pipeline_name}" criado com sucesso</p>
              </div>
            </div>

            {/* Stages preview */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Etapas do Funil</p>
              <div className="flex flex-wrap gap-2">
                {result.stages.map((s: any, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: `${s.color || '#60a5fa'}15`,
                      borderColor: `${s.color || '#60a5fa'}40`,
                      color: s.color || '#60a5fa',
                    }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Card schema preview */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campos do Card</p>
              <div className="grid grid-cols-2 gap-2">
                {result.card_schema.map((f: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50">
                    <span className="text-muted-foreground text-xs">
                      {f.type === 'text' ? '📝' : f.type === 'number' ? '#️⃣' : f.type === 'currency' ? '💰' : f.type === 'date' ? '📅' : f.type === 'select' ? '📋' : '📎'}
                    </span>
                    <span>{f.label}</span>
                    {f.required && <span className="text-[9px] text-red-400">*</span>}
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleFinish} className="w-full" size="lg">
              <Rocket className="h-4 w-4 mr-2" />
              Ativar e começar a vender
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Question Steps (0, 1, 2) ──
  const q = QUESTIONS[step];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-primary' : i < step ? 'w-2 bg-emerald-500' : 'w-2 bg-muted'
            }`}
          />
        ))}
      </div>

      <Card>
        <CardContent className="p-8 space-y-6">
          {/* Question header */}
          <div className="text-center space-y-2">
            <span className="text-4xl">{q.emoji}</span>
            <h2 className="text-xl font-semibold leading-tight">{q.title}</h2>
            <p className="text-sm text-muted-foreground">{q.subtitle}</p>
          </div>

          {/* Answer textarea */}
          <Textarea
            value={currentAnswer}
            onChange={e => updateAnswer(e.target.value)}
            placeholder={q.placeholder}
            className="min-h-[120px] text-sm resize-none"
            autoFocus
          />

          <p className="text-[10px] text-muted-foreground text-right">
            {currentAnswer.length < 10
              ? `Mínimo 10 caracteres (${currentAnswer.length}/10)`
              : `${currentAnswer.length} caracteres`}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>

            {isLastQuestion ? (
              <Button
                onClick={handleGenerate}
                disabled={!canAdvance || isGenerating}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Gerar meu CRM com IA
              </Button>
            ) : (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance}
              >
                Próxima <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
