import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Map, Navigation, Plane, Ship, Truck, Zap, Clock, DollarSign,
  ShieldAlert, AlertTriangle, ArrowRight, Loader2, BarChart3, Route
} from "lucide-react";

type RouteLeg = {
  from: string;
  to: string;
  mode: string;
  carrier_suggestion?: string;
  transit_days: number;
  notes?: string;
};

type RouteScenario = {
  label: string;
  summary: string;
  legs: RouteLeg[];
  total_transit_days: number;
  estimated_cost_usd_min?: number;
  estimated_cost_usd_max?: number;
  eta_confidence?: number;
  customs_hold_risk?: number;
  route_risk?: number;
  delay_risk?: number;
  explanation?: string;
};

type RouteResult = {
  recommended_route: RouteScenario;
  alternate_routes: RouteScenario[];
  warnings?: string[];
  predicted_arrival_window: string;
  confidence_summary: string;
};

const modeIcons: Record<string, React.ReactNode> = {
  air: <Plane className="h-4 w-4" />,
  sea: <Ship className="h-4 w-4" />,
  land: <Truck className="h-4 w-4" />,
  multimodal: <Route className="h-4 w-4" />,
};

function RiskMeter({ label, value, color }: { label: string; value?: number; color: string }) {
  const v = value ?? 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-muted-foreground">{label}</span>
        <span className={color}>{v}%</span>
      </div>
      <Progress value={v} className="h-1.5" />
    </div>
  );
}

