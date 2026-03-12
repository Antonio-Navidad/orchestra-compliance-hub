import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, Shield, AlertTriangle, BarChart3, ArrowUpDown, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jurisdictionAdapters } from "@/lib/jurisdictions";
import { Shipment } from "@/types/orchestra";

const WATCHLIST_COLORS: Record<string, string> = {
  preferred: "bg-risk-safe/20 text-risk-safe border-risk-safe/30",
  strategic: "bg-primary/20 text-primary border-primary/30",
  "under review": "bg-risk-medium/20 text-risk-medium border-risk-medium/30",
  probation: "bg-risk-high/20 text-risk-high border-risk-high/30",
  "high-risk": "bg-destructive/20 text-destructive border-destructive/30",
  none: "bg-muted text-muted-foreground border-border",
};

const EVIDENCE_ICONS: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "text-risk-safe" },
  inferred: { label: "Inferred", color: "text-risk-medium" },
  "user-entered": { label: "User-entered", color: "text-primary" },
  unverified: { label: "Unverified", color: "text-muted-foreground" },
};

interface BrokerRecord {
  id: string;
  canonical_name: string;
  aliases: string[];
  broker_type: string;
  region: string | null;
  office: string | null;
  watchlist_tag: string | null;
  notes: string | null;
}

interface BrokerKPI {
  broker: BrokerRecord;
  shipmentsHandled: number;
  holdRate: number;
  docMismatchRate: number;
  hsCorrections: number;
  avgDelayDays: number;
  exposureGenerated: number;
  exposureResolved: number;
  holds: number;
  errors: number;
  evidenceBreakdown: Record<string, number>;
}

