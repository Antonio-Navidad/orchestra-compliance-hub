import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, GitCompare, ArrowRight } from "lucide-react";
import { useValidationHistory, type ValidationSession } from "@/hooks/useValidationHistory";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface MismatchItem {
  field: string;
  sourceA: string;
  valueA: string;
  sourceB: string;
  valueB: string;
  severity: "critical" | "warning" | "info";
}

export function MismatchDetectionTab() {
  const { sessions, loading, fetchSessions } = useValidationHistory();
  const [selectedSession, setSelectedSession] = useState<ValidationSession | null>(null);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const getMismatches = (session: ValidationSession): MismatchItem[] => {
    if (!session.cross_doc_mismatches) return [];
    const raw = session.cross_doc_mismatches;
    if (!Array.isArray(raw)) return [];
    return raw.map((m: any) => ({
      field: m.field || m.fieldName || "Unknown",
      sourceA: m.docA || m.sourceA || "Doc A",
      valueA: String(m.valueA ?? m.docAValue ?? "—"),
      sourceB: m.docB || m.sourceB || "Doc B",
      valueB: String(m.valueB ?? m.docBValue ?? "—"),
      severity: m.severity || "warning",
    }));
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "bg-destructive/20 text-destructive border-destructive/30";
      case "warning": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <GitCompare size={14} className="text-primary" />
            Cross-Document Mismatch Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-[10px] font-mono text-muted-foreground mb-3">
            Select a validation session to view side-by-side field comparisons and flagged inconsistencies.
          </p>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground font-mono text-sm animate-pulse">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground font-mono text-sm">
              No validation sessions found. Run a validation first.
            </div>
          ) : (
            <div className="grid gap-2 max-h-[300px] overflow-y-auto">
              {sessions.slice(0, 20).map(s => {
                const mismatches = getMismatches(s);
                const hasMismatches = mismatches.length > 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    className={cn(
                      "w-full text-left p-2.5 rounded border transition-colors text-xs font-mono",
                      selectedSession?.id === s.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{s.shipment_id || "Untitled"}</span>
                      <div className="flex items-center gap-1.5">
                        {hasMismatches ? (
                          <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                            {mismatches.length} mismatches
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                            Clean
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {s.origin_country} → {s.destination_country} · {s.shipment_mode}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mismatch Detail */}
      {selectedSession && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              Mismatches: {selectedSession.shipment_id || "Session"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {(() => {
              const mismatches = getMismatches(selectedSession);
              if (mismatches.length === 0) {
                return (
                  <div className="py-6 text-center flex flex-col items-center gap-2">
                    <CheckCircle size={20} className="text-emerald-400" />
                    <p className="text-xs font-mono text-muted-foreground">
                      No cross-document mismatches detected
                    </p>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  {mismatches.map((m, i) => (
                    <div key={i} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-medium capitalize">
                          {m.field.replace(/_/g, " ")}
                        </span>
                        <Badge variant="outline" className={cn("text-[9px] font-mono", severityColor(m.severity))}>
                          {m.severity}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-[9px] font-mono text-muted-foreground mb-0.5">{m.sourceA}</p>
                          <p className="text-xs font-mono font-medium text-foreground">{m.valueA}</p>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                        <div className="bg-muted/30 rounded p-2">
                          <p className="text-[9px] font-mono text-muted-foreground mb-0.5">{m.sourceB}</p>
                          <p className="text-xs font-mono font-medium text-foreground">{m.valueB}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
