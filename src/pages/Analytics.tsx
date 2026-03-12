import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingDown, Shield, AlertTriangle, DollarSign, BarChart3, Activity } from "lucide-react";
import { Shipment } from "@/types/orchestra";
import { jurisdictionAdapters } from "@/lib/jurisdictions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const CHART_COLORS = [
  "hsl(210, 100%, 56%)",
  "hsl(0, 72%, 51%)",
  "hsl(45, 93%, 47%)",
  "hsl(142, 71%, 45%)",
  "hsl(25, 95%, 53%)",
  "hsl(280, 65%, 60%)",
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30d");

  const { data: shipments = [] } = useQuery({
    queryKey: ["shipments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as Shipment[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["all-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipment_events").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const critical = shipments.filter((s) => s.risk_score >= 85);
    const flagged = shipments.filter((s) => s.status === "flagged" || s.status === "customs_hold");
    const cleared = shipments.filter((s) => s.status === "cleared" || s.status === "closed_avoided");
    const corrected = shipments.filter((s) => s.status === "corrected" || s.status === "closed_avoided");

    let totalExposure = 0;
    let totalAvoided = 0;
    shipments.forEach((s) => {
      const adapter = jurisdictionAdapters[(s as any).jurisdiction_code || "US"] || jurisdictionAdapters.US;
      const exposure = (s.risk_score / 100) * s.declared_value * (adapter.avgPenaltyPercent / 100);
      totalExposure += exposure;
      if (s.status === "cleared" || s.status === "corrected" || s.status === "closed_avoided") {
        totalAvoided += exposure * 0.7;
      }
    });

    return {
      totalShipments: shipments.length,
      criticalCount: critical.length,
      flaggedCount: flagged.length,
      clearedCount: cleared.length,
      correctedCount: corrected.length,
      totalExposure,
      totalAvoided,
      avgAvoidedPerShipment: corrected.length > 0 ? totalAvoided / corrected.length : 0,
      holdsPrevented: corrected.length,
      finesPrevented: corrected.filter((s) => s.risk_score >= 60).length,
    };
  }, [shipments]);

  // Trend data by month
  const trendData = useMemo(() => {
    const months = new Map<string, { month: string; shipments: number; exposure: number; avoided: number; critical: number }>();
    shipments.forEach((s) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const existing = months.get(key) || { month: label, shipments: 0, exposure: 0, avoided: 0, critical: 0 };
      existing.shipments++;
      const adapter = getJurisdictionAdapter((s as any).jurisdiction_code || "US");
      const exp = (s.risk_score / 100) * s.declared_value * (adapter.penaltyPercent / 100);
      existing.exposure += exp;
      if (s.status === "cleared" || s.status === "corrected" || s.status === "closed_avoided") {
        existing.avoided += exp * 0.7;
      }
      if (s.risk_score >= 85) existing.critical++;
      months.set(key, existing);
    });
    return Array.from(months.values());
  }, [shipments]);

  // Risk distribution
  const riskDistribution = useMemo(() => {
    const buckets = [
      { name: "Safe (0-29)", value: 0 },
      { name: "Low (30-59)", value: 0 },
      { name: "Medium (60-84)", value: 0 },
      { name: "Critical (85+)", value: 0 },
    ];
    shipments.forEach((s) => {
      if (s.risk_score < 30) buckets[0].value++;
      else if (s.risk_score < 60) buckets[1].value++;
      else if (s.risk_score < 85) buckets[2].value++;
      else buckets[3].value++;
    });
    return buckets;
  }, [shipments]);

  // Top error categories from events
  const errorCategories = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach((e: any) => {
      const type = e.event_type || "unknown";
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name: name.replace(/_/g, " "), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [events]);

  // Broker leaderboard
  const brokerLeaderboard = useMemo(() => {
    const brokerMap = new Map<string, { broker: string; shipments: number; exposure: number; holds: number; errors: number }>();
    shipments.forEach((s) => {
      const broker = (s as any).assigned_broker || "Unassigned";
      const existing = brokerMap.get(broker) || { broker, shipments: 0, exposure: 0, holds: 0, errors: 0 };
      existing.shipments++;
      const adapter = getJurisdictionAdapter((s as any).jurisdiction_code || "US");
      existing.exposure += (s.risk_score / 100) * s.declared_value * (adapter.penaltyPercent / 100);
      if (s.status === "customs_hold") existing.holds++;
      if (s.risk_score >= 60) existing.errors++;
      brokerMap.set(broker, existing);
    });
    return Array.from(brokerMap.values()).sort((a, b) => b.exposure - a.exposure).slice(0, 10);
  }, [shipments]);

  // Lane risk
  const laneRisk = useMemo(() => {
    const laneMap = new Map<string, { lane: string; shipments: number; avgRisk: number; totalExposure: number; holds: number }>();
    shipments.forEach((s) => {
      const origin = (s as any).origin_country || "??";
      const dest = (s as any).destination_country || "??";
      const lane = `${origin} → ${dest}`;
      const existing = laneMap.get(lane) || { lane, shipments: 0, avgRisk: 0, totalExposure: 0, holds: 0 };
      existing.shipments++;
      existing.avgRisk += s.risk_score;
      const adapter = getJurisdictionAdapter((s as any).jurisdiction_code || "US");
      existing.totalExposure += (s.risk_score / 100) * s.declared_value * (adapter.penaltyPercent / 100);
      if (s.status === "customs_hold") existing.holds++;
      laneMap.set(lane, existing);
    });
    return Array.from(laneMap.values())
      .map((l) => ({ ...l, avgRisk: Math.round(l.avgRisk / l.shipments) }))
      .sort((a, b) => b.totalExposure - a.totalExposure)
      .slice(0, 12);
  }, [shipments]);

  const kpiCards = [
    { label: "TOTAL EXPOSURE", value: `$${Math.round(stats.totalExposure).toLocaleString()}`, icon: AlertTriangle, color: "text-destructive" },
    { label: "EXPOSURE AVOIDED", value: `$${Math.round(stats.totalAvoided).toLocaleString()}`, icon: Shield, color: "text-risk-safe" },
    { label: "AVG AVOIDED / SHIPMENT", value: `$${Math.round(stats.avgAvoidedPerShipment).toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: "HOLDS PREVENTED", value: stats.holdsPrevented, icon: TrendingDown, color: "text-risk-safe" },
    { label: "FINES PREVENTED", value: stats.finesPrevented, icon: Shield, color: "text-primary" },
    { label: "CRITICAL SHIPMENTS", value: stats.criticalCount, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <BarChart3 size={18} className="text-primary" />
            <h1 className="text-lg font-bold">Executive ROI Dashboard</h1>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px] bg-secondary/50 text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border bg-card p-4 glow-blue">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] text-muted-foreground tracking-wider">{kpi.label}</span>
                <kpi.icon size={12} className={kpi.color} />
              </div>
              <p className={`text-xl font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="trends">
          <TabsList className="bg-secondary/50 border border-border flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="trends" className="font-mono text-xs">TRENDS</TabsTrigger>
            <TabsTrigger value="risk" className="font-mono text-xs">RISK DIST</TabsTrigger>
            <TabsTrigger value="errors" className="font-mono text-xs">ERROR CATEGORIES</TabsTrigger>
            <TabsTrigger value="brokers" className="font-mono text-xs">BROKER LEADERBOARD</TabsTrigger>
            <TabsTrigger value="lanes" className="font-mono text-xs">LANE RISK</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="mt-4 space-y-6">
            {/* Exposure Trend */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-mono text-xs text-muted-foreground mb-4">EXPOSURE vs AVOIDED OVER TIME</h3>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 25%, 16%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(222, 40%, 9%)", border: "1px solid hsl(222, 25%, 16%)", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(210, 20%, 90%)" }}
                    formatter={(value: number) => [`$${Math.round(value).toLocaleString()}`, ""]}
                  />
                  <Area type="monotone" dataKey="exposure" stackId="1" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%, 0.2)" name="Exposure" />
                  <Area type="monotone" dataKey="avoided" stackId="2" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%, 0.2)" name="Avoided" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Shipment Volume */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-mono text-xs text-muted-foreground mb-4">SHIPMENT VOLUME & CRITICAL ALERTS</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 25%, 16%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)" }} />
                  <Tooltip contentStyle={{ background: "hsl(222, 40%, 9%)", border: "1px solid hsl(222, 25%, 16%)", borderRadius: 8 }} />
                  <Bar dataKey="shipments" fill="hsl(210, 100%, 56%)" name="Shipments" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="critical" fill="hsl(0, 72%, 51%)" name="Critical" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="risk" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-mono text-xs text-muted-foreground mb-4">RISK SCORE DISTRIBUTION</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={riskDistribution} cx="50%" cy="50%" outerRadius={120} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {riskDistribution.map((_, i) => (
                      <Cell key={i} fill={[CHART_COLORS[3], CHART_COLORS[0], CHART_COLORS[2], CHART_COLORS[1]][i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="errors" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-mono text-xs text-muted-foreground mb-4">TOP RECURRING ERROR CATEGORIES</h3>
              {errorCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No events recorded yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={errorCategories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 25%, 16%)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)" }} width={140} />
                    <Tooltip contentStyle={{ background: "hsl(222, 40%, 9%)", border: "1px solid hsl(222, 25%, 16%)", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="hsl(25, 95%, 53%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          <TabsContent value="brokers" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-mono text-xs text-muted-foreground mb-4">BROKER EXPOSURE LEADERBOARD</h3>
              <div className="space-y-2">
                {brokerLeaderboard.map((b, i) => (
                  <div key={b.broker} className="flex items-center gap-3 p-3 rounded-md bg-secondary/30 border border-border">
                    <span className="font-mono text-xs text-muted-foreground w-6">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{b.broker}</p>
                      <p className="text-xs text-muted-foreground">{b.shipments} shipments · {b.holds} holds · {b.errors} flagged</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-destructive">${Math.round(b.exposure).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">exposure</p>
                    </div>
                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-destructive rounded-full"
                        style={{ width: `${Math.min(100, (b.exposure / (brokerLeaderboard[0]?.exposure || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {brokerLeaderboard.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No broker data available.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lanes" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-mono text-xs text-muted-foreground mb-4">LANE RISK INTELLIGENCE</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-mono text-xs text-muted-foreground">LANE</th>
                      <th className="text-center py-2 font-mono text-xs text-muted-foreground">SHIPMENTS</th>
                      <th className="text-center py-2 font-mono text-xs text-muted-foreground">AVG RISK</th>
                      <th className="text-center py-2 font-mono text-xs text-muted-foreground">HOLDS</th>
                      <th className="text-right py-2 font-mono text-xs text-muted-foreground">EXPOSURE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laneRisk.map((l) => (
                      <tr key={l.lane} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="py-2 font-mono text-xs">{l.lane}</td>
                        <td className="py-2 text-center font-mono">{l.shipments}</td>
                        <td className="py-2 text-center">
                          <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                            l.avgRisk >= 85 ? "bg-destructive/20 text-destructive" :
                            l.avgRisk >= 60 ? "bg-risk-medium/20 text-risk-medium" :
                            "bg-risk-safe/20 text-risk-safe"
                          }`}>
                            {l.avgRisk}
                          </span>
                        </td>
                        <td className="py-2 text-center font-mono">{l.holds}</td>
                        <td className="py-2 text-right font-mono text-destructive">${Math.round(l.totalExposure).toLocaleString()}</td>
                      </tr>
                    ))}
                    {laneRisk.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">No lane data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
