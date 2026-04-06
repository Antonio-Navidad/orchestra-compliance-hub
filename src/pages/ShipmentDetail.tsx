import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RiskBadge } from "@/components/RiskBadge";
import { ModeIcon } from "@/components/ModeIcon";
import { ComparisonView } from "@/components/ComparisonView";
import { ModeCompliancePanel } from "@/components/ModeCompliancePanel";
import { PdfUpload } from "@/components/PdfUpload";
import { compareInvoiceManifest, getRiskBgClass, getRiskLevel } from "@/lib/compliance";
import { ExposurePanel } from "@/components/ExposurePanel";
import { FixNowPanel } from "@/components/FixNowPanel";
import { ExplainabilityDrawer } from "@/components/ExplainabilityDrawer";
import { AuditTimeline } from "@/components/AuditTimeline";
import { StatusWorkflow } from "@/components/StatusWorkflow";
import { OutcomeRecorder } from "@/components/OutcomeRecorder";
import { ETAPanel } from "@/components/ETAPanel";
import { ExceptionsReport as WorkspaceExceptionsReport } from "@/components/workspace/ExceptionsReport";
import type { ExtractedDocData } from "@/hooks/useDocExtraction";
import { Shipment, Invoice, Manifest, TransportMode } from "@/types/orchestra";
import { ArrowLeft, FileText, AlertTriangle, TrendingDown, Zap, Clock, ClipboardCheck, Send, BarChart3, Navigation, ShieldAlert, Shield, DollarSign, ChevronRight, XCircle } from "lucide-react";
import { PacketScoreCard } from "@/components/PacketScoreCard";
import { computePacketScore } from "@/lib/packetScore";
import { EscalationPanel } from "@/components/EscalationPanel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrokerSelector } from "@/components/BrokerSelector";
import { JurisdictionSelector } from "@/components/JurisdictionSelector";
import { SendToBrokerPanel } from "@/components/SendToBrokerPanel";

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "exceptions";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [reportOpen, setReportOpen] = useState(false);
  const { t } = useLanguage();

  const { data: shipment, isLoading } = useQuery({
    queryKey: ["shipment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("shipment_id", id)
        .single();
      if (error) throw error;
      return data as unknown as Shipment;
    },
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

  const { data: shipmentDocs = [] } = useQuery({
    queryKey: ["shipment-docs", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipment_documents" as any).select("*").eq("shipment_id", id).eq("is_current", true);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  // Load cross-ref results for exceptions report
  const { data: crossRefResults = [] } = useQuery({
    queryKey: ["crossref-results", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crossref_results" as any)
        .select("*")
        .eq("shipment_id", id);
      if (error) return [];
      const toSnake = (s: string) => (s || "").trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "");
      return (data || []).map((r: any) => ({
        id: r.id,
        severity: r.severity,
        document_a: toSnake(r.document_a_type),
        document_b: toSnake(r.document_b_type),
        field_checked: r.field_checked,
        finding: r.finding,
        recommendation: r.recommendation || "",
        estimated_financial_impact_usd: Number(r.estimated_financial_impact_usd) || 0,
        resolved: r.resolved,
      }));
    },
    enabled: !!id,
  });

  // Load sanctions alerts for exceptions report
  const { data: sanctionsAlerts = [] } = useQuery({
    queryKey: ["sanctions-alerts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("sanctions_alerts" as any)
        .select("*")
        .eq("shipment_id", id)
        .order("created_at", { ascending: false })
        .limit(1);
      return data || [];
    },
    enabled: !!id,
  });

  const latestAlert = sanctionsAlerts[0] as any;
  const ofacStatusForReport = latestAlert
    ? {
        risk: latestAlert.risk_level as any,
        entity: latestAlert.entity_name || "",
        screened: true,
      }
    : null;

  const uploadedDocTypes = shipmentDocs.map((d: any) =>
    (d.document_type || "").toLowerCase().replace(/[\s\-]+/g, "_")
  );

  // Load extracted documents for workspace ExceptionsReport
  const { data: extractedDocsRaw = [] } = useQuery({
    queryKey: ["extracted-docs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("document_type, extracted_data, extraction_status, file_name")
        .eq("shipment_id", id!)
        .eq("extraction_status", "complete");
      if (error) return [];
      return data || [];
    },
    enabled: !!id,
  });

  const extractedDocs: Record<string, ExtractedDocData> = Object.fromEntries(
    extractedDocsRaw.map((doc: any) => [
      doc.document_type,
      {
        docId: doc.document_type,
        documentType: doc.document_type,
        extractedData: doc.extracted_data || {},
        fieldDetails: [],
        warnings: [],
        pgaFlags: [],
        extractionStatus: "complete",
      } satisfies ExtractedDocData,
    ])
  );

  const invoice = invoices[0];
  const manifest = manifests[0];
  const mismatches = invoice && manifest ? compareInvoiceManifest(invoice, manifest) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-mono text-sm">{t("detail.loadingShipment")}</div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">{t("detail.shipmentNotFound")}</p>
          <Link to="/" className="text-primary text-sm hover:underline">{t("detail.returnToDashboard")}</Link>
        </div>
      </div>
    );
  }

  const jurisdictionCode = (shipment as any).jurisdiction_code || "US";

  const packetScore = computePacketScore(
    uploadedDocTypes,
    shipment.mode as TransportMode,
    jurisdictionCode,
    {
      description: shipment.description,
      quantity: undefined,
      declared_value: shipment.declared_value,
      hs_code: shipment.hs_code,
      consignee: shipment.consignee,
      shipper: (shipment as any).shipper,
      assigned_broker: (shipment as any).assigned_broker,
      coo_status: (shipment as any).coo_status,
      origin_country: (shipment as any).origin_country,
    }
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <ModeIcon mode={shipment.mode as TransportMode} className="text-primary" size={18} />
            <h1 className="text-lg font-bold font-mono">{shipment.shipment_id}</h1>
          </div>
          <ExplainabilityDrawer
            riskScore={shipment.risk_score}
            riskNotes={shipment.risk_notes}
            hsCode={shipment.hs_code}
            mode={shipment.mode}
            status={shipment.status}
            jurisdictionCode={jurisdictionCode}
          >
            <button className="cursor-pointer">
              <RiskBadge score={shipment.risk_score} />
            </button>
          </ExplainabilityDrawer>
          <div className="ml-auto flex items-center gap-3">
            <Link
              to={`/decision-twin/${shipment.shipment_id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary/30 text-primary text-xs font-mono hover:bg-primary/10 transition-colors"
            >
              <Zap size={12} /> {t("detail.decisionTwin")}
            </Link>
            <BrokerSelector
              shipmentId={shipment.shipment_id}
              currentBrokerId={(shipment as any).broker_id}
              currentBrokerName={(shipment as any).assigned_broker}
            />
            <JurisdictionSelector
              shipmentId={shipment.shipment_id}
              currentCode={jurisdictionCode}
            />
            <SendToBrokerPanel
              shipmentId={shipment.shipment_id}
              brokerId={(shipment as any).broker_id}
              brokerName={(shipment as any).assigned_broker}
              direction={(shipment as any).direction}
              destinationCountry={(shipment as any).destination_country}
              packetScore={packetScore.overallScore}
              filingReadiness={(shipment as any).filing_readiness}
            />
            <EscalationPanel
              shipmentId={shipment.shipment_id}
              brokerId={(shipment as any).broker_id}
              issueType={shipment.risk_score >= 60 ? "High risk shipment" : undefined}
              issueDescription={shipment.risk_notes || undefined}
              estimatedExposure={shipment.risk_score >= 60 ? Math.round(shipment.declared_value * 0.15) : undefined}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Status Workflow */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="font-mono text-xs text-muted-foreground">{t("detail.workflowStatus")}</span>
            <StatusWorkflow shipmentId={shipment.shipment_id} currentStatus={shipment.status} />
          </div>
        </div>

        {/* Risk Banner */}
        {shipment.risk_score >= 60 && (
          <div className={`rounded-lg border p-4 ${getRiskBgClass(getRiskLevel(shipment.risk_score))} ${
            shipment.risk_score >= 85 ? 'border-risk-critical/30' : 'border-risk-medium/30'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className={shipment.risk_score >= 85 ? 'text-risk-critical' : 'text-risk-medium'} />
              <div>
                <p className="text-sm font-semibold">
                  {shipment.risk_score >= 85 ? t("detail.criticalRiskAlert") : t("detail.complianceWarning")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{shipment.risk_notes}</p>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-secondary/50 border border-border flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="exceptions" className="font-mono text-xs font-bold text-primary border border-primary/30 bg-primary/5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShieldAlert size={12} className="mr-1" /> Exceptions Report
            </TabsTrigger>
            <TabsTrigger value="overview" className="font-mono text-xs">{t("detail.tab.overview")}</TabsTrigger>
            <TabsTrigger value="fix" className="font-mono text-xs">
              <Zap size={12} className="mr-1" /> {t("detail.tab.fixNow")}
            </TabsTrigger>
            <TabsTrigger value="exposure" className="font-mono text-xs">
              <TrendingDown size={12} className="mr-1" /> {t("detail.tab.exposure")}
            </TabsTrigger>
            <TabsTrigger value="packet" className="font-mono text-xs">
              <ClipboardCheck size={12} className="mr-1" /> {t("detail.tab.packet")}
            </TabsTrigger>
            <TabsTrigger value="documents" className="font-mono text-xs">
              <FileText size={12} className="mr-1" /> {t("detail.tab.documents")}
            </TabsTrigger>
            <TabsTrigger value="eta" className="font-mono text-xs">
              <Navigation size={12} className="mr-1" /> {t("detail.tab.eta")}
            </TabsTrigger>
            <TabsTrigger value="audit" className="font-mono text-xs">
              <Clock size={12} className="mr-1" /> {t("detail.tab.auditTrail")}
            </TabsTrigger>
            {(shipment.status === "cleared" || shipment.status === "closed_avoided" || shipment.status === "closed_incident") && (
              <TabsTrigger value="outcome" className="font-mono text-xs">
                <BarChart3 size={12} className="mr-1" /> {t("detail.tab.outcome")}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="exceptions" className="mt-4">
            {/* ── Exceptions Summary Card ── */}
            {(() => {
              const criticals = crossRefResults.filter(e => e.severity === "critical").length;
              const highs = crossRefResults.filter(e => e.severity === "high").length;
              const mediums = crossRefResults.filter(e => e.severity === "medium").length;
              const lows = crossRefResults.filter(e => e.severity === "low").length;
              const totalRisk = crossRefResults
                .filter(e => e.severity === "critical" || e.severity === "high")
                .reduce((sum, e) => sum + (e.estimated_financial_impact_usd || 0), 0);
              let score = 100 - criticals * 30 - highs * 15 - mediums * 8 - lows * 3;
              score = Math.max(0, Math.min(100, score));

              return (
                <div className="space-y-3">
                  {/* Status banner */}
                  <div className={`flex items-center gap-3 p-4 rounded-lg border-2 ${
                    criticals > 0 ? "bg-red-950/60 border-red-700" :
                    highs > 0 ? "bg-orange-950/60 border-orange-700" :
                    crossRefResults.length > 0 ? "bg-yellow-950/60 border-yellow-700" :
                    "bg-green-950/60 border-green-700"
                  }`}>
                    {criticals > 0
                      ? <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                      : <Shield className="h-5 w-5 text-green-400 flex-shrink-0" />}
                    <span className={`font-bold text-sm tracking-wide ${
                      criticals > 0 ? "text-red-300" :
                      highs > 0 ? "text-orange-300" :
                      crossRefResults.length > 0 ? "text-yellow-300" :
                      "text-green-300"
                    }`}>
                      {criticals > 0 ? "HOLD — CRITICAL ISSUES MUST BE RESOLVED BEFORE FILING" :
                       highs > 0    ? "REVIEW REQUIRED — RESOLVE EXCEPTIONS BEFORE FILING" :
                       crossRefResults.length > 0 ? "REVIEW RECOMMENDED — LOW PRIORITY ITEMS FOUND" :
                       "CLEARED — READY TO FILE"}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="border rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{crossRefResults.length}</div>
                      <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Exceptions</div>
                    </div>
                    <div className="border rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">
                        {totalRisk > 0 ? `$${totalRisk.toLocaleString()}` : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Risk Exposure</div>
                    </div>
                    <div className="border rounded-lg p-3 text-center">
                      <div className={`text-2xl font-bold ${
                        score >= 80 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400"
                      }`}>
                        {score > 0 ? `${score}%` : "0%"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Readiness</div>
                    </div>
                  </div>

                  {/* Severity breakdown pills */}
                  {crossRefResults.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {criticals > 0 && <span className="px-2 py-1 rounded bg-red-950/60 border border-red-700 text-red-300">{criticals} Critical</span>}
                      {highs > 0    && <span className="px-2 py-1 rounded bg-orange-950/60 border border-orange-700 text-orange-300">{highs} High</span>}
                      {mediums > 0  && <span className="px-2 py-1 rounded bg-yellow-950/60 border border-yellow-700 text-yellow-300">{mediums} Medium</span>}
                      {lows > 0     && <span className="px-2 py-1 rounded bg-blue-950/60 border border-blue-700 text-blue-300">{lows} Low</span>}
                    </div>
                  )}

                  {/* View full report button */}
                  <button
                    onClick={() => setReportOpen(true)}
                    className="w-full flex items-center justify-between p-4 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors text-sm font-medium text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      View Full Pre-Filing Validation Report
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })()}

            {/* Workspace-grade full report dialog */}
            <WorkspaceExceptionsReport
              open={reportOpen}
              onClose={() => setReportOpen(false)}
              shipmentRef={shipment.shipment_id}
              shipmentId={shipment.shipment_id}
              workspaceId={(shipment as any).workspace_id ?? undefined}
              consignee={shipment.consignee}
              crossRefResults={crossRefResults}
              extractedDocs={extractedDocs}
              ofacStatus={ofacStatusForReport}
              complianceScore={(() => {
                const c = crossRefResults.filter(e => e.severity === "critical").length;
                const h = crossRefResults.filter(e => e.severity === "high").length;
                const m = crossRefResults.filter(e => e.severity === "medium").length;
                const l = crossRefResults.filter(e => e.severity === "low").length;
                return Math.max(0, Math.min(100, 100 - c * 30 - h * 15 - m * 8 - l * 3));
              })()}
            />
          </TabsContent>

          <TabsContent value="overview" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h3 className="font-mono text-xs text-muted-foreground">{t("detail.shipmentInfo")}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.mode")}</span><span className="font-mono uppercase">{shipment.mode}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.consignee")}</span><span>{shipment.consignee}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.hsCode")}</span><span className="font-mono">{shipment.hs_code}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.declaredValue")}</span><span className="font-mono">${shipment.declared_value.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.jurisdiction")}</span><span className="font-mono">{jurisdictionCode}</span></div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h3 className="font-mono text-xs text-muted-foreground">{t("detail.description")}</h3>
                <p className="text-sm">{shipment.description}</p>
                {shipment.risk_notes && (
                  <>
                    <h3 className="font-mono text-xs text-muted-foreground mt-4">{t("detail.riskAnalysis")}</h3>
                    <p className="text-sm text-muted-foreground">{shipment.risk_notes}</p>
                  </>
                )}
              </div>

              <ModeCompliancePanel mode={shipment.mode as TransportMode} />
            </div>

            {/* Comparison View */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                <FileText size={14} /> {t("detail.invoiceVsManifest")}
              </h3>
              {invoice && manifest ? (
                <ComparisonView mismatches={mismatches} />
              ) : (
                <div className="rounded-lg border border-border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("detail.noComparisonData")}</p>
                </div>
              )}
            </div>

            {/* Invoice & Manifest Details */}
            {(invoice || manifest) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoice && (
                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <h3 className="font-mono text-xs text-muted-foreground">{t("detail.invoiceData")}</h3>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.item")}</span><span className="text-right max-w-[200px] truncate">{invoice.item_description}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.qty")}</span><span className="font-mono">{invoice.quantity}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.hsCode")}</span><span className="font-mono">{invoice.hs_code}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.total")}</span><span className="font-mono">${invoice.total_value.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.netWeight")}</span><span className="font-mono">{invoice.net_weight_kg.toLocaleString()} kg</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.grossWeight")}</span><span className="font-mono">{invoice.gross_weight_kg.toLocaleString()} kg</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.exporter")}</span><span className="text-right max-w-[200px] truncate">{invoice.exporter_name}</span></div>
                    </div>
                  </div>
                )}
                {manifest && (
                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <h3 className="font-mono text-xs text-muted-foreground">{t("detail.manifestData")}</h3>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.item")}</span><span className="text-right max-w-[200px] truncate">{manifest.item_description}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.qty")}</span><span className="font-mono">{manifest.quantity}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.hsCode")}</span><span className="font-mono">{manifest.hs_code}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.total")}</span><span className="font-mono">${manifest.total_value.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.netWeight")}</span><span className="font-mono">{manifest.net_weight_kg.toLocaleString()} kg</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.grossWeight")}</span><span className="font-mono">{manifest.gross_weight_kg.toLocaleString()} kg</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("detail.billOfLading")}</span><span className="font-mono">{manifest.bill_of_lading || '—'}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="fix" className="mt-4">
            <FixNowPanel
              shipmentId={shipment.shipment_id}
              riskScore={shipment.risk_score}
              status={shipment.status}
              riskNotes={shipment.risk_notes}
              hsCode={shipment.hs_code}
              declaredValue={shipment.declared_value}
              mismatches={mismatches}
            />
          </TabsContent>

          <TabsContent value="exposure" className="mt-4">
            <ExposurePanel
              riskScore={shipment.risk_score}
              declaredValue={shipment.declared_value}
              jurisdictionCode={jurisdictionCode}
            />
          </TabsContent>

          <TabsContent value="packet" className="mt-4">
            <PacketScoreCard result={packetScore} />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <PdfUpload shipmentId={shipment.shipment_id} />
          </TabsContent>

          <TabsContent value="eta" className="mt-4">
            <ETAPanel shipmentId={shipment.shipment_id} workspaceId={(shipment as any).workspace_id} />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <AuditTimeline shipmentId={shipment.shipment_id} />
          </TabsContent>

          {(shipment.status === "cleared" || shipment.status === "closed_avoided" || shipment.status === "closed_incident") && (
            <TabsContent value="outcome" className="mt-4">
              <OutcomeRecorder
                shipmentId={shipment.shipment_id}
                workspaceId={(shipment as any).workspace_id}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

