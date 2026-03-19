import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  countryCode: string;
}

export function ComplianceReadinessIndicator({ countryCode }: Props) {
  const [shipmentCount, setShipmentCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Find active shipments destined for this country
      const { data: shipments } = await supabase
        .from("shipments")
        .select("shipment_id, status")
        .or(`destination_country.eq.${countryCode},import_country.eq.${countryCode},jurisdiction_code.eq.${countryCode}`)
        .not("status", "in", '("cleared","closed_avoided","closed_incident")')
        .limit(20);

      const total = shipments?.length || 0;
      setShipmentCount(total);

      if (total === 0) {
        setLoading(false);
        return;
      }

      // Check document packets for those shipments
      const ids = shipments!.map(s => s.shipment_id);
      const { data: packets } = await supabase
        .from("document_packets")
        .select("shipment_id, completeness_score, filing_readiness_score")
        .in("shipment_id", ids);

      const ready = (packets || []).filter(p =>
        (p.completeness_score || 0) >= 80 && (p.filing_readiness_score || 0) >= 70
      ).length;

      setReadyCount(ready);
      setLoading(false);
    };
    load();
  }, [countryCode]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-mono">Checking compliance readiness...</span>
        </CardContent>
      </Card>
    );
  }

  if (shipmentCount === 0) return null;

  const pct = Math.round((readyCount / shipmentCount) * 100);

  return (
    <Card className={pct >= 80 ? "border-green-500/30 bg-green-500/5" : pct >= 50 ? "border-amber-500/30 bg-amber-500/5" : "border-destructive/30 bg-destructive/5"}>
      <CardContent className="py-3">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[10px] font-mono text-muted-foreground">COMPLIANCE READINESS</span>
          <Badge variant="outline" className="ml-auto text-[10px] font-mono">
            {readyCount}/{shipmentCount} shipments ready
          </Badge>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" /> {readyCount} compliant
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-destructive" /> {shipmentCount - readyCount} gaps found
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
