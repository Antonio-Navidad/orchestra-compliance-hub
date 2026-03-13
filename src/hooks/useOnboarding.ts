import { useState, useCallback, useEffect } from "react";

const ONBOARDING_KEY = "orchestra-onboarding-complete";
const TOUR_STEP_KEY = "orchestra-tour-step";

export function useOnboarding() {
  const [hasCompleted, setHasCompleted] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) === "true"; } catch { return false; }
  });
  const [tourStep, setTourStep] = useState(() => {
    try { return parseInt(localStorage.getItem(TOUR_STEP_KEY) || "0", 10); } catch { return 0; }
  });
  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    if (!hasCompleted) {
      const timer = setTimeout(() => setIsTourActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [hasCompleted]);

  const completeTour = useCallback(() => {
    setHasCompleted(true);
    setIsTourActive(false);
    setTourStep(0);
    localStorage.setItem(ONBOARDING_KEY, "true");
    localStorage.removeItem(TOUR_STEP_KEY);
  }, []);

  const restartTour = useCallback(() => {
    setHasCompleted(false);
    setTourStep(0);
    setIsTourActive(true);
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.setItem(TOUR_STEP_KEY, "0");
  }, []);

  const nextStep = useCallback(() => {
    setTourStep(s => {
      const next = s + 1;
      localStorage.setItem(TOUR_STEP_KEY, String(next));
      return next;
    });
  }, []);

  const prevStep = useCallback(() => {
    setTourStep(s => {
      const prev = Math.max(0, s - 1);
      localStorage.setItem(TOUR_STEP_KEY, String(prev));
      return prev;
    });
  }, []);

  const skipTour = completeTour;

  return { hasCompleted, isTourActive, tourStep, nextStep, prevStep, completeTour, restartTour, skipTour };
}