function RouteCard({ route, recommended }: { route: RouteScenario; recommended?: boolean }) {
  return (
    <Card className={`${recommended ? "border-primary/50 bg-primary/5" : "border-border"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            {recommended && <Zap className="h-4 w-4 text-primary" />}
            {route.label}
          </CardTitle>
          {recommended && <Badge variant="default" className="text-[10px]">RECOMMENDED</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{route.summary}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legs timeline */}
        <div className="space-y-2">
          {route.legs.map((leg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                {modeIcons[leg.mode] || <Route className="h-3 w-3" />}
              </div>
              <span className="font-medium">{leg.from}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{leg.to}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{leg.transit_days}d</Badge>
              {leg.carrier_suggestion && (
                <span className="text-muted-foreground text-[10px]">{leg.carrier_suggestion}</span>
              )}
            </div>
          ))}
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
          <div className="text-center">
            <Clock className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
            <div className="text-sm font-bold">{route.total_transit_days}d</div>
            <div className="text-[10px] text-muted-foreground">Transit</div>
          </div>
          <div className="text-center">
            <DollarSign className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
            <div className="text-sm font-bold">
              {route.estimated_cost_usd_min && route.estimated_cost_usd_max
                ? `$${(route.estimated_cost_usd_min / 1000).toFixed(1)}k–${(route.estimated_cost_usd_max / 1000).toFixed(1)}k`
                : "N/A"}
            </div>
            <div className="text-[10px] text-muted-foreground">Est. Cost</div>
          </div>
          <div className="text-center">
            <BarChart3 className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
            <div className="text-sm font-bold">{route.eta_confidence ?? "—"}%</div>
            <div className="text-[10px] text-muted-foreground">ETA Conf.</div>
          </div>
        </div>

        {/* Risk meters */}
        <div className="space-y-2 pt-2">
          <RiskMeter label="Customs Hold" value={route.customs_hold_risk} color="text-amber-500" />
          <RiskMeter label="Route Risk" value={route.route_risk} color="text-orange-500" />
          <RiskMeter label="Delay Risk" value={route.delay_risk} color="text-red-500" />
        </div>

        {route.explanation && (
          <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{route.explanation}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function RouteBuilder() {
  const { t } = useLanguage();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState("sea");
  const [priority, setPriority] = useState("balanced");
  const [cargoType, setCargoType] = useState("");
  const [shipmentValue, setShipmentValue] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [deadline, setDeadline] = useState("");
  const [incoterm, setIncoterm] = useState("");
  const [shipmentId, setShipmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);

  const handlePlan = async () => {
    if (!origin || !destination) {
      toast.error("Origin and destination are required");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("route-builder", {
        body: {
          origin, destination, mode, priority, cargoType,
          shipmentValue: shipmentValue ? parseFloat(shipmentValue) : undefined,
          weightKg: weightKg ? parseFloat(weightKg) : undefined,
          deadline: deadline || undefined,
          incoterm: incoterm || undefined,
          shipmentId: shipmentId || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success("Routes generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate routes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Map className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Route Builder</h1>
          <p className="text-xs text-muted-foreground font-mono">AI-POWERED ORIGIN-TO-DESTINATION ROUTE PLANNER</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Navigation className="h-4 w-4" /> Route Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono">Origin</Label>
              <Input placeholder="e.g. Shanghai, China" value={origin} onChange={(e) => setOrigin(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono">Destination</Label>
              <Input placeholder="e.g. Miami, FL, USA" value={destination} onChange={(e) => setDestination(e.target.value)} className="text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-mono">Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="air">✈ Air</SelectItem>
                    <SelectItem value="sea">🚢 Sea</SelectItem>
                    <SelectItem value="land">🚛 Land</SelectItem>
                    <SelectItem value="multimodal">🔀 Multimodal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cheapest">💰 Cheapest</SelectItem>
                    <SelectItem value="fastest">⚡ Fastest</SelectItem>
                    <SelectItem value="safest">🛡 Safest</SelectItem>
                    <SelectItem value="lowest_customs_risk">📋 Low Customs Risk</SelectItem>
                    <SelectItem value="balanced">⚖ Balanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-mono">Cargo Type</Label>
              <Input placeholder="e.g. Electronics, Textiles" value={cargoType} onChange={(e) => setCargoType(e.target.value)} className="text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-mono">Value (USD)</Label>
                <Input type="number" placeholder="50000" value={shipmentValue} onChange={(e) => setShipmentValue(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono">Weight (kg)</Label>
                <Input type="number" placeholder="2000" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-mono">Deadline</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono">Incoterm</Label>
                <Select value={incoterm} onValueChange={setIncoterm}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["EXW", "FOB", "CIF", "DDP", "DAP", "FCA", "CFR", "CPT", "CIP", "DAT"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-mono">Shipment ID (optional)</Label>
              <Input placeholder="e.g. SHP-001" value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} className="text-sm" />
            </div>

            <Button onClick={handlePlan} disabled={loading} className="w-full font-mono">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              {loading ? "PLANNING ROUTES..." : "AI ROUTE PLAN"}
            </Button>
          </CardContent>
        </Card>

        {/* Results panel */}
        <div className="lg:col-span-2 space-y-4">
          {!result && !loading && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Map className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-mono text-sm text-muted-foreground">NO ROUTES GENERATED YET</h3>
                <p className="text-xs text-muted-foreground/60 mt-1">Enter origin, destination, and preferences to get AI-powered route recommendations</p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="font-mono text-sm text-muted-foreground">Analyzing routes, costs, and risks...</p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* Summary bar */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-xs font-mono">
                      <span className="text-muted-foreground">ETA Window:</span>{" "}
                      <span className="font-bold">{result.predicted_arrival_window}</span>
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono flex-1">{result.confidence_summary}</div>
                </CardContent>
              </Card>

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="space-y-1">
                  {result.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-destructive/10 text-destructive rounded-md p-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              <Tabs defaultValue="recommended">
                <TabsList className="font-mono text-xs">
                  <TabsTrigger value="recommended">Recommended</TabsTrigger>
                  <TabsTrigger value="alternates">Alternates ({result.alternate_routes?.length || 0})</TabsTrigger>
                  <TabsTrigger value="compare">Compare</TabsTrigger>
                </TabsList>

                <TabsContent value="recommended" className="mt-4">
                  <RouteCard route={result.recommended_route} recommended />
                </TabsContent>

                <TabsContent value="alternates" className="mt-4 space-y-4">
                  {result.alternate_routes?.length ? (
                    result.alternate_routes.map((r, i) => <RouteCard key={i} route={r} />)
                  ) : (
                    <p className="text-xs text-muted-foreground font-mono text-center py-8">No alternate routes generated</p>
                  )}
                </TabsContent>

                <TabsContent value="compare" className="mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-muted-foreground">Route</th>
                          <th className="text-center py-2 text-muted-foreground">Transit</th>
                          <th className="text-center py-2 text-muted-foreground">Cost Range</th>
                          <th className="text-center py-2 text-muted-foreground">ETA Conf.</th>
                          <th className="text-center py-2 text-muted-foreground">Hold Risk</th>
                          <th className="text-center py-2 text-muted-foreground">Delay Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[result.recommended_route, ...(result.alternate_routes || [])].map((r, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-2 font-medium flex items-center gap-1">
                              {i === 0 && <Zap className="h-3 w-3 text-primary" />}
                              {r.label}
                            </td>
                            <td className="text-center py-2">{r.total_transit_days}d</td>
                            <td className="text-center py-2">
                              {r.estimated_cost_usd_min && r.estimated_cost_usd_max
                                ? `$${r.estimated_cost_usd_min.toLocaleString()}–$${r.estimated_cost_usd_max.toLocaleString()}`
                                : "—"}
                            </td>
                            <td className="text-center py-2">{r.eta_confidence ?? "—"}%</td>
                            <td className="text-center py-2">{r.customs_hold_risk ?? "—"}%</td>
                            <td className="text-center py-2">{r.delay_risk ?? "—"}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
