import { useState } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { TOUR_STEPS } from "@/lib/onboardingContent";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, SkipForward } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function OnboardingTour() {
  const { isTourActive, tourStep, nextStep, prevStep, completeTour, skipTour } = useOnboarding();
  const navigate = useNavigate();

  if (!isTourActive) return null;

  const step = TOUR_STEPS[Math.min(tourStep, TOUR_STEPS.length - 1)];
  const isLast = tourStep >= TOUR_STEPS.length - 1;
  const isFirst = tourStep === 0;
  const progress = ((tourStep + 1) / TOUR_STEPS.length) * 100;

  const handleFinish = () => {
    completeTour();
    navigate("/");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-md" onClick={skipTour} />

      {/* Tour Card */}
      <div className="relative z-10 w-full max-w-lg mx-4 animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="rounded-xl border border-primary/20 bg-card shadow-[0_0_60px_-10px_hsl(var(--primary)/0.2)] overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/20">
                  <step.icon size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-0.5">
                    STEP {tourStep + 1} OF {TOUR_STEPS.length}
                  </p>
                  <h3 className="text-lg font-bold tracking-tight">{step.title}</h3>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={skipTour} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <X size={16} />
              </Button>
            </div>

            <p className="text-sm font-medium text-foreground/90 mb-2">{step.description}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
          </div>

          {/* Step indicators */}
          <div className="px-6 pb-2">
            <div className="flex gap-1">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    i <= tourStep ? "bg-primary" : "bg-secondary"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={prevStep} className="font-mono text-xs gap-1">
                  <ChevronLeft size={14} /> Back
                </Button>
              )}
              {!isLast && (
                <Button variant="ghost" size="sm" onClick={skipTour} className="font-mono text-xs gap-1 text-muted-foreground">
                  <SkipForward size={12} /> Skip tour
                </Button>
              )}
            </div>
            {isLast ? (
              <Button onClick={handleFinish} className="font-mono text-xs gap-1">
                Get Started <ChevronRight size={14} />
              </Button>
            ) : (
              <Button onClick={nextStep} className="font-mono text-xs gap-1">
                Next <ChevronRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
