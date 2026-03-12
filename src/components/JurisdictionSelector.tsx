import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jurisdictionAdapters, memberStateOverlays } from "@/lib/jurisdictions";
import { toast } from "sonner";
import { Globe } from "lucide-react";

interface JurisdictionSelectorProps {
  shipmentId: string;
  currentCode: string;
}

export function JurisdictionSelector({ shipmentId, currentCode }: JurisdictionSelectorProps) {
  const queryClient = useQueryClient();

  const updateJurisdiction = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.from("shipments").update({ jurisdiction_code: code }).eq("shipment_id", shipmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      toast.success("Jurisdiction updated");
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Globe size={14} className="text-muted-foreground" />
      <Select value={currentCode} onValueChange={(v) => updateJurisdiction.mutate(v)}>
        <SelectTrigger className="w-[140px] bg-secondary/50 text-xs font-mono h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(jurisdictionAdapters).map(([code, adapter]) => (
            <SelectItem key={code} value={code} className="text-xs font-mono">
              {code} — {adapter.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
