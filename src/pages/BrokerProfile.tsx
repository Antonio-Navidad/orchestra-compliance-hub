import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, Shield, AlertTriangle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { jurisdictionAdapters } from "@/lib/jurisdictions";
import { Shipment } from "@/types/orchestra";
import { getStatusColor, getStatusLabel } from "@/components/StatusWorkflow";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

const WATCHLIST_COLORS: Record<string, string> = {
  preferred: "bg-risk-safe/20 text-risk-safe border-risk-safe/30",
  strategic: "bg-primary/20 text-primary border-primary/30",
  "under review": "bg-risk-medium/20 text-risk-medium border-risk-medium/30",
  probation: "bg-risk-high/20 text-risk-high border-risk-high/30",
  "high-risk": "bg-destructive/20 text-destructive border-destructive/30",
  none: "bg-muted text-muted-foreground border-border",
};

export default function BrokerProfile() {
  const { id } = useParams<{ id: string }>();

  const { data: broker } = useQuery({
    queryKey: ["broker", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("brokers").select("*").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ["shipments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("*");
      if (error) throw error;
      return data as unknown as (Shipment & { broker_id?: string; assigned_broker?: string; jurisdiction_code?: string; origin_country?: string; destination_country?: string })[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["broker-events", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipment_events").select("*").eq("broker_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const brokerShipments = useMemo(() => {
    if (!broker) return [];
    return shipments.filter(
      (s) => s.broker_id === broker.id || s.assigned_broker === broker.canonical_name ||
             (broker.aliases || []).some((a: string) => a.toLowerCase() === (s.assigned_broker || "").toLowerCase())
    );
  }, [broker, shipments]);

  const stats = useMemo(() => {
    const holds = brokerShipments.filter((s) => s.status === "customs_hold").length;
    let exposure = 0, resolved = 0;
    brokerShipments.forEach((s) => {
      const adapter = jurisdictionAdapters[s.jurisdiction_code || "US"] || jurisdictionAdapters.US;
      const exp = (s.risk_score / 100) * s.declared_value * (adapter.avgPenaltyPercent / 100);
      exposure += exp;
      if (s.status === "cleared" || s.status === "corrected" || s.status === "closed_avoided") resolved += exp * 0.7;
    });
    return {
      total: brokerShipments.length,
      holds,
      holdRate: brokerShipments.length > 0 ? Math.round((holds / brokerShipments.length) * 100) : 0,
      exposure: Math.round(exposure),
      resolved: Math.round(resolved),
    };
  }, [brokerShipments]);

  // Trend data
  const trendData = useMemo(() => {
    const months = new Map<string, { month: string; shipments: number; exposure: number; holds: number }>();
    brokerShipments.forEach((s) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const ex = months.get(key) || { month: label, shipments: 0, exposure: 0, holds: 0 };
      ex.shipments++;
      const adapter = jurisdictionAdapters[s.jurisdiction_code || "US"] || jurisdictionAdapters.US;
      ex.exposure += (s.risk_score / 100) * s.declared_value * (adapter.avgPenaltyPercent / 100);
      if (s.status === "customs_hold") ex.holds++;
      months.set(key, ex);
    });
    return Array.from(months.values());
  }, [brokerShipments]);

  // Lane performance
  const lanePerf = useMemo(() => {
    const lanes = new Map<string, { lane: string; count: number; avgRisk: number }>();
    brokerShipments.forEach((s) => {
      const lane = `${s.origin_country || "??"} → ${s.destination_country || "??"}`;
      const ex = lanes.get(lane) || { lane, count: 0, avgRisk: 0 };
      ex.count++;
      ex.avgRisk += s.risk_score;
      lanes.set(lane, ex);
    });
    return Array.from(lanes.values())
      .map((l) => ({ ...l, avgRisk: Math.round(l.avgRisk / l.count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [brokerShipments]);

  if (!broker) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-mono text-sm">LOADING BROKER PROFILE...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/brokers" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <Users size={18} className="text-primary" />
          <div>
            <h1 className="text-lg font-bold">{broker.canonical_name}</h1>
            <p className="text-[10px] font-mono text-muted-foreground">
              {broker.broker_type} · {broker.region || "Global"}
            </p>
          </div>
          <Badge variant="outline" className={`ml-2 text-[9px] ${WATCHLIST_COLORS[broker.watchlist_tag || "none"]}`}>
            {broker.watchlist_tag || "none"}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "SHIPMENTS", value: stats.total, color: "text-primary" },
            { label: "HOLD RATE", value: `${stats.holdRate}%`, color: stats.holdRate > 20 ? "text-destructive" : "text-risk-safe" },
            { label: "HOLDS", value: stats.holds, color: "text-risk-medium" },
            { label: "EXPOSURE", value: `$${stats.exposure.toLocaleString()}`, color: "text-destructive" },
            { label: "RESOLVED", value: `$${stats.resolved.toLocaleString()}`, color: "text-risk-safe" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="font-mono text-[9px] text-muted-foreground">{kpi.label}</p>
              <p className={`font-mono text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="trends">
          <TabsList className="bg-secondary/50 border border-border flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="trends" className="font-mono text-xs">TRENDS</TabsTrigger>
            <TabsTrigger value="shipments" className="font-mono text-xs">SHIPMENTS</TabsTrigger>
            <TabsTrigger value="lanes" className="font-mono text-xs">LANES</TabsTrigger>
            <TabsTrigger value="audit" className="font-mono text-xs">AUDIT TRAIL</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-mono text-xs text-muted-foreground mb-4">RISK TREND OVER TIME</h3>
              {trendData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No historical data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 25%, 16%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)" }} />
                    <Tooltip contentStyle={{ background: "hsl(222, 40%, 9%)", border: "1px solid hsl(222, 25%, 16%)", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="shipments" stroke="hsl(210, 100%, 56%)" fill="hsl(210, 100%, 56%, 0.2)" name="Shipments" />
                    <Area type="monotone" dataKey="holds" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%, 0.2)" name="Holds" />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          <TabsContent value="shipments" className="mt-4">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left p-3 font-mono text-xs text-muted-foreground">SHIPMENT</th>
                    <th className="text-center p-3 font-mono text-xs text-muted-foreground">RISK</th>
                    <th className="text-right p-3 font-mono text-xs text-muted-foreground">VALUE</th>
                    <th className="p-3 font-mono text-xs text-muted-foreground">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {brokerShipments.slice(0, 50).map((s) => (
                    <tr key={s.id} className="border-t border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="p-3">
                        <Link to={`/shipment/${s.shipment_id}`} className="font-mono text-xs text-primary hover:underline">
                          {s.shipment_id}
                        </Link>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                          s.risk_score >= 85 ? "bg-destructive/20 text-destructive" :
                          s.risk_score >= 60 ? "bg-risk-medium/20 text-risk-medium" :
                          "bg-risk-safe/20 text-risk-safe"
                        }`}>{s.risk_score}</span>
                      </td>
                      <td className="p-3 text-right font-mono">${s.declared_value.toLocaleString()}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={`font-mono text-[10px] ${getStatusColor(s.status)}`}>
                          {getStatusLabel(s.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {brokerShipments.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No shipments linked.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="lanes" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-mono text-xs text-muted-foreground mb-4">LANE PERFORMANCE</h3>
              {lanePerf.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No lane data available.</p>
              ) : (
                <div className="space-y-2">
                  {lanePerf.map((l) => (
                    <div key={l.lane} className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border">
                      <span className="font-mono text-xs">{l.lane}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">{l.count} shipments</span>
                        <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                          l.avgRisk >= 85 ? "bg-destructive/20 text-destructive" :
                          l.avgRisk >= 60 ? "bg-risk-medium/20 text-risk-medium" :
                          "bg-risk-safe/20 text-risk-safe"
                        }`}>avg {l.avgRisk}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-mono text-xs text-muted-foreground mb-4">EVENT AUDIT TRAIL</h3>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No events recorded.</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 30).map((e: any) => (
                    <div key={e.id} className="flex items-start gap-3 p-3 rounded-md bg-secondary/30 border border-border">
                      <div className="w-2 h-2 rounded-full mt-1.5 bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-medium">{e.event_type.replace(/_/g, " ")}</span>
                          {e.evidence_quality && (
                            <span className={`text-[9px] font-mono ${
                              e.evidence_quality === "confirmed" ? "text-risk-safe" :
                              e.evidence_quality === "inferred" ? "text-risk-medium" :
                              "text-muted-foreground"
                            }`}>
                              [{e.evidence_quality}]
                            </span>
                          )}
                          {e.attribution && e.attribution !== "unknown" && (
                            <Badge variant="outline" className="text-[9px]">{e.attribution}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-1">
                          {new Date(e.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
