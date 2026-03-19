import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History } from "lucide-react";
import { format } from "date-fns";

interface RepeatShipmentSelectorProps {
  onSelect: (fields: Record<string, string>) => void;
}

export function RepeatShipmentSelector({ onSelect }: RepeatShipmentSelectorProps) {
  const { data: recentShipments = [] } = useQuery({
    queryKey: ["recent-shipments-for-prefill"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("shipment_id, origin_country, destination_country, mode, description, hs_code, consignee, shipper, declared_value, currency, incoterm, port_of_entry, direction, jurisdiction_code, coo_status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const handleSelect = (shipmentId: string) => {
    const ship = recentShipments.find(s => s.shipment_id === shipmentId);
    if (!ship) return;
    const fields: Record<string, string> = {};
    if (ship.origin_country) fields.origin_country = ship.origin_country;
    if (ship.destination_country) fields.destination_country = ship.destination_country;
    if (ship.mode) fields.mode = ship.mode;
    if (ship.description) fields.description = ship.description;
    if (ship.hs_code) fields.hs_code = ship.hs_code;
    if (ship.consignee) fields.consignee = ship.consignee;
    if (ship.shipper) fields.shipper = ship.shipper;
    if (ship.declared_value) fields.declared_value = String(ship.declared_value);
    if (ship.currency) fields.currency = ship.currency;
    if (ship.incoterm) fields.incoterm = ship.incoterm;
    if (ship.port_of_entry) fields.port_of_entry = ship.port_of_entry;
    if (ship.direction) fields.direction = ship.direction;
    if (ship.jurisdiction_code) fields.jurisdiction_code = ship.jurisdiction_code;
    if (ship.coo_status) fields.coo_status = ship.coo_status;
    onSelect(fields);
  };

  if (recentShipments.length === 0) return null;

  return (
    <Select onValueChange={handleSelect}>
      <SelectTrigger className="w-auto h-8 gap-1.5 font-mono text-[10px] border-dashed">
        <History size={12} />
        <SelectValue placeholder="Base on previous..." />
      </SelectTrigger>
      <SelectContent>
        {recentShipments.map(s => (
          <SelectItem key={s.shipment_id} value={s.shipment_id}>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold">{s.shipment_id}</span>
              <span className="text-muted-foreground">
                {s.origin_country}→{s.destination_country}
              </span>
              <span className="text-muted-foreground text-[10px]">
                {format(new Date(s.created_at), "MMM dd")}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
