import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap, Loader2, ArrowLeft, ShieldCheck, AlertTriangle, Clock, DollarSign,
  TrendingUp, TrendingDown, CheckCircle, XCircle, Info, Target, BarChart3,
  RefreshCw, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { Shipment, Invoice, Manifest } from "@/types/orchestra";

interface Scenario {
  label: string;
  rank: number;
  routeSummary: string;
  landedCost: string;
  arrivalWindow: string;
  holdProbability: number;
  docRisk: string;
  complianceRisk: string;
  complexityScore: number;
  explanation: string;
}

interface Correction {
  priority: number;
  action: string;
  impact: string;
  category: string;
}

interface RiskFactor {
  factor: string;
  severity: string;
  description: string;
}

interface DecisionTwinResult {
  readinessScore: number;
  readinessState: string;
  clearanceProbability: number;
  delayProbability: number;
  holdProbability: number;
  predictedLandedCost: string;
  predictedArrival: string;
  etaConfidence: number;
  mostLikelyFailurePoint: string;
  topRecommendation: string;
  bestAlternate: string;
  reasoning: string;
  scenarios: Scenario[];
  corrections: Correction[];
  riskFactors: RiskFactor[];
  confidenceDrivers: string[];
}

const stateConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  ready_to_proceed: { label: "READY TO PROCEED", color: "text-risk-low", bg: "bg-risk-low/10 border-risk-low/30", icon: CheckCircle },
  proceed_with_caution: { label: "PROCEED WITH CAUTION", color: "text-risk-medium", bg: "bg-risk-medium/10 border-risk-medium/30", icon: AlertTriangle },
  revise_before_dispatch: { label: "REVISE BEFORE DISPATCH", color: "text-risk-high", bg: "bg-risk-high/10 border-risk-high/30", icon: AlertTriangle },
  escalate_for_review: { label: "ESCALATE FOR REVIEW", color: "text-risk-high", bg: "bg-risk-high/10 border-risk-high/30", icon: XCircle },
  high_risk_do_not_proceed: { label: "HIGH RISK — DO NOT PROCEED", color: "text-risk-critical", bg: "bg-risk-critical/10 border-risk-critical/30", icon: XCircle },
};

const riskColor = (s: string) => {
  if (s === "critical") return "text-risk-critical";
  if (s === "high") return "text-risk-high";
  if (s === "medium") return "text-risk-medium";
  return "text-risk-low";
};

const categoryIcon: Record<string, string> = {
  risk_reduction: "🛡️",
  speed_improvement: "⚡",
  cost_reduction: "💰",
  compliance: "📋",
  documentation: "📄",
};

function ProbabilityGauge({ label, value, icon: Icon, invert }: { label: string; value: number; icon: any; invert?: boolean }) {
  const color = invert
    ? (value >= 70 ? "text-risk-critical" : value >= 40 ? "text-risk-medium" : "text-risk-low")
    : (value >= 70 ? "text-risk-low" : value >= 40 ? "text-risk-medium" : "text-risk-critical");
  return (
    <div className="text-center space-y-1">
      <Icon size={16} className={`mx-auto ${color}`} />
      <p className={`text-2xl font-bold font-mono ${color}`}>{value}%</p>
      <p className="text-[10px] font-mono text-muted-foreground">{label}</p>
    </div>
  );
}

