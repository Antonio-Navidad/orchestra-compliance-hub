import { getModeComplianceChecks } from "@/lib/compliance";
import { TransportMode } from "@/types/orchestra";
import { CheckCircle, AlertTriangle, Clock } from "lucide-react";

interface ModeCompliancePanelProps {
  mode: TransportMode;
}

export function ModeCompliancePanel({ mode }: ModeCompliancePanelProps) {
  const checks = getModeComplianceChecks(mode);

  const modeLabels: Record<TransportMode, string> = {
    air: 'IATA Safety & Export Controls',
    sea: 'Maritime & D&D Compliance',
    land: 'USMCA & Border Compliance',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h4 className="font-mono text-xs text-muted-foreground mb-3">{modeLabels[mode]}</h4>
      <div className="space-y-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {check.priority === 'high' ? (
              <AlertTriangle size={14} className="text-risk-medium shrink-0" />
            ) : (
              <Clock size={14} className="text-muted-foreground shrink-0" />
            )}
            <span className="text-sm">{check.label}</span>
            <span className={`ml-auto font-mono text-[10px] uppercase ${
              check.priority === 'high' ? 'text-risk-medium' : 'text-muted-foreground'
            }`}>
              {check.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
