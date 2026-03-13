import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShipmentTable } from "@/components/ShipmentTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plane, Ship, Truck, AlertTriangle, ShieldCheck, Package, Layers, FileWarning, ClipboardCheck, TrendingDown, ClipboardList, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Shipment, TransportMode } from "@/types/orchestra";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { detectShipmentIssues, getIssueFrame, type DirectionContext } from "@/lib/issueFraming";
import { StartNewWorkflow } from "@/components/StartNewWorkflow";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskDot } from "@/components/RiskDot";
import { StatusBadge } from "@/components/StatusBadge";
import { getRiskLevel } from "@/lib/compliance";
import { ExportButton } from "@/components/ExportButton";
import { SHIPMENT_COLUMNS } from "@/lib/excelExport";

type DashboardView = 'inbound' | 'outbound' | 'combined';

export default function Dashboard() {
  const [activeMode, setActiveMode] = useState<string>("all");
  const [dashboardView, setDashboardView] = useState<DashboardView>("combined");
  const { signOut } = useAuth();

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as (Shipment & { direction?: string; packet_score?: number; filing_readiness?: string; coo_status?: string })[];
    },
  });

  const filteredByDirection = dashboardView === 'combined'
    ? shipments
    : shipments.filter(s => (s as any).direction === dashboardView);

  const filteredShipments = activeMode === 'all'
    ? filteredByDirection
    : filteredByDirection.filter(s => s.mode === activeMode);

  const inboundShipments = shipments.filter(s => (s as any).direction === 'inbound' || !(s as any).direction);
  const outboundShipments = shipments.filter(s => (s as any).direction === 'outbound');

  const directionShipments = dashboardView === 'inbound' ? inboundShipments
    : dashboardView === 'outbound' ? outboundShipments
    : shipments;

  const stats = {
    total: directionShipments.length,
    critical: directionShipments.filter(s => s.risk_score >= 85).length,
    flagged: directionShipments.filter(s => s.status === "flagged" || s.status === "customs_hold").length,
    cleared: directionShipments.filter(s => s.status === "cleared").length,
    underReview: directionShipments.filter(s => s.status === 'in_review' || s.status === 'waiting_docs').length,
    holdRisk: directionShipments.filter(s => s.risk_score >= 60).length,
    notBrokerReady: directionShipments.filter(s => (s as any).filing_readiness === 'not_ready').length,
    avgPacketScore: directionShipments.length > 0
      ? Math.round(directionShipments.reduce((sum, s) => sum + ((s as any).packet_score || 0), 0) / directionShipments.length)
      : 0,
    totalExposure: directionShipments.filter(s => s.risk_score >= 60).reduce((sum, s) => sum + Math.round(s.declared_value * 0.15), 0),
  };

  const issueContext: DirectionContext = dashboardView === 'combined' ? 'combined' : dashboardView;
  const shipmentIssues = directionShipments
    .filter(s => s.risk_score >= 40 || (s as any).filing_readiness === 'not_ready')
    .slice(0, 8)
    .map(s => ({
      shipment: s,
      issues: detectShipmentIssues({
        risk_score: s.risk_score,
        status: s.status,
        coo_status: (s as any).coo_status,
        packet_score: (s as any).packet_score,
        filing_readiness: (s as any).filing_readiness,
        hs_code: s.hs_code,
        declared_value: s.declared_value,
        assigned_broker: (s as any).assigned_broker,
      }),
    }))
    .filter(si => si.issues.length > 0);

  const viewLabels = {
    inbound: {
      title: 'IMPORTER DASHBOARD',
      subtitle: 'Inbound customs readiness & import-side exposure',
      kpiPrefix: 'INBOUND',
      holdLabel: 'HOLD RISK',
      readyLabel: 'NOT BROKER-READY',
      exposureLabel: 'AVOIDABLE IMPORT EXPOSURE',
    },
    outbound: {
      title: 'EXPORTER DASHBOARD',
      subtitle: 'Pre-departure readiness & export-side risk',
      kpiPrefix: 'OUTBOUND',
      holdLabel: 'BLOCKED FROM RELEASE',
      readyLabel: 'MISSING EXPORT DOCS',
      exposureLabel: 'AVOIDABLE EXPORT EXPOSURE',
    },
    combined: {
      title: 'UNIFIED DASHBOARD',
      subtitle: 'Cross-border compliance oversight',
      kpiPrefix: 'ALL',
      holdLabel: 'AT RISK',
      readyLabel: 'NOT READY',
      exposureLabel: 'TOTAL AVOIDABLE EXPOSURE',
    },
  };

  const labels = viewLabels[dashboardView];

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Start New Workflow Strip */}
        <StartNewWorkflow
          filter={["New Shipment", "New Route", "New Compliance Review", "New Watchlist", "Decision Twin"]}
          variant="strip"
        />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-mono text-sm font-bold">{labels.title}</h2>
            <p className="text-[10px] font-mono text-muted-foreground">{labels.subtitle}</p>
          </div>
          <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-lg p-1">
            <button
              onClick={() => setDashboardView('inbound')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                dashboardView === 'inbound' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownToLine size={12} /> INBOUND
            </button>
            <button
              onClick={() => setDashboardView('outbound')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                dashboardView === 'outbound' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowUpFromLine size={12} /> OUTBOUND
            </button>
            <button
              onClick={() => setDashboardView('combined')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                dashboardView === 'combined' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers size={12} /> COMBINED
            </button>
          </div>
        </div>

        {/* ═══ KPI Stats with Bold Risk Colors ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Total Shipments — primary blue */}
          <div className="rounded-lg border border-primary/30 bg-card p-4 shadow-[0_0_15px_-3px_hsl(var(--primary)/0.15)]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">{labels.kpiPrefix} SHIPMENTS</span>
              <Package size={14} className="text-primary" />
            </div>
            <p className="text-2xl font-bold font-mono text-primary">{isLoading ? '—' : stats.total}</p>
          </div>

          {/* Under Review — yellow/orange */}
          <div className="rounded-lg border border-risk-medium/40 bg-risk-medium/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">UNDER REVIEW</span>
              <ClipboardList size={14} className="text-risk-medium" />
            </div>
            <p className="text-2xl font-bold font-mono text-risk-medium">{isLoading ? '—' : stats.underReview}</p>
          </div>

          {/* Hold Risk — red/critical */}
          <div className="rounded-lg border border-risk-critical/40 bg-risk-critical/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">{labels.holdLabel}</span>
              <AlertTriangle size={14} className="text-risk-critical animate-pulse" />
            </div>
            <p className="text-2xl font-bold font-mono text-risk-critical">{isLoading ? '—' : stats.holdRisk}</p>
          </div>

          {/* Not Ready — orange/high */}
          <div className="rounded-lg border border-risk-high/40 bg-risk-high/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">{labels.readyLabel}</span>
              <FileWarning size={14} className="text-risk-high" />
            </div>
            <p className="text-2xl font-bold font-mono text-risk-high">{isLoading ? '—' : stats.notBrokerReady}</p>
          </div>

          {/* Cleared — green/safe */}
          <div className="rounded-lg border border-risk-safe/40 bg-risk-safe/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">CLEARED</span>
              <ShieldCheck size={14} className="text-risk-safe" />
            </div>
            <p className="text-2xl font-bold font-mono text-risk-safe">{isLoading ? '—' : stats.cleared}</p>
          </div>
        </div>

        {/* Second KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-muted-foreground tracking-wider">AVG PACKET SCORE</span>
                <ClipboardCheck size={14} className="text-primary" />
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold font-mono ${stats.avgPacketScore >= 70 ? 'text-risk-safe' : stats.avgPacketScore >= 40 ? 'text-risk-medium' : 'text-risk-critical'}`}>
                  {isLoading ? '—' : stats.avgPacketScore}
                </span>
                <Progress
                  value={stats.avgPacketScore}
                  className={`flex-1 h-2 ${stats.avgPacketScore >= 70 ? '[&>div]:bg-risk-safe' : stats.avgPacketScore >= 40 ? '[&>div]:bg-risk-medium' : '[&>div]:bg-risk-critical'}`}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="border-risk-critical/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-muted-foreground tracking-wider">{labels.exposureLabel}</span>
                <TrendingDown size={14} className="text-risk-critical" />
              </div>
              <p className="text-2xl font-bold font-mono text-risk-critical">
                {isLoading ? '—' : `$${stats.totalExposure.toLocaleString()}`}
              </p>
            </CardContent>
          </Card>
          {dashboardView === 'combined' && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] text-muted-foreground tracking-wider">DIRECTION SPLIT</span>
                  <Layers size={14} className="text-primary" />
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1">
                    <ArrowDownToLine size={10} className="text-primary" />
                    <span>{inboundShipments.length} inbound</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ArrowUpFromLine size={10} className="text-risk-medium" />
                    <span>{outboundShipments.length} outbound</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══ Active Issues — Bold Andon Cards ═══ */}
        {shipmentIssues.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-mono text-xs text-muted-foreground tracking-wider flex items-center gap-2">
              <AlertTriangle size={14} className="text-risk-critical" /> ACTIVE ISSUES
              <Badge variant="destructive" className="font-mono text-[10px] px-1.5 py-0">
                {shipmentIssues.reduce((c, si) => c + si.issues.length, 0)}
              </Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {shipmentIssues.slice(0, 6).map(({ shipment: s, issues }) => {
                const severity = getRiskLevel(s.risk_score);
                const borderColor = severity === 'critical' ? 'border-l-risk-critical' :
                  severity === 'high' ? 'border-l-risk-high' :
                  severity === 'medium' ? 'border-l-risk-medium' : 'border-l-risk-safe';
                return (
                  <Link key={s.id} to={`/shipment/${s.shipment_id}`} className="block">
                    <div className={`rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors border-l-[3px] ${borderColor}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <RiskDot score={s.risk_score} size="md" />
                        <span className="font-mono text-xs font-bold">{s.shipment_id}</span>
                        <StatusBadge status={s.status} size="sm" />
                        {dashboardView === 'combined' && (
                          <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                            {(s as any).direction === 'outbound' ? '↑ OUT' : '↓ IN'}
                          </Badge>
                        )}
                        <div className="ml-auto">
                          <RiskBadge score={s.risk_score} size="sm" />
                        </div>
                      </div>
                      {issues.slice(0, 2).map(issue => {
                        const frame = getIssueFrame(issue, issueContext);
                        return (
                          <div key={issue} className="mb-1">
                            <p className="text-xs font-semibold text-foreground">{frame.label}</p>
                            <p className="text-[10px] text-muted-foreground">{frame.explanation}</p>
                          </div>
                        );
                      })}
                      {issues.length > 2 && (
                        <p className="text-[10px] text-muted-foreground">+{issues.length - 2} more issues</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ Shipment Table with Mode Tabs ═══ */}
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs text-muted-foreground tracking-wider">ORDERS & SHIPMENTS</h3>
          <ExportButton
            data={filteredShipments as any[]}
            columns={SHIPMENT_COLUMNS}
            filename={`orchestra-shipments-${new Date().toISOString().slice(0, 10)}`}
            sheetName="Shipments"
            label="Export Shipments"
          />
        </div>
        <Tabs value={activeMode} onValueChange={setActiveMode}>
          <TabsList className="bg-secondary/50 border border-border">
            <TabsTrigger value="all" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              ALL
            </TabsTrigger>
            <TabsTrigger value="air" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Plane size={12} className="mr-1" /> AIR
            </TabsTrigger>
            <TabsTrigger value="sea" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Ship size={12} className="mr-1" /> SEA
            </TabsTrigger>
            <TabsTrigger value="land" className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Truck size={12} className="mr-1" /> LAND
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ShipmentTable shipments={filteredByDirection as Shipment[]} />
          </TabsContent>
          <TabsContent value="air" className="mt-4">
            <ShipmentTable shipments={filteredByDirection as Shipment[]} mode="air" />
          </TabsContent>
          <TabsContent value="sea" className="mt-4">
            <ShipmentTable shipments={filteredByDirection as Shipment[]} mode="sea" />
          </TabsContent>
          <TabsContent value="land" className="mt-4">
            <ShipmentTable shipments={filteredByDirection as Shipment[]} mode="land" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
