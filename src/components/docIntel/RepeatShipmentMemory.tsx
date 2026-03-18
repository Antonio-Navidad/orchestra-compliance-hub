import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, History, ArrowRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { RULE_PACKS_VERSION } from "@/lib/jurisdictionRulePacks";

interface PriorSession {
  id: string;
  shipment_id: string | null;
  origin_country: string | null;
  destination_country: string | null;
  shipment_mode: string | null;
  hs_code: string | null;
  declared_value: string | null;
  documents: any;
  completeness_score: number | null;
  created_at: string;
  notes: string | null;
}

interface FieldDiff {
  field: string;
  previousValue: string;
  currentValue: string;
  changed: boolean;
}

interface RepeatShipmentMemoryProps {
  originCountry: string;
  destinationCountry: string;
  shipmentMode: string;
  hsCode: string;
  declaredValue: string;
  onApplyPrior: (session: PriorSession) => void;
}

export function RepeatShipmentMemory({
  originCountry,
  destinationCountry,
  shipmentMode,
  hsCode,
  declaredValue,
  onApplyPrior,
}: RepeatShipmentMemoryProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [priorSessions, setPriorSessions] = useState<PriorSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrior, setSelectedPrior] = useState<PriorSession | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [complianceChanged, setComplianceChanged] = useState(false);

  const fetchPrior = useCallback(async () => {
    if (!originCountry || !destinationCountry || !user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("validation_sessions")
      .select("*")
      .eq("origin_country", originCountry)
      .eq("destination_country", destinationCountry)
      .eq("shipment_mode", shipmentMode)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data && data.length > 0) {
      setPriorSessions(data as PriorSession[]);

      // Check if compliance rules changed since last shipment
      const lastNotes = data[0].notes;
      if (lastNotes) {
        try {
          const meta = JSON.parse(lastNotes);
          if (meta.rulesVersion && meta.rulesVersion !== RULE_PACKS_VERSION) {
            setComplianceChanged(true);
          }
        } catch {}
      }
    } else {
      setPriorSessions([]);
    }
    setLoading(false);
  }, [originCountry, destinationCountry, shipmentMode, user]);

  useEffect(() => {
    fetchPrior();
  }, [fetchPrior]);

  if (dismissed || priorSessions.length === 0 || loading) return null;

  const buildDiffs = (prior: PriorSession): FieldDiff[] => {
    const diffs: FieldDiff[] = [];
    const pairs: [string, string, string][] = [
      ["HS Code", prior.hs_code || "", hsCode],
      ["Declared Value", prior.declared_value || "", declaredValue],
      ["Mode", prior.shipment_mode || "", shipmentMode],
    ];
    for (const [field, prev, curr] of pairs) {
      diffs.push({ field, previousValue: prev, currentValue: curr, changed: prev !== curr && !!curr });
    }
    return diffs;
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <History size={14} className="text-amber-400" />
            {t("memory.repeatDetected")}
            <Badge variant="outline" className="text-[9px] font-mono bg-amber-500/10 text-amber-400 border-amber-500/30">
              {priorSessions.length} {t("memory.prior")}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)} className="text-[10px] font-mono h-6">
            {t("memory.dismiss")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <p className="text-[10px] font-mono text-muted-foreground">
          {t("memory.preFillHint")} <strong>{originCountry} → {destinationCountry}</strong> ({shipmentMode})
        </p>

        {complianceChanged && (
          <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
            <AlertTriangle size={14} className="text-destructive shrink-0" />
            <p className="text-[10px] font-mono text-destructive">
              Compliance requirements on this lane have been updated since your last shipment.
              Review the current lane guidance before proceeding.
            </p>
          </div>
        )}

        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {priorSessions.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedPrior(s)}
              className={cn(
                "w-full text-left p-2.5 rounded border text-xs font-mono transition-colors",
                selectedPrior?.id === s.id
                  ? "border-amber-400 bg-amber-500/10"
                  : "border-border hover:border-amber-400/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.shipment_id || s.id.slice(0, 8)}</span>
                <span className="text-[9px] text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                HS: {s.hs_code || "—"} · Value: {s.declared_value || "—"} · 
                Score: {s.completeness_score != null ? `${s.completeness_score}%` : "—"}
              </p>
            </button>
          ))}
        </div>

        {selectedPrior && (
          <>
            <div className="border rounded p-2.5 space-y-1.5">
              <p className="text-[10px] font-mono font-medium text-muted-foreground mb-1">
                Field Comparison: Previous vs Current
              </p>
              {buildDiffs(selectedPrior).map(d => (
                <div key={d.field} className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-muted-foreground w-24 shrink-0">{d.field}</span>
                  <span className={cn("flex-1 truncate", d.changed ? "text-amber-400" : "text-foreground")}>
                    {d.previousValue || "—"}
                  </span>
                  {d.changed && (
                    <>
                      <ArrowRight size={10} className="text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-primary font-medium">
                        {d.currentValue || "—"}
                      </span>
                    </>
                  )}
                  {!d.changed && (
                    <CheckCircle size={10} className="text-emerald-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={() => onApplyPrior(selectedPrior)}
              size="sm"
              className="text-xs font-mono gap-1.5 w-full"
            >
              <RefreshCw size={12} />
              Pre-Fill From This Session
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
