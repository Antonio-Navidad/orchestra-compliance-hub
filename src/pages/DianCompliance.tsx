import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Flag, ShieldAlert, AlertTriangle, FileWarning, DollarSign,
  FileText, Loader2, Zap, CheckCircle2, XCircle, Info, RefreshCw
} from "lucide-react";

type Issue = {
  shipment_id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  dian_reference?: string;
  confidence: number;
};

type AnalysisResult = {
  issues: Issue[];
  summary: {
    total_issues: number;
    critical_count: number;
    high_count: number;
    overall_risk: string;
    top_recommendation: string;
  };
};

const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  likely_hold: { label: "Likely Hold", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  likely_rejection: { label: "Likely Rejection", icon: <XCircle className="h-3.5 w-3.5" /> },
  missing_fields: { label: "Missing Fields", icon: <FileWarning className="h-3.5 w-3.5" /> },
  valuation_mismatch: { label: "Valuation Mismatch", icon: <DollarSign className="h-3.5 w-3.5" /> },
  packet_inconsistency: { label: "Packet Inconsistency", icon: <FileText className="h-3.5 w-3.5" /> },
  tariff_error: { label: "Tariff Error", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  certificate_missing: { label: "Certificate Missing", icon: <FileWarning className="h-3.5 w-3.5" /> },
  iva_issue: { label: "IVA Issue", icon: <DollarSign className="h-3.5 w-3.5" /> },
};

const severityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-muted text-muted-foreground",
};

const riskColors: Record<string, string> = {
  critical: "text-destructive",
  high: "text-orange-500",
  medium: "text-amber-500",
  low: "text-green-500",
};

export default function DianCompliance() {
  const [userRole, setUserRole] = useState("compliance_team");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("shipments")
        .select("*")
        .or("import_country.eq.CO,export_country.eq.CO,origin_country.eq.CO,destination_country.eq.CO,jurisdiction_code.eq.CO")
        .order("created_at", { ascending: false })
        .limit(50);
      setShipments(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const runAnalysis = async () => {
    if (shipments.length === 0) {
      toast.error("No Colombia-related shipments found");
      return;
    }
    setScanning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("dian-compliance", {
        body: { shipments: shipments.slice(0, 10), userRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success(`Analysis complete: ${data.summary.total_issues} issues found`);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setScanning(false);
    }
  };

  const filteredIssues = result?.issues.filter(
    (i) => filterSeverity === "all" || i.severity === filterSeverity
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Flag className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">DIAN / Colombia Compliance</h1>
            <p className="text-xs text-muted-foreground font-mono">CUSTOMS COMPLIANCE ENGINE FOR COLOMBIAN TRADE</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={userRole} onValueChange={setUserRole}>
            <SelectTrigger className="w-44 text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="importer">Importer</SelectItem>
              <SelectItem value="exporter">Exporter</SelectItem>
              <SelectItem value="customs_broker">Customs Broker</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
              <SelectItem value="compliance_team">Compliance Team</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runAnalysis} disabled={scanning || loading} className="font-mono text-xs">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            {scanning ? "SCANNING..." : "RUN DIAN ANALYSIS"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {result && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="py-3 text-center">
              <div className={`text-2xl font-bold ${riskColors[result.summary.overall_risk]}`}>
                {result.summary.overall_risk.toUpperCase()}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">OVERALL RISK</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold">{result.summary.total_issues}</div>
              <div className="text-[10px] text-muted-foreground font-mono">TOTAL ISSUES</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-destructive">{result.summary.critical_count}</div>
              <div className="text-[10px] text-muted-foreground font-mono">CRITICAL</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-orange-500">{result.summary.high_count}</div>
              <div className="text-[10px] text-muted-foreground font-mono">HIGH</div>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold">{shipments.length}</div>
              <div className="text-[10px] text-muted-foreground font-mono">CO SHIPMENTS</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top recommendation */}
      {result && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-mono text-primary mb-0.5">TOP RECOMMENDATION</div>
              <div className="text-sm">{result.summary.top_recommendation}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issue queue */}
      {result && (
        <Tabs defaultValue="issues">
          <div className="flex items-center justify-between">
            <TabsList className="font-mono text-xs">
              <TabsTrigger value="issues">Issue Queue ({filteredIssues.length})</TabsTrigger>
              <TabsTrigger value="by-category">By Category</TabsTrigger>
            </TabsList>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-32 text-xs h-7"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="issues" className="mt-4 space-y-2">
            {filteredIssues.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-mono">No issues found for this filter</p>
                </CardContent>
              </Card>
            )}
            {filteredIssues.map((issue, i) => (
              <Card key={i}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {categoryLabels[issue.category]?.icon || <AlertTriangle className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{issue.title}</span>
                        <Badge className={`text-[9px] ${severityColors[issue.severity]}`}>{issue.severity}</Badge>
                        <Badge variant="outline" className="text-[9px]">
                          {categoryLabels[issue.category]?.label || issue.category}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground ml-auto">{issue.shipment_id}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{issue.description}</p>
                      <div className="flex items-start gap-2 bg-muted/50 rounded p-2 mt-1">
                        <Zap className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-mono text-primary">AI RECOMMENDATION</div>
                          <div className="text-xs">{issue.recommendation}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Confidence: {issue.confidence}%</span>
                        {issue.dian_reference && <span>Ref: {issue.dian_reference}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="by-category" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(categoryLabels).map(([key, { label, icon }]) => {
                const count = result.issues.filter((i) => i.category === key).length;
                return (
                  <Card key={key} className={count > 0 ? "" : "opacity-50"}>
                    <CardContent className="py-3 flex items-center gap-3">
                      {icon}
                      <div className="flex-1">
                        <div className="text-xs font-medium">{label}</div>
                        <Progress value={count > 0 ? Math.min((count / result.issues.length) * 100, 100) : 0} className="h-1 mt-1" />
                      </div>
                      <span className="text-sm font-bold">{count}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state */}
      {!result && !scanning && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Flag className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <h3 className="font-mono text-sm text-muted-foreground">DIAN COMPLIANCE SCANNER</h3>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-md">
              Automatically scan Colombia-related shipments for DIAN compliance issues, value declaration mismatches, tariff errors, and missing documentation.
            </p>
            <p className="text-xs text-muted-foreground/40 mt-2 font-mono">
              {loading ? "Loading shipments..." : `${shipments.length} Colombia shipments found`}
            </p>
          </CardContent>
        </Card>
      )}

      {scanning && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-4" />
            <p className="font-mono text-sm text-muted-foreground">Analyzing shipments against DIAN regulations...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
