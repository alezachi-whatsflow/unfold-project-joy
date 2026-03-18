import { useState, useEffect } from 'react';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { useICPProfile } from '@/hooks/useICPProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import WizardStep1 from './WizardStep1';
import WizardStep2 from './WizardStep2';
import WizardStep3 from './WizardStep3';
import WizardStep4 from './WizardStep4';
import WizardStep5 from './WizardStep5';
import WizardStep6 from './WizardStep6';

const WIZARD_STEPS = [
  { id: 1, label: 'Seu negócio', sublabel: 'Perfil da empresa' },
  { id: 2, label: 'Cliente ideal', sublabel: 'ICP gerado pela IA' },
  { id: 3, label: 'Questionário', sublabel: 'Perguntas de qualificação' },
  { id: 4, label: 'Funil', sublabel: 'Etapas e cards' },
  { id: 5, label: 'Equipe', sublabel: 'Metas e consultores' },
  { id: 6, label: 'Pronto!', sublabel: 'Módulo ativo' },
];

interface Props {
  onComplete: () => void;
}

export default function WizardLayout({ onComplete }: Props) {
  const { profile, isLoading, upsertProfile } = useCompanyProfile();
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (profile?.wizard_step && profile.wizard_step > 1) {
      setCurrentStep(profile.wizard_step);
    }
  }, [profile?.wizard_step]);

  const goToStep = async (step: number) => {
    setCurrentStep(step);
    await upsertProfile({ wizard_step: step } as any).catch(() => {});
  };

  const handleNext = async () => {
    if (currentStep < 6) {
      await goToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFinish = async () => {
    await upsertProfile({ wizard_completed: true, wizard_step: 6 } as any);
    toast.success('Módulo de Inteligência Comercial ativado!');
    onComplete();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {WIZARD_STEPS.map((step, i) => {
          const isDone = currentStep > step.id;
          const isActive = currentStep === step.id;
          return (
            <div key={step.id} className="flex-1 flex flex-col items-center">
              <button
                onClick={() => isDone && goToStep(step.id)}
                disabled={!isDone}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600'
                    : isActive
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : step.id}
              </button>
              <span className={`text-[10px] mt-1 text-center ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
              <span className="text-[9px] text-muted-foreground/60 text-center">{step.sublabel}</span>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 1 && <WizardStep1 onNext={handleNext} />}
          {currentStep === 2 && <WizardStep2 onNext={handleNext} onBack={handleBack} />}
          {currentStep === 3 && <WizardStep3 onNext={handleNext} onBack={handleBack} />}
          {currentStep === 4 && <WizardStep4 onNext={handleNext} onBack={handleBack} />}
          {currentStep === 5 && <WizardStep5 onNext={handleNext} onBack={handleBack} />}
          {currentStep === 6 && <WizardStep6 onFinish={handleFinish} onBack={handleBack} />}
        </CardContent>
      </Card>
    </div>
  );
}
