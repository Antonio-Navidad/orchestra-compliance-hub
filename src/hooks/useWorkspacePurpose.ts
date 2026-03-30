import { createContext, useContext, useState, useCallback, useEffect } from "react";

export type WorkspacePurpose =
  | "marketplace"
  | "compliance"
  | "route_planning"
  | "operations"
  | "enterprise";

export interface WorkspacePurposeConfig {
  id: WorkspacePurpose;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
}

export const WORKSPACE_PURPOSES: WorkspacePurposeConfig[] = [
  {
    id: "marketplace",
    label: "Marketplace Ops",
    subtitle: "Amazon, MercadoLibre, Shopify sellers — orders, fulfillment, hand-offs",
    icon: "🛒",
    color: "hsl(var(--risk-medium))",
  },
  {
    id: "compliance",
    label: "Compliance & Risk",
    subtitle: "Customs readiness, documentation, sanctions, trade compliance",
    icon: "📋",
    color: "hsl(var(--risk-high))",
  },
  {
    id: "route_planning",
    label: "Route Planning",
    subtitle: "Creator Mode, multimodal routes, scenario analysis, strategic logistics",
    icon: "🗺️",
    color: "hsl(var(--primary))",
  },
  {
    id: "operations",
    label: "Operations Center",
    subtitle: "Live monitoring, Watch Mode, escalations, fleet oversight",
    icon: "📡",
    color: "hsl(var(--risk-low))",
  },
  {
    id: "enterprise",
    label: "Enterprise & Team",
    subtitle: "Multi-user management, analytics, broker scorecards, admin",
    icon: "🏢",
    color: "hsl(var(--muted-foreground))",
  },
];

const STORAGE_KEY = "orchestra-workspace-purpose";

export interface WorkspacePurposeContextValue {
  purpose: WorkspacePurpose | null;
  setPurpose: (p: WorkspacePurpose) => void;
  clearPurpose: () => void;
  hasPurpose: boolean;
}

export const WorkspacePurposeContext = createContext<WorkspacePurposeContextValue | null>(null);

export function useWorkspacePurposeState(): WorkspacePurposeContextValue {
  const [purpose, _setPurpose] = useState<WorkspacePurpose | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as WorkspacePurpose | null;
      if (stored) return stored;
      // Default to compliance so new users never hit the /welcome gate
      localStorage.setItem(STORAGE_KEY, "compliance");
      return "compliance";
    } catch {
      return "compliance";
    }
  });

  const setPurpose = useCallback((p: WorkspacePurpose) => {
    _setPurpose(p);
    localStorage.setItem(STORAGE_KEY, p);
  }, []);

  const clearPurpose = useCallback(() => {
    _setPurpose(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    purpose,
    setPurpose,
    clearPurpose,
    hasPurpose: purpose !== null,
  };
}

export function useWorkspacePurpose(): WorkspacePurposeContextValue {
  const ctx = useContext(WorkspacePurposeContext);
  if (!ctx) throw new Error("useWorkspacePurpose must be used within WorkspacePurposeProvider");
  return ctx;
}
