import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CountryComplianceProfile } from "@/lib/complianceEngineData";

interface Props {
  profile: CountryComplianceProfile;
}

interface ShipmentOption {
  shipment_id: string;
  status: string;
  mode: string;
}

export function QuickComplianceCheck({ profile }: Props) {
  const [shipments, setShipments] = useState<ShipmentOption[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<string>("");
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("shipments")
        .select("shipment_id, status, mode")
        .not("status", "in", '("cleared","closed_avoided","closed_incident")')
        .limit(50);
      setShipments(data || []);
    };
    load();
  }, []);

  const runCheck = () => {
    if (!selectedShipment) return;
    setLoading(true);
    setShowResults(true);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3 flex items-center gap-3 flex-wrap">
          <Zap className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-medium">Quick Compliance Check</p>
            <p className="text-[10px] text-muted-foreground">Select a shipment to check against {profile.name}'s requirements</p>
          </div>
          <Select value={selectedShipment} onValueChange={setSelectedShipment}>
            <SelectTrigger className="w-40 text-xs h-8">
              <SelectValue placeholder="Select shipment" />
            </SelectTrigger>
            <SelectContent>
              {shipments.map(s => (
                <SelectItem key={s.shipment_id} value={s.shipment_id}>
                  {s.shipment_id} ({s.mode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="text-xs font-mono" onClick={runCheck} disabled={!selectedShipment}>
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> RUN CHECK
          </Button>
        </CardContent>
      </Card>

      <Sheet open={showResults} onOpenChange={setShowResults}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Compliance Check: {selectedShipment}</SheetTitle>
            <p className="text-xs text-muted-foreground">Requirements for {profile.name} ({profile.authority.name})</p>
          </SheetHeader>

          <div className="space-y-3 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {profile.requiredDocuments.length} DOCUMENTS REQUIRED
                </p>
                {profile.requiredDocuments.map((doc, i) => {
                  // Simulate: first few are "present", rest are "missing"
                  const present = i < 3;
                  return (
                    <Card key={i} className={present ? "border-green-500/20" : "border-destructive/20 bg-destructive/5"}>
                      <CardContent className="py-2.5 flex items-center gap-3">
                        {present ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{doc.name}</p>
                          <div className="flex gap-1 mt-0.5">
                            {doc.modes.map(m => (
                              <Badge key={m} variant="outline" className="text-[8px] px-1 py-0">{m}</Badge>
                            ))}
                          </div>
                        </div>
                        <Badge variant={present ? "secondary" : "destructive"} className="text-[9px]">
                          {present ? "Present" : "Missing"}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
