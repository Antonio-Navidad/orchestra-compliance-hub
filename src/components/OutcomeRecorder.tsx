import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";

interface OutcomeRecorderProps {
  shipmentId: string;
  workspaceId?: string;
}

export function OutcomeRecorder({ shipmentId, workspaceId }: OutcomeRecorderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [clearanceResult, setClearanceResult] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [landedCost, setLandedCost] = useState("");
  const [routeUsed, setRouteUsed] = useState("");
  const [delayNotes, setDelayNotes] = useState("");
  const [issueNotes, setIssueNotes] = useState("");

  const handleSubmit = async () => {
    if (!clearanceResult) {
      toast({ title: "Required", description: "Please select the clearance result.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const delays = delayNotes.trim()
        ? delayNotes.split("\n").filter(Boolean).map((d) => ({ reason: d, duration_hours: 0 }))
        : [];
      const issues = issueNotes.trim()
        ? issueNotes.split("\n").filter(Boolean).map((i) => ({ type: "customs", description: i }))
        : [];

      const { data, error } = await supabase.functions.invoke("record-outcome", {
        body: {
          shipment_id: shipmentId,
          actual_clearance_result: clearanceResult,
          actual_delivery_date: deliveryDate || undefined,
          actual_landed_cost: landedCost ? parseFloat(landedCost) : undefined,
          actual_route_used: routeUsed || undefined,
          actual_delays: delays.length > 0 ? delays : undefined,
          actual_issues: issues.length > 0 ? issues : undefined,
          workspace_id: workspaceId,
          validated_by: user?.id,
        },
      });

      if (error) throw error;

      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["outcome", shipmentId] });

      toast({
        title: "Outcome Recorded",
        description: data?.prediction_accuracy
          ? "Prediction accuracy computed and stored."
          : "Actual outcome saved.",
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to record outcome.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-8 text-center space-y-2">
          <CheckCircle className="mx-auto text-primary" size={32} />
          <p className="text-sm font-medium">Outcome recorded successfully</p>
          <p className="text-xs text-muted-foreground">Prediction accuracy has been computed and stored.</p>
        </CardContent>
      </Card>
    );
  }

  const clearanceOptions = [
    { value: "cleared", label: "Cleared", icon: CheckCircle, color: "text-risk-safe" },
    { value: "held", label: "Held / Customs Hold", icon: AlertTriangle, color: "text-risk-medium" },
    { value: "delayed", label: "Delayed", icon: Clock, color: "text-risk-high" },
    { value: "rejected", label: "Rejected", icon: XCircle, color: "text-risk-critical" },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs text-muted-foreground flex items-center gap-2">
          <ClipboardCheck size={14} className="text-primary" />
          RECORD ACTUAL OUTCOME
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Record what actually happened for prediction accuracy analysis.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-mono">CLEARANCE RESULT *</Label>
          <div className="grid grid-cols-2 gap-2">
            {clearanceOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setClearanceResult(opt.value)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                  clearanceResult === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <opt.icon size={14} className={opt.color} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-mono">ACTUAL DELIVERY DATE</Label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono">ACTUAL LANDED COST (USD)</Label>
            <Input
              type="number"
              placeholder="e.g. 5200"
              value={landedCost}
              onChange={(e) => setLandedCost(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-mono">ACTUAL ROUTE USED</Label>
          <Input
            placeholder="e.g. Shanghai → Long Beach via Busan"
            value={routeUsed}
            onChange={(e) => setRouteUsed(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-mono">DELAYS (one per line)</Label>
          <Textarea
            placeholder="Port congestion at Long Beach — 48 hours&#10;Customs secondary inspection — 24 hours"
            value={delayNotes}
            onChange={(e) => setDelayNotes(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-mono">CUSTOMS ISSUES ENCOUNTERED (one per line)</Label>
          <Textarea
            placeholder="HS code reclassification required&#10;Missing certificate of origin"
            value={issueNotes}
            onChange={(e) => setIssueNotes(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !clearanceResult}
          className="w-full font-mono text-xs"
        >
          {loading ? "RECORDING..." : "RECORD OUTCOME"}
        </Button>
      </CardContent>
    </Card>
  );
}
