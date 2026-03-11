import { ComparisonMismatch } from "@/types/orchestra";
import { AlertTriangle, XCircle, Info } from "lucide-react";

interface ComparisonViewProps {
  mismatches: ComparisonMismatch[];
}

export function ComparisonView({ mismatches }: ComparisonViewProps) {
  if (mismatches.length === 0) {
    return (
      <div className="rounded-lg border border-risk-safe/30 bg-risk-safe/5 p-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-risk-safe/20 flex items-center justify-center">
          <Info size={16} className="text-risk-safe" />
        </div>
        <div>
          <p className="text-sm font-medium text-risk-safe">All Clear</p>
          <p className="text-xs text-muted-foreground">Invoice and Manifest data match.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mismatches.map((m, i) => {
        const isCritical = m.severity === 'critical';
        const isWarning = m.severity === 'warning';
        return (
          <div
            key={i}
            className={`rounded-lg border p-3 flex items-start gap-3 ${
              isCritical
                ? 'border-risk-critical/30 bg-risk-critical/5'
                : isWarning
                ? 'border-risk-medium/30 bg-risk-medium/5'
                : 'border-border bg-secondary/30'
            }`}
          >
            <div className={`mt-0.5 ${isCritical ? 'text-risk-critical' : isWarning ? 'text-risk-medium' : 'text-muted-foreground'}`}>
              {isCritical ? <XCircle size={16} /> : isWarning ? <AlertTriangle size={16} /> : <Info size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{m.field} Mismatch</p>
              <div className="flex gap-4 mt-1">
                <div className="text-xs">
                  <span className="text-muted-foreground">Invoice: </span>
                  <span className="font-mono font-medium">{m.invoice_value}</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Manifest: </span>
                  <span className="font-mono font-medium">{m.manifest_value}</span>
                </div>
              </div>
            </div>
            <span className={`font-mono text-[10px] uppercase font-bold ${
              isCritical ? 'text-risk-critical' : isWarning ? 'text-risk-medium' : 'text-muted-foreground'
            }`}>
              {m.severity}
            </span>
          </div>
        );
      })}
    </div>
  );
}
