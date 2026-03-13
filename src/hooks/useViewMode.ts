import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { DirectionContext } from "@/lib/issueFraming";

export type ViewPersona =
  | "seller"
  | "importer"
  | "exporter"
  | "government"
  | "logistics"
  | "compliance"
  | "creator"
  | "enterprise";

export interface ViewModeState {
  persona: ViewPersona;
  direction: DirectionContext;
  detailLevel: "simple" | "advanced";
}

const PERSONA_DEFAULTS: Record<ViewPersona, { direction: DirectionContext; detailLevel: "simple" | "advanced" }> = {
  seller: { direction: "outbound", detailLevel: "simple" },
  importer: { direction: "inbound", detailLevel: "advanced" },
  exporter: { direction: "outbound", detailLevel: "advanced" },
  government: { direction: "combined", detailLevel: "advanced" },
  logistics: { direction: "combined", detailLevel: "advanced" },
  compliance: { direction: "combined", detailLevel: "advanced" },
  creator: { direction: "combined", detailLevel: "simple" },
  enterprise: { direction: "combined", detailLevel: "advanced" },
};

export const PERSONA_LABELS: Record<ViewPersona, string> = {
  seller: "Seller",
  importer: "Importer",
  exporter: "Exporter",
  government: "Government",
  logistics: "Logistics",
  compliance: "Compliance",
  creator: "Creator",
  enterprise: "Enterprise",
};

export const DIRECTION_LABELS: Record<DirectionContext, string> = {
  inbound: "Inbound",
  outbound: "Outbound",
  combined: "Combined",
};

const STORAGE_KEY = "orchestra-view-mode";

function loadState(): ViewModeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { persona: "logistics", direction: "combined", detailLevel: "advanced" };
}

export interface ViewModeContextValue extends ViewModeState {
  setPersona: (p: ViewPersona) => void;
  setDirection: (d: DirectionContext) => void;
  setDetailLevel: (l: "simple" | "advanced") => void;
  isSimple: boolean;
}

export const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function useViewModeState(): ViewModeContextValue {
  const [state, setState] = useState<ViewModeState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setPersona = useCallback((p: ViewPersona) => {
    const defaults = PERSONA_DEFAULTS[p];
    setState({ persona: p, direction: defaults.direction, detailLevel: defaults.detailLevel });
  }, []);

  const setDirection = useCallback((d: DirectionContext) => {
    setState(prev => ({ ...prev, direction: d }));
  }, []);

  const setDetailLevel = useCallback((l: "simple" | "advanced") => {
    setState(prev => ({ ...prev, detailLevel: l }));
  }, []);

  return {
    ...state,
    setPersona,
    setDirection,
    setDetailLevel,
    isSimple: state.detailLevel === "simple",
  };
}

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error("useViewMode must be used within ViewModeProvider");
  return ctx;
}
