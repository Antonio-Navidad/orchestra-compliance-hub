import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, FileSearch, DollarSign, Shield, Send,
  CheckCircle, ArrowUpRight, FileText, Zap
} from "lucide-react";

interface FixAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  severity: "critical" | "warning" | "info";
  eventType: string;
  newStatus?: string;
}

interface FixNowPanelProps {
  shipmentId: string;
  riskScore: number;
  status: string;
  riskNotes: string | null;
  hsCode: string;
  declaredValue: number;
  mismatches?: { field: string; severity: string }[];
}

export function FixNowPanel({
  shipmentId, riskScore, status, riskNotes, hsCode, declaredValue, mismatches = []
}: FixNowPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  const actions: FixAction[] = [];

  // Generate contextual actions based on risk
  if (mismatches.some(m => m.field === "HS Code")) {
    actions.push({
      id: "reclassify_hs",
      label: "Reclassify HS Code",
      description: `HS ${hsCode} flagged for mismatch. Review and correct classification.`,
      icon: FileSearch,
      severity: "critical",
      eventType: "hs_reclassification_requested",
      newStatus: "in_review",
    });
  }

  if (riskScore >= 60) {
    actions.push({
      id: "request_coo",
      label: "Request Missing COO",
      description: "Certificate of Origin required for compliance verification.",
      icon: FileText,
      severity: "critical",
      eventType: "coo_requested",
      newStatus: "waiting_docs",
    });
  }

  if (mismatches.some(m => m.field.includes("Value"))) {
    actions.push({
      id: "correct_value",
      label: "Correct Invoice Value",
      description: `Declared value $${declaredValue.toLocaleString()} shows discrepancy.`,
      icon: DollarSign,
      severity: "warning",
      eventType: "value_correction_initiated",
      newStatus: "in_review",
    });
  }

  if (riskScore >= 85) {
    actions.push({
      id: "escalate_compliance",
      label: "Escalate to Compliance",
      description: "Critical risk requires compliance team review.",
      icon: Shield,
      severity: "critical",
      eventType: "escalated_to_compliance",
      newStatus: "escalated",
    });
  }

  actions.push({
    id: "send_broker_note",
    label: "Send Broker Note",
    description: "Generate and send correction note to assigned broker.",
    icon: Send,
    severity: "info",
    eventType: "broker_note_sent",
    newStatus: "sent_to_broker",
  });

  if (status !== "cleared" && status !== "closed_avoided") {
    actions.push({
      id: "mark_resolved",
      label: "Mark as Resolved",
      description: "All issues addressed. Mark shipment as corrected.",
      icon: CheckCircle,
      severity: "info",
      eventType: "marked_resolved",
      newStatus: "corrected",
    });
  }

  const handleAction = async (action: FixAction) => {
    setLoading(action.id);
    try {
      // Log the event
      await supabase.from("shipment_events").insert({
        shipment_id: shipmentId,
        event_type: action.eventType,
        description: `${action.label}: ${action.description}`,
        user_id: user?.id,
        user_name: user?.email?.split("@")[0] || "System",
      });

      // Update shipment status if applicable
      if (action.newStatus) {
        await supabase
          .from("shipments")
          .update({ status: action.newStatus as any })
          .eq("shipment_id", shipmentId);
      }

      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["shipment-events", shipmentId] });

      toast({
        title: "Action Completed",
        description: `${action.label} — status updated.`,
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to execute action.", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const severityColors = {
    critical: "border-risk-critical/30 bg-risk-critical/5",
    warning: "border-risk-medium/30 bg-risk-medium/5",
    info: "border-border bg-secondary/30",
  };

  const severityIconColors = {
    critical: "text-risk-critical",
    warning: "text-risk-medium",
    info: "text-primary",
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs text-muted-foreground flex items-center gap-2">
          <Zap size={14} className="text-primary" />
          FIX NOW — ACTION CENTER
        </CardTitle>
        {riskNotes && (
          <p className="text-xs text-muted-foreground mt-1">{riskNotes}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <div
            key={action.id}
            className={`rounded-lg border p-3 flex items-center gap-3 ${severityColors[action.severity]}`}
          >
            <action.icon size={16} className={severityIconColors[action.severity]} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{action.label}</p>
              <p className="text-xs text-muted-foreground truncate">{action.description}</p>
            </div>
            <Button
              size="sm"
              variant={action.severity === "critical" ? "destructive" : "outline"}
              className="font-mono text-[10px] h-7 shrink-0"
              disabled={loading === action.id}
              onClick={() => handleAction(action)}
            >
              {loading === action.id ? "..." : "EXECUTE"}
              <ArrowUpRight size={10} className="ml-1" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