export default function BrokerScorecard() {
  const [sortBy, setSortBy] = useState("exposure");
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brokers").select("*");
      if (error) throw error;
      return data as unknown as BrokerRecord[];
    },
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ["shipments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("*");
      if (error) throw error;
      return data as unknown as (Shipment & { broker_id?: string; jurisdiction_code?: string; assigned_broker?: string })[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["all-events-broker"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipment_events").select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const kpis: BrokerKPI[] = useMemo(() => {
    return brokers.map((broker) => {
      const brokerShipments = shipments.filter(
        (s) => s.broker_id === broker.id || s.assigned_broker === broker.canonical_name ||
               broker.aliases.some((a) => a.toLowerCase() === (s.assigned_broker || "").toLowerCase())
      );
      const brokerEvents = events.filter((e) => e.broker_id === broker.id);

      const holds = brokerShipments.filter((s) => s.status === "customs_hold").length;
      const mismatchEvents = brokerEvents.filter((e) => e.event_type === "document_mismatch" || e.event_type === "doc_mismatch_detected");
      const hsCorrections = brokerEvents.filter((e) => e.event_type === "hs_code_changed" || e.event_type === "low_confidence_hs");

      let exposureGenerated = 0;
      let exposureResolved = 0;
      brokerShipments.forEach((s) => {
        const adapter = jurisdictionAdapters[s.jurisdiction_code || "US"] || jurisdictionAdapters.US;
        const exp = (s.risk_score / 100) * s.declared_value * (adapter.avgPenaltyPercent / 100);
        exposureGenerated += exp;
        if (s.status === "cleared" || s.status === "corrected" || s.status === "closed_avoided") {
          exposureResolved += exp * 0.7;
        }
      });

      const evidenceBreakdown: Record<string, number> = { confirmed: 0, inferred: 0, "user-entered": 0, unverified: 0 };
      brokerEvents.forEach((e) => {
        const q = e.evidence_quality || "unverified";
        if (evidenceBreakdown[q] !== undefined) evidenceBreakdown[q]++;
      });

      return {
        broker,
        shipmentsHandled: brokerShipments.length,
        holdRate: brokerShipments.length > 0 ? Math.round((holds / brokerShipments.length) * 100) : 0,
        docMismatchRate: brokerShipments.length > 0 ? Math.round((mismatchEvents.length / brokerShipments.length) * 100) : 0,
        hsCorrections: hsCorrections.length,
        avgDelayDays: 0,
        exposureGenerated: Math.round(exposureGenerated),
        exposureResolved: Math.round(exposureResolved),
        holds,
        errors: mismatchEvents.length,
        evidenceBreakdown,
      };
    });
  }, [brokers, shipments, events]);

  const sorted = useMemo(() => {
    return [...kpis].sort((a, b) => {
      switch (sortBy) {
        case "exposure": return b.exposureGenerated - a.exposureGenerated;
        case "holds": return b.holdRate - a.holdRate;
        case "shipments": return b.shipmentsHandled - a.shipmentsHandled;
        case "name": return a.broker.canonical_name.localeCompare(b.broker.canonical_name);
        default: return 0;
      }
    });
  }, [kpis, sortBy]);

  const comparing = compareIds.length >= 2 ? kpis.filter((k) => compareIds.includes(k.broker.id)) : [];

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <Users size={18} className="text-primary" />
            <h1 className="text-lg font-bold">Broker / Forwarder Scorecard</h1>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown size={12} className="text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px] bg-secondary/50 text-xs font-mono h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exposure">By Exposure</SelectItem>
                <SelectItem value="holds">By Hold Rate</SelectItem>
                <SelectItem value="shipments">By Volume</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="scorecards">
          <TabsList className="bg-secondary/50 border border-border">
            <TabsTrigger value="scorecards" className="font-mono text-xs">SCORECARDS</TabsTrigger>
            <TabsTrigger value="compare" className="font-mono text-xs">
              COMPARE {compareIds.length >= 2 && `(${compareIds.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scorecards" className="mt-4 space-y-3">
            {sorted.length === 0 && (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <Users size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No brokers registered yet. Add brokers from Admin settings.</p>
              </div>
            )}
            {sorted.map((kpi) => (
              <div key={kpi.broker.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(kpi.broker.id)}
                      onChange={() => toggleCompare(kpi.broker.id)}
                      className="rounded border-border"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/broker/${kpi.broker.id}`}
                          className="text-sm font-semibold hover:text-primary transition-colors"
                        >
                          {kpi.broker.canonical_name}
                        </Link>
                        <Badge variant="outline" className={`text-[9px] ${WATCHLIST_COLORS[kpi.broker.watchlist_tag || "none"]}`}>
                          {kpi.broker.watchlist_tag || "none"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {kpi.broker.broker_type} · {kpi.broker.region || "Global"}
                        {kpi.broker.aliases.length > 0 && ` · ${kpi.broker.aliases.length} aliases`}
                      </p>
                    </div>
                  </div>

                  {/* Evidence quality badges */}
                  <div className="flex gap-1.5">
                    {Object.entries(kpi.evidenceBreakdown)
                      .filter(([, v]) => v > 0)
                      .map(([quality, count]) => (
                        <span key={quality} className={`text-[9px] font-mono ${EVIDENCE_ICONS[quality]?.color}`}>
                          {count} {EVIDENCE_ICONS[quality]?.label}
                        </span>
                      ))}
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                  <div className="text-center">
                    <p className="font-mono text-[9px] text-muted-foreground">SHIPMENTS</p>
                    <p className="font-mono text-lg font-bold">{kpi.shipmentsHandled}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-[9px] text-muted-foreground">HOLD RATE</p>
                    <p className={`font-mono text-lg font-bold ${kpi.holdRate > 20 ? "text-destructive" : kpi.holdRate > 10 ? "text-risk-medium" : "text-risk-safe"}`}>
                      {kpi.holdRate}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-[9px] text-muted-foreground">DOC ERRORS</p>
                    <p className={`font-mono text-lg font-bold ${kpi.docMismatchRate > 15 ? "text-destructive" : "text-foreground"}`}>
                      {kpi.docMismatchRate}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-[9px] text-muted-foreground">EXPOSURE</p>
                    <p className="font-mono text-lg font-bold text-destructive">${kpi.exposureGenerated.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-[9px] text-muted-foreground">RESOLVED</p>
                    <p className="font-mono text-lg font-bold text-risk-safe">${kpi.exposureResolved.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="compare" className="mt-4">
            {comparing.length < 2 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <BarChart3 size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Select 2-3 brokers from the scorecard tab to compare.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 font-mono text-xs text-muted-foreground">METRIC</th>
                      {comparing.map((k) => (
                        <th key={k.broker.id} className="text-center py-3 font-mono text-xs text-muted-foreground">
                          {k.broker.canonical_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Shipments", key: "shipmentsHandled" },
                      { label: "Hold Rate", key: "holdRate", suffix: "%" },
                      { label: "Doc Error Rate", key: "docMismatchRate", suffix: "%" },
                      { label: "HS Corrections", key: "hsCorrections" },
                      { label: "Exposure Generated", key: "exposureGenerated", prefix: "$" },
                      { label: "Exposure Resolved", key: "exposureResolved", prefix: "$" },
                      { label: "Holds", key: "holds" },
                    ].map((metric) => (
                      <tr key={metric.label} className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground">{metric.label}</td>
                        {comparing.map((k) => {
                          const val = (k as any)[metric.key];
                          return (
                            <td key={k.broker.id} className="py-2 text-center font-mono">
                              {metric.prefix || ""}{typeof val === "number" ? val.toLocaleString() : val}{metric.suffix || ""}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="border-b border-border/50">
                      <td className="py-2 text-muted-foreground">Watchlist</td>
                      {comparing.map((k) => (
                        <td key={k.broker.id} className="py-2 text-center">
                          <Badge variant="outline" className={`text-[9px] ${WATCHLIST_COLORS[k.broker.watchlist_tag || "none"]}`}>
                            {k.broker.watchlist_tag || "none"}
                          </Badge>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
