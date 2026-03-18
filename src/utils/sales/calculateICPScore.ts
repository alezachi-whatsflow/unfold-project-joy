export interface RadarDataPoint {
  criteria: string;
  value: number;
  fullMark: number;
}

export interface ScoreBreakdown {
  question: string;
  answer: any;
  points_earned: number;
  max_points: number;
  pct: number;
}

export interface QualifierResult {
  score: number;
  label: 'quente' | 'morno' | 'frio';
  radar: RadarDataPoint[];
  recommended_action: string;
  breakdown: ScoreBreakdown[];
}

interface Question {
  id: string;
  question: string;
  type: 'boolean' | 'scale' | 'multiple_choice' | 'text';
  weight: number;
  scale_min?: number;
  scale_max?: number;
  options?: string[];
  positive_condition?: string;
  is_disqualifier?: boolean;
}

function evaluateAnswer(answer: any, question: Question): number {
  if (answer === undefined || answer === null || answer === '') return 0;

  switch (question.type) {
    case 'boolean': {
      const positive = ['true', 'sim', 'yes', '1'].includes(String(answer).toLowerCase());
      return positive ? question.weight : 0;
    }
    case 'scale': {
      const min = question.scale_min ?? 1;
      const max = question.scale_max ?? 10;
      const val = Number(answer);
      if (isNaN(val)) return 0;
      const pct = Math.min(1, Math.max(0, (val - min) / (max - min)));
      return Math.round(pct * question.weight);
    }
    case 'multiple_choice': {
      if (!question.options?.length) return 0;
      const idx = question.options.indexOf(String(answer));
      if (idx === -1) return 0;
      // Higher index = better (assumes options ordered worst→best)
      const pct = (idx + 1) / question.options.length;
      return Math.round(pct * question.weight);
    }
    case 'text': {
      // If they answered anything, give full points
      return String(answer).trim().length > 0 ? question.weight : 0;
    }
    default:
      return 0;
  }
}

export function calculateICPScore(
  answers: Record<string, any>,
  questions: Question[],
  hotThreshold: number = 70,
  warmThreshold: number = 40,
): QualifierResult {
  let totalScore = 0;
  const breakdown: ScoreBreakdown[] = [];
  const radar: RadarDataPoint[] = [];

  for (const question of questions) {
    const answer = answers[question.id];
    const pointsEarned = evaluateAnswer(answer, question);
    totalScore += pointsEarned;

    breakdown.push({
      question: question.question,
      answer,
      points_earned: pointsEarned,
      max_points: question.weight,
      pct: question.weight > 0 ? Math.round((pointsEarned / question.weight) * 100) : 0,
    });

    radar.push({
      criteria: question.question.length > 20 ? question.question.slice(0, 18) + '…' : question.question,
      value: question.weight > 0 ? Math.round((pointsEarned / question.weight) * 100) : 0,
      fullMark: 100,
    });
  }

  const finalScore = Math.min(100, Math.round(totalScore));
  const label: 'quente' | 'morno' | 'frio' =
    finalScore >= hotThreshold ? 'quente' :
    finalScore >= warmThreshold ? 'morno' : 'frio';

  const recommended_action = generateRecommendedAction(finalScore, label, breakdown);

  return { score: finalScore, label, radar, recommended_action, breakdown };
}

function generateRecommendedAction(score: number, label: string, breakdown: ScoreBreakdown[]): string {
  const weakPoints = breakdown
    .filter(b => b.pct < 50)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 2);

  if (label === 'quente') {
    return `Lead qualificado para proposta. Score ${score}/100. Prioridade ALTA — agendar demo em até 24h.`;
  } else if (label === 'morno') {
    const gap = weakPoints[0]?.question || 'critérios de fit';
    return `Lead em desenvolvimento. Trabalhar objeção em: ${gap}. Retornar em 3-5 dias com conteúdo relevante.`;
  } else {
    return `Lead fora do ICP ideal no momento. Score ${score}/100. Manter em nutrição de longo prazo. Revisar qualificação em 30 dias.`;
  }
}
