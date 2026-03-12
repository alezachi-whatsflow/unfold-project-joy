import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export interface TourStep {
  title: string;
  description: string;
  selector?: string; // CSS selector to highlight
}

export interface TourConfig {
  stepKey: string;
  route: string;
  title: string;
  icon: string;
  steps: TourStep[];
}

interface TourContextType {
  activeTour: TourConfig | null;
  currentStepIndex: number;
  startTour: (tour: TourConfig) => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const startTour = useCallback((tour: TourConfig) => {
    setActiveTour(tour);
    setCurrentStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (currentStepIndex < activeTour.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [activeTour, currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const endTour = useCallback(() => {
    setActiveTour(null);
    setCurrentStepIndex(0);
  }, []);

  return (
    <TourContext.Provider value={{
      activeTour,
      currentStepIndex,
      startTour,
      nextStep,
      prevStep,
      endTour,
      isActive: !!activeTour,
    }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}
