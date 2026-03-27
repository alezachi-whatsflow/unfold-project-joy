import { useEffect, useState, useRef } from "react";
import { useTour } from "@/contexts/TourContext";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function TourOverlay() {
  const { activeTour, currentStepIndex, nextStep, prevStep, endTour, isActive } = useTour();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Navigate to tour route on start
  useEffect(() => {
    if (isActive && activeTour && !hasNavigated) {
      navigate(activeTour.route);
      setHasNavigated(true);
    }
  }, [isActive, activeTour, navigate, hasNavigated]);

  // Reset navigation flag when tour ends
  useEffect(() => {
    if (!isActive) setHasNavigated(false);
  }, [isActive]);

  // Find and highlight element
  useEffect(() => {
    if (!isActive || !activeTour) return;
    const step = activeTour.steps[currentStepIndex];
    if (!step?.selector) {
      setHighlightRect(null);
      return;
    }

    const timer = setTimeout(() => {
      const el = document.querySelector(step.selector!);
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlightRect(rect);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setHighlightRect(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isActive, activeTour, currentStepIndex]);

  if (!isActive || !activeTour) return null;

  const currentStep = activeTour.steps[currentStepIndex];
  const totalSteps = activeTour.steps.length;
  const isLast = currentStepIndex === totalSteps - 1;
  const isFirst = currentStepIndex === 0;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const handleComplete = async () => {
    if (user) {
      const { error } = await supabase
        .from("onboarding_steps")
        .upsert({ user_id: user.id, step_key: activeTour.stepKey }, { onConflict: "user_id,step_key" });
      if (!error) {
        toast.success("Etapa concluída! 🎉");
      }
    }
    endTour();
    navigate("/sistema/onboarding");
  };

  // Calculate panel position
  const panelStyle: React.CSSProperties = highlightRect
    ? {
        position: "fixed",
        top: Math.min(highlightRect.bottom + 16, window.innerHeight - 320),
        left: Math.max(16, Math.min(highlightRect.left, window.innerWidth - 420)),
        zIndex: 10002,
      }
    : {
        position: "fixed",
        bottom: 32,
        right: 32,
        zIndex: 10002,
      };

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[10000] pointer-events-none"
        style={{ background: "rgba(0,0,0,0.45)" }}
      />

      {/* Highlight cutout */}
      {highlightRect && (
        <div
          className="fixed z-[10001] pointer-events-none"
          style={{
            top: highlightRect.top - 6,
            left: highlightRect.left - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.45), 0 0 20px 4px hsl(var(--primary) / 0.4)",
            border: "2px solid hsl(var(--primary))",
          }}
        />
      )}

      {/* Guide Panel */}
      <div
        style={panelStyle}
        className="pointer-events-auto w-[400px] max-w-[calc(100vw-32px)]"
      >
        <div className="bg-card border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-primary/10 border-b border-border px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">{activeTour.icon} {activeTour.title}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { endTour(); navigate("/sistema/onboarding"); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary shrink-0">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{currentStep.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{currentStep.description}</p>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground/60 text-center">
              Passo {currentStepIndex + 1} de {totalSteps}
            </p>
          </div>

          {/* Actions */}
          <div className="px-5 pb-4 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={isFirst}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </Button>

            {isLast ? (
              <Button size="sm" onClick={handleComplete} className="gap-1 text-xs bg-primary">
                <CheckCircle2 className="h-3.5 w-3.5" /> Concluir etapa
              </Button>
            ) : (
              <Button size="sm" onClick={nextStep} className="gap-1 text-xs">
                Próximo <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
