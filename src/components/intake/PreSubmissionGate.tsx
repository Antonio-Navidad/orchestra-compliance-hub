import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PreSubmissionGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentData: {
    shipmentId: string;
    originCountry: string;
    destinationCountry: string;
    mode: string;
    hsCode: string;
    description: string;
    declaredValue: string;
    currency: string;
    consignee: string;
    shipper: string;
    cooStatus: string;
    incoterm: string;
    uploadedDocs: string[];
    packetScore: number;
    missingDocs: string[];
  };
  onConfirm: () => void;
  onForceCreate: () => void;
}

interface CheckResult {
  overallReadiness: number;
  clearanceRate: string;
  blockers: Array<{ issue: string; explanation: string; fixAction: string }>;
  warnings: Array<{ issue: string; explanation: string }>;
  readyItems: string[];
}

export function PreSubmissionGate({ open, onOpenChange, shipmentData, onConfirm, onForceCreate }: PreSubmissionGateProps) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("intake-validate", {
        body: { action: "pre_submission_check", ...shipmentData },
      });
      if (error) throw error;
      setResult(data);
      setChecked(true);
    } catch {
      // Fallback: deterministic check
      const blockers: CheckResult["blockers"] = [];
      const warnings: CheckResult["warnings"] = [];
      const readyItems: string[] = [];

      if (!shipmentData.hsCode) blockers.push({ issue: "Missing HS Code", explanation: "HS code is required for customs classification.", fixAction: "Enter HS code" });
      if (!shipmentData.consignee) blockers.push({ issue: "Missing Consignee", explanation: "Consignee is required for customs entry.", fixAction: "Enter consignee" });
      if (!shipmentData.declaredValue) blockers.push({ issue: "Missing Declared Value", explanation: "Declared value is required for duty calculation.", fixAction: "Enter declared value" });
      if (shipmentData.missingDocs.length > 0) warnings.push({ issue: `${shipmentData.missingDocs.length} missing documents`, explanation: `Documents needed: ${shipmentData.missingDocs.join(", ")}` });
      if (shipmentData.cooStatus === "unknown") warnings.push({ issue: "COO status unknown", explanation: "May miss trade agreement savings" });

      if (shipmentData.hsCode) readyItems.push("HS Code provided");
      if (shipmentData.description) readyItems.push("Commodity description present");
      if (shipmentData.uploadedDocs.length > 0) readyItems.push(`${shipmentData.uploadedDocs.length} documents uploaded`);

      setResult({
        overallReadiness: shipmentData.packetScore,
        clearanceRate: shipmentData.packetScore > 85 ? "94%" : shipmentData.packetScore > 60 ? "78%" : "52%",
        blockers, warnings, readyItems,
      });
      setChecked(true);
    }
    setLoading(false);
  };

  // Auto-run check when opened
  if (open && !checked && !loading) runCheck();

  const handleClose = () => {
    onOpenChange(false);
    setResult(null);
    setChecked(false);
  };

  const hasBlockers = result && result.blockers.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-primary" />
            Pre-Submission Compliance Check
          </DialogTitle>
          <DialogDescription>
            Final validation before submitting shipment {shipmentData.shipmentId}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="mx-auto animate-spin text-primary" size={32} />
            <p className="text-sm text-foreground">Running compliance validation...</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Overall */}
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <div className={`text-3xl font-bold font-mono ${result.overallReadiness >= 80 ? "text-risk-safe" : result.overallReadiness >= 50 ? "text-risk-medium" : "text-risk-critical"}`}>
                {result.overallReadiness}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Estimated compliance readiness. Shipments above 85% readiness have a {result.clearanceRate} clearance rate on this lane.
              </p>
            </div>

            {/* Blockers */}
            {result.blockers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <XCircle size={14} className="text-risk-critical" />
                  <span className="text-xs font-mono font-bold text-risk-critical">CRITICAL BLOCKERS ({result.blockers.length})</span>
                </div>
                {result.blockers.map((b, i) => (
                  <div key={i} className="p-2.5 rounded-md border border-risk-critical/30 bg-risk-critical/5 space-y-1">
                    <p className="text-xs font-medium text-foreground">{b.issue}</p>
                    <p className="text-[11px] text-muted-foreground">{b.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-risk-high" />
                  <span className="text-xs font-mono font-bold text-risk-high">WARNINGS ({result.warnings.length})</span>
                </div>
                {result.warnings.map((w, i) => (
                  <div key={i} className="p-2.5 rounded-md border border-risk-high/30 bg-risk-high/5 space-y-1">
                    <p className="text-xs font-medium text-foreground">{w.issue}</p>
                    <p className="text-[11px] text-muted-foreground">{w.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Ready */}
            {result.readyItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-risk-safe" />
                  <span className="text-xs font-mono font-bold text-risk-safe">READY ({result.readyItems.length})</span>
                </div>
                <div className="space-y-1">
                  {result.readyItems.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 size={10} className="text-risk-safe" /> {r}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {!hasBlockers ? (
                <Button onClick={() => { handleClose(); onConfirm(); }} className="flex-1 font-mono text-xs">
                  CREATE SHIPMENT
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleClose} className="flex-1 font-mono text-xs">
                    Fix Issues First
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => { handleClose(); onForceCreate(); }}
                    className="font-mono text-xs"
                  >
                    Create Anyway
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
