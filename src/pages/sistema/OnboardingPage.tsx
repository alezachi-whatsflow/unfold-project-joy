import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Rocket, CheckCircle2, Circle, ArrowRight, Clock, PartyPopper, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useTour } from "@/contexts/TourContext";
import { TOUR_CONFIGS } from "@/config/tourSteps";

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  action: string;
  route: string;
  estimatedMinutes: number;
  icon: string;
  hasTour: boolean;
}

const STEPS: OnboardingStep[] = [
  { key: "conta_criada", title: "Conta criada", description: "Sua conta foi criada com sucesso no Whatsflow Finance", action: "Concluído automaticamente", route: "/", estimatedMinutes: 0, icon: "✅", hasTour: false },
  { key: "perfil_empresa", title: "Configurar perfil da empresa", description: "Preencha os dados da sua empresa para personalizar a plataforma", action: "Iniciar tour guiado", route: "/settings", estimatedMinutes: 2, icon: "🏢", hasTour: true },
  { key: "conectar_whatsapp", title: "Conectar número WhatsApp", description: "Conecte seu número de WhatsApp para enviar e receber mensagens", action: "Iniciar tour guiado", route: "/wa-connections", estimatedMinutes: 3, icon: "📱", hasTour: true },
  { key: "cadastrar_cliente", title: "Cadastrar primeiro cliente", description: "Adicione seu primeiro cliente na plataforma para começar a gerenciar", action: "Iniciar tour guiado", route: "/customers", estimatedMinutes: 2, icon: "👥", hasTour: true },
  { key: "primeira_cobranca", title: "Criar primeira cobrança", description: "Crie uma cobrança para um dos seus clientes", action: "Iniciar tour guiado", route: "/cobrancas", estimatedMinutes: 3, icon: "💳", hasTour: true },
  { key: "explorar_dashboard", title: "Explorar o Dashboard", description: "Conheça os indicadores e métricas do seu negócio", action: "Iniciar tour guiado", route: "/dashboard", estimatedMinutes: 2, icon: "📊", hasTour: true },
  { key: "convidar_membro", title: "Convidar um membro da equipe", description: "Adicione outros membros da sua equipe para colaborar", action: "Iniciar tour guiado", route: "/usuarios", estimatedMinutes: 2, icon: "👋", hasTour: true },
  { key: "configurar_playbooks", title: "Configurar Playbooks de I.A.", description: "Ative funcionarios autonomos que qualificam leads e coletam dados pelo WhatsApp", action: "Configurar agora", route: "/intelligence", estimatedMinutes: 5, icon: "🤖", hasTour: false },
];

const motivationalMessages = [
  "Vamos começar! 🚀",
  "Ótimo começo! Continue assim! 💪",
  "Você está progredindo! 🌟",
  "Mais da metade concluída! 🎯",
  "Quase lá! Falta pouco! 🔥",
  "Impressionante! Último passo! ⭐",
  "Parabéns! Onboarding completo! 🎉",
  "Você é incrível! Tudo concluído! 🏆",
];

const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const { startTour } = useTour();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const fetchSteps = async () => {
      setLoading(true);
      const { data } = await supabase.from("onboarding_steps").select("step_key").eq("user_id", userId);
      if (cancelled) return;
      const keys = (data || []).map((d: any) => d.step_key);
      if (!keys.includes("conta_criada")) {
        await supabase.from("onboarding_steps").insert({ user_id: userId, step_key: "conta_criada" }).then(() => {});
        keys.push("conta_criada");
      }
      if (!cancelled) {
        setCompletedSteps(keys);
        setLoading(false);
      }
    };
    fetchSteps();
    return () => { cancelled = true; };
  }, [userId]);

  const handleStartTour = (step: OnboardingStep) => {
    const basePath = slug ? `/app/${slug}` : "";
    const fullRoute = basePath + step.route;

    const tourConfig = TOUR_CONFIGS[step.key];
    if (tourConfig) {
      // Navigate to the correct route first, then start the tour overlay
      navigate(fullRoute);
      setTimeout(() => startTour(tourConfig), 500);
    } else {
      navigate(fullRoute);
    }
  };

  const completedCount = completedSteps.length;
  const totalSteps = STEPS.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);
  const message = motivationalMessages[Math.min(completedCount, motivationalMessages.length - 1)];

  const getStepStatus = (key: string, index: number): "completed" | "current" | "pending" => {
    if (completedSteps.includes(key)) return "completed";
    const firstIncomplete = STEPS.findIndex(s => !completedSteps.includes(s.key));
    if (index === firstIncomplete) return "current";
    return "pending";
  };

  return (
    <>
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        <p className="text-xs text-muted-foreground">Sistema &gt; Onboarding Interativo</p>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 border border-primary/20">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Onboarding Interativo</h1>
            <p className="text-sm text-muted-foreground">Clique em cada etapa para iniciar um <strong>tour guiado</strong> pela área</p>
          </div>
        </div>

        {/* Progress Header */}
        <div className="bg-card border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {completedCount} de {totalSteps} etapas concluídas — {progressPercent}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">{message}</p>
            </div>
            {progressPercent === 100 && (
              <div className="flex items-center gap-2 text-primary">
                <PartyPopper className="h-6 w-6" />
                <span className="text-sm font-bold">Completo!</span>
              </div>
            )}
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Steps Timeline */}
        {loading ? (
          <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : (
          <div className="relative">
            <div className="absolute left-[23px] top-6 bottom-6 w-[2px] bg-border" />

            <div className="space-y-3">
              {STEPS.map((step, index) => {
                const status = getStepStatus(step.key, index);
                return (
                  <div key={step.key} className={`relative flex items-start gap-4 p-4 border transition-all ${
                    status === "current"
                      ? "bg-primary/5 border-primary/30 shadow-primary/10"
                      : status === "completed"
                      ? "bg-card border-border opacity-80"
                      : "bg-card border-border opacity-50"
                  }`}>
                    {/* Status Icon */}
                    <div className="shrink-0 relative z-10">
                      {status === "completed" ? (
                        <div className="w-[22px] h-[22px] rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      ) : status === "current" ? (
                        <div className="w-[22px] h-[22px] rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center">
                          <Circle className="h-2.5 w-2.5 text-primary" />
                        </div>
                      ) : (
                        <div className="w-[22px] h-[22px] rounded-full border-2 border-border bg-muted" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{step.icon}</span>
                        <h3 className={`text-sm font-semibold ${status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {step.title}
                        </h3>
                        {step.hasTour && status !== "completed" && (
                          <span className="text-[9px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">TOUR GUIADO</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                      {step.estimatedMinutes > 0 && (
                        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" /> ~{step.estimatedMinutes} minutos
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    {step.hasTour && (
                      <Button
                        size="sm"
                        variant={status === "current" ? "default" : "outline"}
                        onClick={() => handleStartTour(step)}
                        className="shrink-0 gap-1.5 text-xs"
                      >
                        <Play className="h-3 w-3" />
                        {status === "completed" ? "Refazer tour" : step.action}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!step.hasTour && step.route && status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(step.route)}
                        className="shrink-0 gap-1.5 text-xs"
                      >
                        {step.action} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OnboardingPage;
