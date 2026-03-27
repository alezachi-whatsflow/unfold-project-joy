import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Calculator, Flame, Snowflake, Thermometer, Loader2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { calculateICPScore, type QualifierResult } from '@/utils/sales/calculateICPScore';

interface Question {
  id: string;
  question: string;
  type: 'boolean' | 'scale' | 'multiple_choice' | 'text';
  weight: number;
  scale_min?: number;
  scale_max?: number;
  options?: string[];
  is_disqualifier?: boolean;
  hint?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  questions: Question[];
  hotThreshold?: number;
  warmThreshold?: number;
  existingAnswers?: Record<string, any>;
  onComplete: (result: QualifierResult, answers: Record<string, any>) => void;
}

export default function QualifierModal({
  open, onOpenChange, leadName, questions, hotThreshold = 70, warmThreshold = 40,
  existingAnswers = {}, onComplete,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>(existingAnswers);
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<QualifierResult | null>(null);
  const [saving, setSaving] = useState(false);

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleCalculate = () => {
    const res = calculateICPScore(answers, questions, hotThreshold, warmThreshold);
    setResult(res);
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await onComplete(result, answers);
      toast.success('Qualificação salva!');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const q = questions[currentQ];
  const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0;

  const labelIcon = (label: string) => {
    if (label === 'quente') return <Flame className="h-4 w-4" />;
    if (label === 'morno') return <Thermometer className="h-4 w-4" />;
    return <Snowflake className="h-4 w-4" />;
  };

  const labelColor = (label: string) => {
    if (label === 'quente') return 'text-emerald-500';
    if (label === 'morno') return 'text-amber-500';
    return 'text-blue-400';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Qualificar Lead — {leadName}
            <Badge variant="secondary" className="text-xs">{currentQ + 1}/{questions.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>

        {!result ? (
          <>
            {/* Question */}
            {q && (
              <div className="py-4 space-y-4">
                <h3 className="text-base font-semibold text-foreground">{q.question}</h3>
                {q.hint && <p className="text-xs text-muted-foreground italic">💡 {q.hint}</p>}

                {q.type === 'boolean' && (
                  <div className="flex gap-3">
                    <Button
                      variant={answers[q.id] === true ? 'default' : 'outline'}
                      className="flex-1 h-14 text-base"
                      onClick={() => updateAnswer(q.id, true)}
                    >
                      ✅ Sim
                    </Button>
                    <Button
                      variant={answers[q.id] === false ? 'default' : 'outline'}
                      className="flex-1 h-14 text-base"
                      onClick={() => updateAnswer(q.id, false)}
                    >
                      ❌ Não
                    </Button>
                  </div>
                )}

                {q.type === 'scale' && (
                  <div className="space-y-3">
                    <Slider
                      value={[answers[q.id] ?? q.scale_min ?? 1]}
                      onValueChange={v => updateAnswer(q.id, v[0])}
                      min={q.scale_min ?? 1}
                      max={q.scale_max ?? 10}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{q.scale_min ?? 1}</span>
                      <span className="text-lg font-bold text-foreground">{answers[q.id] ?? q.scale_min ?? 1}</span>
                      <span>{q.scale_max ?? 10}</span>
                    </div>
                  </div>
                )}

                {q.type === 'multiple_choice' && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map(opt => (
                      <Button
                        key={opt}
                        variant={answers[q.id] === opt ? 'default' : 'outline'}
                        className="h-12 text-sm"
                        onClick={() => updateAnswer(q.id, opt)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                )}

                {q.type === 'text' && (
                  <Textarea
                    value={answers[q.id] || ''}
                    onChange={e => updateAnswer(q.id, e.target.value)}
                    placeholder="Digite sua resposta..."
                    rows={3}
                  />
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Anterior
              </Button>
              {currentQ < questions.length - 1 ? (
                <Button onClick={() => setCurrentQ(currentQ + 1)} className="gap-2">
                  Próxima <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleCalculate} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Calculator className="h-4 w-4" /> Calcular Score
                </Button>
              )}
            </div>
          </>
        ) : (
          /* Results */
          <div className="space-y-6 py-4">
            {/* Score */}
            <div className="text-center">
              <div className={`text-6xl font-black ${labelColor(result.label)}`}>{result.score}</div>
              <div className={`flex items-center justify-center gap-2 mt-2 text-lg font-bold ${labelColor(result.label)}`}>
                {labelIcon(result.label)}
                <span className="capitalize">{result.label}</span>
              </div>
            </div>

            {/* Radar */}
            {result.radar.length > 0 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={result.radar} outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="criteria" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            <Separator />

            {/* Recommended action */}
            <div className="p-3 border border-primary/20 bg-primary/5">
              <p className="text-sm font-medium text-foreground">💡 Ação recomendada</p>
              <p className="text-sm text-muted-foreground mt-1">{result.recommended_action}</p>
            </div>

            {/* Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Detalhamento</h4>
              {result.breakdown.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="flex-1 truncate text-foreground">{b.question}</div>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${b.pct}%` }} />
                  </div>
                  <span className="w-12 text-right text-muted-foreground">{b.points_earned}/{b.max_points}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResult(null)}>Refazer</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar qualificação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
