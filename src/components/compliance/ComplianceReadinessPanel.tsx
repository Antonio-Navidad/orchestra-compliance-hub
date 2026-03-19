import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ShipmentGap {
  shipment_id: string;
  status: string;
  mode?: string;
  isCompliant: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countryCode: string;
  countryName: string;
}

export function ComplianceReadinessPanel({ open, onOpenChange, countryCode, countryName }: Props) {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<ShipmentGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data: rawShipments } = await supabase
        .from("shipments")
        .select("shipment_id, status, mode")
        .or(`destination_country.eq.${countryCode},import_country.eq.${countryCode},jurisdiction_code.eq.${countryCode}`)
        .not("status", "in", '("cleared","closed_avoided","closed_incident")')
        .limit(20);

      if (!rawShipments?.length) {
        setShipments([]);
        setLoading(false);
        return;
      }

      const ids = rawShipments.map(s => s.shipment_id);
      const { data: packets } = await supabase
        .from("document_packets")
        .select("shipment_id, completeness_score, filing_readiness_score")
        .in("shipment_id", ids);

      const packetMap = new Map((packets || []).map(p => [p.shipment_id, p]));

      const results: ShipmentGap[] = rawShipments.map(s => {
        const p = packetMap.get(s.shipment_id);
        const isCompliant = p ? (p.completeness_score || 0) >= 80 && (p.filing_readiness_score || 0) >= 70 : false;
        return { shipment_id: s.shipment_id, status: s.status, mode: s.mode, isCompliant };
      });

      setShipments(results);
      setLoading(false);
    };
    load();
  }, [open, countryCode]);

  const nonCompliant = shipments.filter(s => !s.isCompliant);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Compliance Gaps — {countryName}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Shipments with active lanes involving {countryName} that are missing required documents or filings.
          </p>
        </SheetHeader>

        <div className="space-y-3 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : nonCompliant.length === 0 ? (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="py-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium">All shipments are compliant</p>
                <p className="text-xs text-muted-foreground mt-1">No gaps detected for {countryName}</p>
              </CardContent>
            </Card>
          ) : (
            nonCompliant.map(s => (
              <Card key={s.shipment_id} className="border-destructive/20">
                <CardContent className="py-3 flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.shipment_id}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      {s.mode && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{s.mode}</Badge>}
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0">{s.status}</Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => {
                    onOpenChange(false);
                    navigate(`/shipment/${s.shipment_id}`);
                  }}>
                    Fix Now <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
