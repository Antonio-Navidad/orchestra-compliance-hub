import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface BrokerSelectorProps {
  shipmentId: string;
  currentBrokerId?: string | null;
  currentBrokerName?: string | null;
}

export function BrokerSelector({ shipmentId, currentBrokerId, currentBrokerName }: BrokerSelectorProps) {
  const queryClient = useQueryClient();

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brokers").select("id, canonical_name");
      if (error) throw error;
      return data;
    },
  });

  const assignBroker = useMutation({
    mutationFn: async (brokerId: string) => {
      const broker = brokers.find((b) => b.id === brokerId);
      const { error } = await supabase.from("shipments").update({
        broker_id: brokerId,
        assigned_broker: broker?.canonical_name || "",
      }).eq("shipment_id", shipmentId);
      if (error) throw error;

      // Log event
      await supabase.from("shipment_events").insert({
        shipment_id: shipmentId,
        event_type: "broker_assigned",
        description: `Broker assigned: ${broker?.canonical_name}`,
        broker_id: brokerId,
        evidence_quality: "confirmed",
        attribution: "broker",
        confidence_level: 100,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      toast.success("Broker assigned");
    },
  });

  return (
    <Select value={currentBrokerId || ""} onValueChange={(v) => assignBroker.mutate(v)}>
      <SelectTrigger className="w-[200px] bg-secondary/50 text-xs font-mono h-8">
        <SelectValue placeholder={currentBrokerName || "Assign broker..."} />
      </SelectTrigger>
      <SelectContent>
        {brokers.map((b) => (
          <SelectItem key={b.id} value={b.id} className="text-xs font-mono">
            {b.canonical_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
