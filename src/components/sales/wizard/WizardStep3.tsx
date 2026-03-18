import { useState, useEffect, useMemo } from 'react';
import { useICPProfile } from '@/hooks/useICPProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2, ClipboardList, Plus, Trash2, GripVertical } from 'lucide-react';

interface Question {
  id: string;
  position: number;
  question: string;
  type: 'boolean' | 'scale' | 'multiple_choice' | 'text';
  weight: number;
  scale_min?: number;
  scale_max?: number;
  options?: string[];
  is_disqualifier: boolean;
  positive_condition?: string;
  hint?: string;
}

interface Props { onNext: () => void; onBack: () => void; }

export default function WizardStep3({ onNext, onBack }: Props) {
  const { icpProfile, questionnaire, upsertQuestionnaire } = useICPProfile();
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Generate questions from ICP criteria
  useEffect(() => {
    if (questionnaire?.questions?.length) {
      setQuestions(questionnaire.questions);
    } else if (icpProfile?.criteria?.length) {
      const qs: Question[] = icpProfile.criteria.slice(0, 8).map((c: any, i: number) => ({
        id: c.id || crypto.randomUUID(),
        position: i + 1,
        question: c.label,
        type: c.type || 'boolean',
        weight: c.weight,
        scale_min: c.scale_min || 1,
        scale_max: c.scale_max || 10,
        options: c.options || [],
        is_disqualifier: c.disqualifier || false,
        positive_condition: 'yes',
        hint: '',
      }));
      setQuestions(qs);
    }
  }, [icpProfile, questionnaire]);

  const totalWeight = useMemo(() => questions.reduce((s, q) => s + q.weight, 0), [questions]);

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addQuestion = () => {
    if (questions.length >= 8) { toast.error('Máximo de 8 perguntas.'); return; }
    setQuestions([...questions, {
      id: crypto.randomUUID(),
      position: questions.length + 1,
      question: '',
      type: 'boolean',
      weight: 0,
      is_disqualifier: false,
      hint: '',
    }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (questions.some(q => !q.question.trim())) { toast.error('Preencha todas as perguntas.'); return; }
    setSaving(true);
    try {
      await upsertQuestionnaire({
        icp_id: icpProfile?.id || null,
        name: 'Questionário Principal',
        questions,
      } as any);
      toast.success('Questionário salvo!');
      onNext();
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Questionário de Qualificação</h2>
          <p className="text-sm text-muted-foreground">Até 8 perguntas aplicadas durante o atendimento. Gerado a partir do ICP.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={totalWeight === 100 ? 'default' : 'destructive'} className="text-xs">Pesos: {totalWeight}/100</Badge>
        <Badge variant="secondary" className="text-xs">{questions.length}/8 perguntas</Badge>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="p-4 rounded-lg border border-border/40 bg-muted/20 space-y-3">
            <div className="flex items-start gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-2 shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input value={q.question} onChange={e => updateQuestion(i, 'question', e.target.value)} placeholder="Texto da pergunta..." />
                  </div>
                  <Select value={q.type} onValueChange={v => updateQuestion(i, 'type', v)}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boolean">Sim/Não</SelectItem>
                      <SelectItem value="scale">Escala</SelectItem>
                      <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
                      <SelectItem value="text">Texto livre</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" value={q.weight} onChange={e => updateQuestion(i, 'weight', parseInt(e.target.value) || 0)} className="w-16 text-center" min={0} max={100} />
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeQuestion(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {q.type === 'multiple_choice' && (
                  <Input
                    value={(q.options || []).join(', ')}
                    onChange={e => updateQuestion(i, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Opções separadas por vírgula"
                    className="text-xs"
                  />
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={q.is_disqualifier} onCheckedChange={v => updateQuestion(i, 'is_disqualifier', v)} />
                    <Label className="text-xs text-muted-foreground">Eliminatório</Label>
                  </div>
                  <Input value={q.hint || ''} onChange={e => updateQuestion(i, 'hint', e.target.value)} placeholder="Dica para o consultor (opcional)" className="flex-1 text-xs h-7" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {questions.length < 8 && (
        <Button variant="outline" size="sm" onClick={addQuestion} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Adicionar pergunta
        </Button>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Salvar e continuar
        </Button>
      </div>
    </div>
  );
}
