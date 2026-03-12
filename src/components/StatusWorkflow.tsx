import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";

const ALL_STATUSES = [
  { value: "new", label: "NEW", color: "bg-primary/20 text-primary border-primary/30" },
  { value: "in_transit", label: "IN TRANSIT", color: "bg-primary/20 text-primary border-primary/30" },
  { value: "in_review", label: "IN REVIEW", color: "bg-risk-medium/20 text-risk-medium border-risk-medium/30" },
  { value: "waiting_docs", label: "WAITING ON DOCS", color: "bg-risk-medium/20 text-risk-medium border-risk-medium/30" },
  { value: "sent_to_broker", label: "SENT TO BROKER", color: "bg-primary/20 text-primary border-primary/30" },
  { value: "customs_hold", label: "CUSTOMS HOLD", color: "bg-risk-critical/20 text-risk-critical border-risk-critical/30" },
  { value: "flagged", label: "FLAGGED", color: "bg-risk-critical/20 text-risk-critical border-risk-critical/30" },
  { value: "escalated", label: "ESCALATED", color: "bg-risk-critical/20 text-risk-critical border-risk-critical/30" },
  { value: "corrected", label: "CORRECTED", color: "bg-risk-safe/20 text-risk-safe border-risk-safe/30" },
  { value: "filed", label: "FILED", color: "bg-primary/20 text-primary border-primary/30" },
  { value: "cleared", label: "CLEARED", color: "bg-risk-safe/20 text-risk-safe border-risk-safe/30" },
  { value: "closed_avoided", label: "CLOSED — LOSS AVOIDED", color: "bg-risk-safe/20 text-risk-safe border-risk-safe/30" },
  { value: "closed_incident", label: "CLOSED — INCIDENT", color: "bg-risk-critical/20 text-risk-critical border-risk-critical/30" },
];

interface StatusWorkflowProps {
  shipmentId: string;
  currentStatus: string;
}

export function StatusWorkflow({ shipmentId, currentStatus }: StatusWorkflowProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [updating, setUpdating] = useState(false);

  const current = ALL_STATUSES.find(s => s.value === currentStatus);

  const handleUpdate = async () => {
    if (newStatus === currentStatus) return;
    setUpdating(true);
    try {
      await supabase
        .from("shipments")
        .update({ status: newStatus as any })
        .eq("shipment_id", shipmentId);

      await supabase.from("shipment_events").insert({
        shipment_id: shipmentId,
        event_type: "status_change",
        description: `Status changed from ${currentStatus.replace(/_/g, " ").toUpperCase()} to ${newStatus.replace(/_/g, " ").toUpperCase()}`,
        user_id: user?.id,
        user_name: user?.email?.split("@")[0] || "System",
      });

      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["shipment-events", shipmentId] });
      toast({ title: "Status Updated" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Badge variant="outline" className={`font-mono text-[10px] ${current?.color || ""}`}>
        {current?.label || currentStatus.replace(/_/g, " ").toUpperCase()}
      </Badge>
      <ArrowRight size={14} className="text-muted-foreground" />
      <Select value={newStatus} onValueChange={setNewStatus}>
        <SelectTrigger className="w-[200px] h-8 text-xs font-mono bg-secondary/30 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALL_STATUSES.map(s => (
            <SelectItem key={s.value} value={s.value} className="text-xs font-mono">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="font-mono text-[10px] h-7"
        disabled={updating || newStatus === currentStatus}
        onClick={handleUpdate}
      >
        {updating ? "..." : "UPDATE"}
      </Button>
    </div>
  );
}

export function getStatusColor(status: string): string {
  return ALL_STATUSES.find(s => s.value === status)?.color || "";
}

export function getStatusLabel(status: string): string {
  return ALL_STATUSES.find(s => s.value === status)?.label || status.replace(/_/g, " ").toUpperCase();
}

export { ALL_STATUSES };