export default function DecisionTwin() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecisionTwinResult | null>(null);

  const { data: shipment } = useQuery({
    queryKey: ["shipment", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("*").eq("shipment_id", id).single();
      if (error) throw error;
      return data as unknown as Shipment & Record<string, any>;
    },
    enabled: !!id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").eq("shipment_id", id);
      if (error) throw error;
      return data as unknown as Invoice[];
    },
    enabled: !!id,
  });

  const { data: manifests = [] } = useQuery({
    queryKey: ["manifests", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("manifests").select("*").eq("shipment_id", id);
      if (error) throw error;
      return data as unknown as Manifest[];
    },
    enabled: !!id,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["shipment-docs-twin", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipment_documents" as any).select("*").eq("shipment_id", id).eq("is_current", true);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const runAnalysis = async () => {
    if (!shipment) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("decision-twin", {
        body: { shipment, invoices, manifests, documents: docs, mode: "enterprise" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success("Decision Twin analysis complete");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  if (!shipment) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 size={32} className="mx-auto animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground font-mono">Loading shipment data...</p>
      </div>
    );
  }

  const sc = result ? stateConfig[result.readinessState] || stateConfig.proceed_with_caution : null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/shipment/${id}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold font-mono flex items-center gap-2">
              <Zap size={20} className="text-primary" /> DECISION TWIN
            </h1>
            <p className="text-xs text-muted-foreground font-mono">{shipment.shipment_id} · {shipment.description}</p>
          </div>
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="font-mono">
          {loading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <RefreshCw size={14} className="mr-2" />}
          {loading ? "ANALYZING..." : result ? "RE-ANALYZE" : "RUN ANALYSIS"}
        </Button>
      </div>

      {!result && !loading && (
        <Card className="border-border bg-card">
          <CardContent className="py-20 text-center">
            <Zap size={48} className="mx-auto text-primary/30 mb-4" />
            <h2 className="text-lg font-bold mb-2">Shipment Decision Twin</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              AI will simulate shipment outcomes, generate scenarios, predict probabilities, and prescribe the best actions before dispatch.
            </p>
            <Button onClick={runAnalysis} size="lg" className="font-mono">
              <Zap size={16} className="mr-2" /> RUN DECISION ANALYSIS
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="border-border bg-card">
          <CardContent className="py-20 text-center">
            <Loader2 size={48} className="mx-auto text-primary animate-spin mb-4" />
            <p className="font-mono text-sm text-muted-foreground">Simulating shipment outcomes...</p>
            <p className="text-xs text-muted-foreground mt-1">Analyzing classification, documents, routes, compliance, and ETA</p>
          </CardContent>
        </Card>
      )}

      {result && sc && (
        <>
          {/* Readiness Banner */}
          <Card className={`border ${sc.bg}`}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <sc.icon size={28} className={sc.color} />
                <div>
                  <p className={`text-lg font-bold font-mono ${sc.color}`}>{sc.label}</p>
                  <p className="text-xs text-muted-foreground">Overall Readiness Score</p>
                </div>
                <div className="ml-auto text-right">
                  <p className={`text-4xl font-bold font-mono ${sc.color}`}>{result.readinessScore}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">/ 100</p>
                </div>
              </div>
              <Progress value={result.readinessScore} className="h-2" />
            </CardContent>
          </Card>

          {/* Probability Gauges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <ProbabilityGauge label="CLEARANCE" value={result.clearanceProbability} icon={ShieldCheck} />
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <ProbabilityGauge label="DELAY RISK" value={result.delayProbability} icon={Clock} invert />
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <ProbabilityGauge label="HOLD RISK" value={result.holdProbability} icon={AlertTriangle} invert />
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <ProbabilityGauge label="ETA CONFIDENCE" value={result.etaConfidence} icon={Target} />
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] font-mono text-muted-foreground">PREDICTED LANDED COST</p>
                <p className="text-lg font-bold font-mono mt-1">{result.predictedLandedCost}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] font-mono text-muted-foreground">PREDICTED ARRIVAL</p>
                <p className="text-lg font-bold font-mono mt-1">{result.predictedArrival}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] font-mono text-muted-foreground">BIGGEST RISK</p>
                <p className="text-sm font-semibold mt-1 text-risk-high">{result.mostLikelyFailurePoint}</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] font-mono text-primary mb-1">TOP RECOMMENDATION</p>
                <p className="text-sm font-semibold">{result.topRecommendation}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] font-mono text-muted-foreground mb-1">BEST ALTERNATE</p>
                <p className="text-sm">{result.bestAlternate}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="scenarios" className="w-full">
            <TabsList className="bg-secondary/50 border border-border flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="scenarios" className="font-mono text-xs">SCENARIOS</TabsTrigger>
              <TabsTrigger value="corrections" className="font-mono text-xs">CORRECTIONS</TabsTrigger>
              <TabsTrigger value="risks" className="font-mono text-xs">RISK FACTORS</TabsTrigger>
              <TabsTrigger value="reasoning" className="font-mono text-xs">REASONING</TabsTrigger>
            </TabsList>

            <TabsContent value="scenarios" className="mt-4 space-y-4">
              {result.scenarios.sort((a, b) => a.rank - b.rank).map((s, i) => (
                <Card key={i} className={`border-border bg-card ${i === 0 ? "ring-1 ring-primary/30" : ""}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Badge className="bg-primary/20 text-primary text-[10px] font-mono">RECOMMENDED</Badge>}
                        <h3 className="font-mono text-sm font-bold">{s.label}</h3>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">Rank #{s.rank}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{s.routeSummary}</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground font-mono">LANDED COST</p>
                        <p className="font-mono font-semibold">{s.landedCost}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-mono">ARRIVAL</p>
                        <p className="font-mono font-semibold">{s.arrivalWindow}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-mono">HOLD PROB</p>
                        <p className={`font-mono font-semibold ${s.holdProbability > 50 ? "text-risk-critical" : s.holdProbability > 25 ? "text-risk-medium" : "text-risk-low"}`}>{s.holdProbability}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-mono">DOC RISK</p>
                        <Badge variant="outline" className={`text-[10px] ${riskColor(s.docRisk)}`}>{s.docRisk.toUpperCase()}</Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-mono">COMPLEXITY</p>
                        <p className="font-mono font-semibold">{s.complexityScore}/10</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 italic">{s.explanation}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="corrections" className="mt-4 space-y-3">
              {result.corrections.sort((a, b) => a.priority - b.priority).map((c, i) => (
                <Card key={i} className="border-border bg-card">
                  <CardContent className="pt-3 pb-3 flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-mono font-bold text-primary">
                      {c.priority}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{categoryIcon[c.category] || "📌"}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{c.category.replace(/_/g, " ").toUpperCase()}</Badge>
                      </div>
                      <p className="text-sm font-semibold">{c.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.impact}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="risks" className="mt-4 space-y-3">
              {result.riskFactors.map((r, i) => (
                <Card key={i} className="border-border bg-card">
                  <CardContent className="pt-3 pb-3 flex items-start gap-3">
                    <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${riskColor(r.severity)}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{r.factor}</span>
                        <Badge variant="outline" className={`text-[10px] font-mono ${riskColor(r.severity)}`}>{r.severity.toUpperCase()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="reasoning" className="mt-4 space-y-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-mono text-muted-foreground">AI REASONING</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{result.reasoning}</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-mono text-muted-foreground">CONFIDENCE DRIVERS</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.confidenceDrivers.map((d, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <Info size={12} className="text-primary shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
