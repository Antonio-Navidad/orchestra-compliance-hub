import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/StatusBadge";
import { getStatusBadgeClass } from "@/lib/compliance";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";

const ALL_STATUSES = [
  { value: "new", label: "NEW" },
  { value: "in_transit", label: "IN TRANSIT" },
  { value: "in_review", label: "IN REVIEW" },
  { value: "waiting_docs", label: "WAITING ON DOCS" },
  { value: "sent_to_broker", label: "SENT TO BROKER" },
  { value: "customs_hold", label: "CUSTOMS HOLD" },
  { value: "flagged", label: "FLAGGED" },
  { value: "escalated", label: "ESCALATED" },
  { value: "corrected", label: "CORRECTED" },
  { value: "filed", label: "FILED" },
  { value: "cleared", label: "CLEARED" },
  { value: "closed_avoided", label: "CLOSED — LOSS AVOIDED" },
  { value: "closed_incident", label: "CLOSED — INCIDENT" },
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
      <StatusBadge status={currentStatus} size="sm" />
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

// Keep backwards-compatible exports for any remaining consumers
export function getStatusColor(status: string): string {
  return getStatusBadgeClass(status);
}

export function getStatusLabel(status: string): string {
  const found = ALL_STATUSES.find(s => s.value === status);
  return found?.label || status.replace(/_/g, " ").toUpperCase();
}

export { ALL_STATUSES };
