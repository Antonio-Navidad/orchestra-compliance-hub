import { useMemo, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Printer,
  FileText,
  DollarSign,
  Flag,
  Calendar,
  Building2,
  ThumbsDown,
  ThumbsUp,
  ArrowUpCircle,
  CheckCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CrossRefResult, ExtractedDocData } from "@/hooks/useDocExtraction";

export interface OfacStatus {
  risk: "clear" | "low" | "medium" | "high" | "critical";
  entity: string;
  screened: boolean;
}

export interface ExceptionsReportProps {
  open: boolean;
  onClose: () => void;
  shipmentRef?: string;
  shipmentId?: string;
  workspaceId?: string;
  consignee?: string;
  crossRefResults: CrossRefResult[];
  extractedDocs: Record<string, ExtractedDocData>;
  ofacStatus?: OfacStatus | null;
  complianceScore?: number;
}

type FeedbackAction = "confirmed" | "dismissed" | "overridden" | "escalated";
const FEEDBACK_CONFIG: Record<FeedbackAction, { label: string; cls: string; icon: React.ReactNode }> = {
  confirmed: { label: "Confirmed", cls: "text-red-300 border-red-700 bg-red-950/40",    icon: <CheckCheck className="h-3 w-3" /> },
  dismissed: { label: "Dismissed", cls: "text-gray-400 border-gray-600 bg-gray-900/40", icon: <ThumbsDown className="h-3 w-3" /> },
  overridden:{ label: "Overridden",cls: "text-amber-300 border-amber-700 bg-amber-950/40", icon: <ThumbsUp className="h-3 w-3" /> },
  escalated: { label: "Escalated", cls: "text-purple-300 border-purple-700 bg-purple-950/40", icon: <ArrowUpCircle className="h-3 w-3" /> },
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const severityConfig = {
  critical: {
    label: "CRITICAL",
    bg: "bg-red-950/60 border-red-700",
    icon: XCircle,
    iconClass: "text-red-400",
    textClass: "text-red-300",
  },
  high: {
    label: "HIGH",
    bg: "bg-orange-950/60 border-orange-700",
    icon: AlertTriangle,
    iconClass: "text-orange-400",
    textClass: "text-orange-300",
  },
  medium: {
    label: "MEDIUM",
    bg: "bg-yellow-950/60 border-yellow-700",
    icon: AlertTriangle,
    iconClass: "text-yellow-400",
    textClass: "text-yellow-200",
  },
  low: {
    label: "LOW",
    bg: "bg-blue-950/60 border-blue-700",
    icon: Flag,
    iconClass: "text-blue-400",
    textClass: "text-blue-300",
  },
} as const;

const overallStatusConfig = {
  clear: {
    label: "CLEARED — READY TO FILE",
    bg: "bg-green-950/60 border-green-700",
    text: "text-green-300",
    icon: CheckCircle2,
    iconClass: "text-green-400",
  },
  review: {
    label: "REVIEW REQUIRED — RESOLVE EXCEPTIONS BEFORE FILING",
    bg: "bg-yellow-950/60 border-yellow-600",
    text: "text-yellow-200",
    icon: AlertTriangle,
    iconClass: "text-yellow-400",
  },
  hold: {
    label: "HOLD — CRITICAL ISSUES MUST BE RESOLVED BEFORE FILING",
    bg: "bg-red-950/60 border-red-700",
    text: "text-red-300",
    icon: XCircle,
    iconClass: "text-red-400",
  },
};

export function ExceptionsReport({
  open,
  onClose,
  shipmentRef,
  shipmentId,
  workspaceId,
  consignee,
  crossRefResults,
  extractedDocs,
  ofacStatus,
  complianceScore,
}: ExceptionsReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  // Tracks per-exception feedback: key = exception index, value = action taken
  const [feedbackMap, setFeedbackMap] = useState<Record<number, FeedbackAction>>({});

  const recordFeedback = useCallback(async (excIndex: number, exc: CrossRefResult, action: FeedbackAction) => {
    // Optimistic UI update first
    setFeedbackMap(prev => ({ ...prev, [excIndex]: action }));
    // Write to exception_feedback table — this powers the MOAT learning loop
    try {
      await supabase.from("exception_feedback").insert({
        shipment_id:   shipmentId ?? shipmentRef ?? "unknown",
        workspace_id:  workspaceId ?? null,
        rule_id:       `${exc.document_a}__${exc.document_b}__${exc.field_checked}`.replace(/\s+/g, "_").toLowerCase(),
        severity:      exc.severity,
        action,
        override_reason: action === "overridden" ? "User marked as acceptable" : null,
        was_correct:   action === "confirmed" ? true : action === "dismissed" ? false : null,
      } as any);
    } catch (_) {
      // Non-blocking — intelligence capture should never break the report UX
    }
  }, [shipmentId, shipmentRef, workspaceId]);

  const generatedAt = useMemo(
    () =>
      new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    // Recompute only when dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open]
  );

  const sortedExceptions = useMemo(
    () =>
      [...crossRefResults].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      ),
    [crossRefResults]
  );

  const allPgaFlags = useMemo(() => {
    const flags: Array<{
      agency: string;
      requirement: string;
      mandatory: boolean;
      reason: string;
      docId: string;
    }> = [];
    Object.entries(extractedDocs).forEach(([docId, doc]) => {
      doc.pgaFlags?.forEach((f) => flags.push({ ...f, docId }));
    });
    return flags;
  }, [extractedDocs]);

  const overallStatus = useMemo(() => {
    const hasCritical = sortedExceptions.some((e) => e.severity === "critical");
    const hasHighOrAbove = sortedExceptions.some(
      (e) => e.severity === "critical" || e.severity === "high"
    );
    const ofacDangerous =
      ofacStatus?.screened &&
      ["high", "critical"].includes(ofacStatus.risk);
    const anyDocCritical = Object.values(extractedDocs).some(
      (d) => d.extractionStatus === "critical_issues"
    );

    if (hasCritical || ofacDangerous || anyDocCritical) return "hold";
    if (hasHighOrAbove || sortedExceptions.length > 0) return "review";
    return "clear";
  }, [sortedExceptions, ofacStatus, extractedDocs]);

  const totalRisk = useMemo(
    () =>
      sortedExceptions
        .filter(
          (e) => e.severity === "critical" || e.severity === "high"
        )
        .reduce((sum, e) => sum + (e.estimated_financial_impact_usd || 0), 0),
    [sortedExceptions]
  );

  const docCount = Object.keys(extractedDocs).length;

  const handleExportPDF = () => {
    const statusLabel = overallStatusConfig[overallStatus].label;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Orchestra AI — Pre-Filing Validation Report</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#111827;max-width:960px;margin:0 auto;padding:24px;}
    h1{font-size:18px;font-weight:700;margin:0 0 4px;}
    .meta{font-size:11px;color:#6b7280;margin-bottom:16px;}
    .status-hold{background:#fee2e2;border:2px solid #b91c1c;padding:10px 16px;border-radius:6px;color:#7f1d1d;font-weight:700;margin-bottom:16px;}
    .status-review{background:#fef3c7;border:2px solid #d97706;padding:10px 16px;border-radius:6px;color:#78350f;font-weight:700;margin-bottom:16px;}
    .status-clear{background:#d1fae5;border:2px solid #059669;padding:10px 16px;border-radius:6px;color:#064e3b;font-weight:700;margin-bottom:16px;}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;}
    .stat{border:1px solid #e5e7eb;border-radius:6px;padding:12px;text-align:center;}
    .stat-num{font-size:28px;font-weight:700;}
    .stat-lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;}
    .safe-harbor{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 14px;font-size:10px;color:#1e40af;margin-bottom:16px;line-height:1.5;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;}
    th{background:#f3f4f6;text-align:left;padding:7px 10px;font-size:11px;font-weight:600;border:1px solid #e5e7eb;}
    td{padding:7px 10px;font-size:11px;border:1px solid #e5e7eb;vertical-align:top;}
    .sev-critical{background:#fee2e2;} .sev-high{background:#ffedd5;}
    .sev-medium{background:#fef3c7;} .sev-low{background:#eff6ff;}
    .disclaimer{font-size:10px;color:#6b7280;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-top:16px;line-height:1.6;}
    @media print{body{margin:0;padding:16px;}}
  </style>
</head>
<body>
  <h1>Orchestra AI — Pre-Filing Validation Report</h1>
  <div class="meta">${[
    shipmentRef ? `Shipment: ${shipmentRef}` : "",
    consignee   ? `Consignee: ${consignee}` : "",
    `Generated: ${generatedAt}`,
    complianceScore !== undefined ? `Compliance Score: ${complianceScore}%` : "",
  ].filter(Boolean).join("&nbsp;&nbsp;|&nbsp;&nbsp;")}</div>
  <div class="status-${overallStatus}">${statusLabel}</div>
  <div class="safe-harbor"><strong>Audit Tool Disclosure (19 USC 1641):</strong> Orchestra AI is a pre-filing compliance audit tool — not a licensed customs broker. This report does not constitute "Customs Business." All findings must be reviewed by your licensed customs broker before CBP submission.</div>
  <div class="stats">
    <div class="stat"><div class="stat-num">${sortedExceptions.length}</div><div class="stat-lbl">Exceptions Found</div></div>
    <div class="stat"><div class="stat-num">${totalRisk > 0 ? `$${totalRisk.toLocaleString()}` : "—"}</div><div class="stat-lbl">Estimated Risk Exposure</div></div>
    <div class="stat"><div class="stat-num">${docCount}</div><div class="stat-lbl">Documents Validated</div></div>
  </div>
  <h2 style="font-size:14px;font-weight:700;margin-bottom:8px;">Exceptions (${sortedExceptions.length})</h2>
  ${sortedExceptions.length === 0
    ? '<p style="color:#059669;font-size:12px;">✓ No cross-document exceptions detected. All fields validated successfully.</p>'
    : `<table><thead><tr><th>#</th><th>Severity</th><th>Documents</th><th>Field</th><th>Finding</th><th>Action Required</th><th>Est. Risk ($)</th></tr></thead><tbody>${
      sortedExceptions.map((exc, i) =>
        `<tr class="sev-${exc.severity}"><td>${i+1}</td><td><strong>${exc.severity.toUpperCase()}</strong></td><td>${exc.document_a} × ${exc.document_b}</td><td>${exc.field_checked}</td><td>${exc.finding}</td><td>${exc.recommendation}</td><td>${exc.estimated_financial_impact_usd > 0 ? `$${exc.estimated_financial_impact_usd.toLocaleString()}` : "—"}</td></tr>`
      ).join("")
    }</tbody></table>`}
  <div class="disclaimer"><strong>Important Disclaimer:</strong> This report is a pre-filing validation recommendation generated by Orchestra AI based on the documents provided. It does not constitute legal or regulatory advice. Your licensed customs broker or freight forwarder remains the agent of record and is solely responsible for all filings submitted to CBP and other regulatory agencies.</div>
</body>
</html>`;
    const w = window.open("", "_blank", "width=1000,height=750");
    if (w) { w.document.write(html); w.document.close(); w.onload = () => w.print(); }
  };

  const handleExportExcel = async () => {
    // @ts-ignore
    const XLSX = await import("xlsx");
    const rows: unknown[][] = [
      ["Orchestra AI — Pre-Filing Validation Report"],
      [shipmentRef ? `Shipment: ${shipmentRef}` : "", consignee ? `Consignee: ${consignee}` : "", `Generated: ${generatedAt}`],
      [],
      ["EXCEPTIONS SUMMARY"],
      ["#", "Severity", "Document A", "Document B", "Field Checked", "Finding", "Recommendation", "Est. Risk ($)"],
      ...sortedExceptions.map((exc, i) => [
        i + 1,
        exc.severity.toUpperCase(),
        exc.document_a,
        exc.document_b,
        exc.field_checked,
        exc.finding,
        exc.recommendation,
        exc.estimated_financial_impact_usd || 0,
      ]),
      [],
      ["REPORT TOTALS"],
      ["Total Exceptions", sortedExceptions.length],
      ["Critical / High", sortedExceptions.filter(e => e.severity === "critical" || e.severity === "high").length],
      ["Estimated Risk Exposure ($)", totalRisk],
      ["Documents Validated", docCount],
      ["Overall Status", overallStatus.toUpperCase()],
      complianceScore !== undefined ? ["Compliance Score", `${complianceScore}%`] : [],
    ].filter(r => r.length > 0);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 4 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 45 }, { wch: 45 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Validation Report");
    const filename = `orchestra-report-${(shipmentRef || "export").replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const status = overallStatusConfig[overallStatus];
  const StatusIcon = status.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div ref={reportRef} className="p-8 print:p-6 space-y-0">
          {/* ── Report Header ── */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
                  Orchestra AI — Pre-Filing Validation Report
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {shipmentRef && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {shipmentRef}
                  </span>
                )}
                {consignee && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {consignee}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {generatedAt}
                </span>
                {complianceScore !== undefined && (
                  <span className="flex items-center gap-1 font-semibold">
                    Compliance Score: {complianceScore}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 print:hidden flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Export PDF
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <FileText className="h-4 w-4 mr-1.5" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* ── Overall Status Banner ── */}
          <div
            className={`flex items-center gap-3 p-4 rounded-lg border-2 mb-6 ${status.bg}`}
          >
            <StatusIcon
              className={`h-6 w-6 flex-shrink-0 ${status.iconClass}`}
            />
            <span className={`font-bold text-sm tracking-wide ${status.text}`}>
              {status.label}
            </span>
          </div>

          {/* ── Legal Safe Harbor Banner ── */}
          <div className="flex items-start gap-2 p-3 mb-6 rounded-lg border border-blue-800 bg-blue-950/40 text-[11px] text-blue-300 leading-relaxed">
            <Shield className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
            <span>
              <strong>Audit Tool Disclosure (19 USC 1641):</strong> Orchestra AI is a pre-filing compliance audit tool — not a licensed customs broker. This report does not constitute "Customs Business." All findings, HTS guidance (provided at 6-digit level only), and classification suggestions must be reviewed and finalized by your licensed customs broker before CBP submission. Orchestra does not file entries, ISFs, or any regulatory submissions on your behalf.
            </span>
          </div>

          {/* ── Quick Stats ── */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-foreground">
                {sortedExceptions.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                Exceptions Found
              </div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-foreground">
                {totalRisk > 0 ? `$${totalRisk.toLocaleString()}` : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                Estimated Risk Exposure
              </div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-foreground">
                {docCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                Documents Validated
              </div>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* ── Exceptions ── */}
          <div className="mb-6">
            <h3 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Exceptions ({sortedExceptions.length})
            </h3>

            {sortedExceptions.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-green-950/40 border border-green-700 rounded-lg text-green-300 text-sm">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                No cross-document exceptions detected. All fields validated
                successfully.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedExceptions.map((exc, i) => {
                  const cfg = severityConfig[exc.severity] ?? severityConfig.low;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={i}
                      className={`border rounded-lg p-4 ${cfg.bg}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Icon
                            className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.iconClass}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span
                                className={`text-xs font-bold tracking-wider ${cfg.textClass}`}
                              >
                                {cfg.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {exc.document_a} × {exc.document_b} —{" "}
                                {exc.field_checked}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {exc.finding}
                            </p>
                            <p className="text-sm text-foreground/80">
                              <span className="font-medium">Action: </span>
                              {exc.recommendation}
                            </p>
                          </div>
                        </div>
                        {exc.estimated_financial_impact_usd > 0 && (
                          <div className="flex items-center gap-1 text-sm font-semibold text-foreground whitespace-nowrap flex-shrink-0">
                            <DollarSign className="h-3.5 w-3.5" />
                            {exc.estimated_financial_impact_usd.toLocaleString()}{" "}
                            risk
                          </div>
                        )}
                      </div>
                      {/* ── Intelligence Feedback Bar — powers MOAT learning loop ── */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5 print:hidden">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mr-1">
                          Your verdict:
                        </span>
                        {feedbackMap[i] ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${FEEDBACK_CONFIG[feedbackMap[i]].cls}`}>
                            {FEEDBACK_CONFIG[feedbackMap[i]].icon}
                            {FEEDBACK_CONFIG[feedbackMap[i]].label}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => recordFeedback(i, exc, "confirmed")}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-red-700 text-red-400 hover:bg-red-950/40 transition-colors"
                              title="This flag is correct — real issue"
                            >
                              <CheckCheck className="h-3 w-3" /> Confirm
                            </button>
                            <button
                              onClick={() => recordFeedback(i, exc, "dismissed")}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-gray-600 text-gray-400 hover:bg-gray-900/40 transition-colors"
                              title="Not an issue for this shipment"
                            >
                              <ThumbsDown className="h-3 w-3" /> Dismiss
                            </button>
                            <button
                              onClick={() => recordFeedback(i, exc, "overridden")}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-amber-700 text-amber-400 hover:bg-amber-950/40 transition-colors"
                              title="Override — acceptable for business reasons"
                            >
                              <ThumbsUp className="h-3 w-3" /> Override
                            </button>
                            <button
                              onClick={() => recordFeedback(i, exc, "escalated")}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-purple-700 text-purple-400 hover:bg-purple-950/40 transition-colors"
                              title="Escalate to broker / compliance team"
                            >
                              <ArrowUpCircle className="h-3 w-3" /> Escalate
                            </button>
                          </>
                        )}
                        <span className="ml-auto text-[9px] text-muted-foreground/50 italic">
                          Improves Orchestra AI for your team
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── HTS Classification Caveat ── */}
          {sortedExceptions.some(e => (e.field_checked || "").toLowerCase().includes("hts") || (e.finding || "").toLowerCase().includes("hts")) && (
            <div className="mt-3 p-3 rounded-lg border border-amber-700 bg-amber-950/40 text-[11px] text-amber-300 leading-relaxed">
              <strong>HTS Classification Note:</strong> Any tariff classification guidance in this report is provided at the 6-digit level only, for internal review purposes. Determination of the full 10-digit HTS subheading constitutes "Customs Business" under 19 USC 1641 and must be finalized by your licensed customs broker prior to CBP entry submission.
            </div>
          )}

          <Separator className="mb-6 mt-6" />

          {/* ── OFAC Screening ── */}
          <div className="mb-6">
            <h3 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              OFAC Sanctions Screening
            </h3>

            {!ofacStatus?.screened ? (
              <div className="p-4 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
                OFAC screening not performed. Enter a consignee name on the
                intake form to trigger automated screening.
              </div>
            ) : ofacStatus.risk === "clear" || ofacStatus.risk === "low" ? (
              <div className="flex items-center gap-3 p-4 bg-green-950/40 border border-green-700 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-green-300">Clear</span>
                  <span className="text-green-400">
                    {" "}
                    — No OFAC matches found for "{ofacStatus.entity}"
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={`flex items-center gap-3 p-4 rounded-lg border ${
                  ["high", "critical"].includes(ofacStatus.risk)
                    ? "bg-red-950/50 border-red-700 text-red-300"
                    : "bg-yellow-950/50 border-yellow-700 text-yellow-300"
                }`}
              >
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-bold uppercase">{ofacStatus.risk} risk</span>
                  <span>
                    {" "}
                    — Potential match for "{ofacStatus.entity}". Manual review
                    required before filing.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── PGA Flags ── */}
          <Separator className="mb-6" />
          <div className="mb-6">
            <h3 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Partner Government Agency (PGA) Flags
              {allPgaFlags.length > 0 && ` (${allPgaFlags.length})`}
            </h3>
            {allPgaFlags.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-green-950/40 border border-green-700 rounded-lg text-green-300 text-sm">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                No PGA requirements detected for this shipment. Standard CBP entry only.
              </div>
            ) : (
              <div className="space-y-2">
                {allPgaFlags
                  .filter((flag) => flag.agency || flag.requirement)
                  .map((flag, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        flag.mandatory
                          ? "bg-orange-950/40 border-orange-700"
                          : "bg-blue-950/40 border-blue-700"
                      }`}
                    >
                      {flag.agency && (
                        <Badge
                          variant={flag.mandatory ? "destructive" : "outline"}
                          className="text-xs mt-0.5 flex-shrink-0"
                        >
                          {flag.agency}
                        </Badge>
                      )}
                      <div className="flex-1 min-w-0">
                        {flag.requirement && (
                          <p className="text-sm font-medium text-foreground">
                            {flag.requirement}
                          </p>
                        )}
                        {flag.reason && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {flag.reason}
                          </p>
                        )}
                        {flag.mandatory && (
                          <p className="text-xs font-semibold text-orange-400 mt-1">
                            Required before filing
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* ── Document Inventory ── */}
          {docCount > 0 && (
            <>
              <Separator className="mb-6" />
              <div className="mb-6">
                <h3 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents Validated ({docCount})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(extractedDocs).map(([docId, doc]) => (
                    <div
                      key={docId}
                      className="flex items-center gap-2.5 p-3 border rounded-lg bg-muted/20"
                    >
                      <div
                        className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                          doc.extractionStatus === "critical_issues"
                            ? "bg-red-500"
                            : doc.extractionStatus === "issues_found"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {doc.documentType || docId}
                        </p>
                        {(doc.warnings?.length ?? 0) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {doc.warnings.length} warning(s)
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Legal Disclaimer ── */}
          <Separator className="mb-6" />
          <div className="text-xs text-muted-foreground leading-relaxed border rounded-lg p-4 bg-muted/20">
            <p className="font-semibold mb-1 text-foreground">
              Important Disclaimer
            </p>
            <p>
              This report is a pre-filing validation recommendation generated
              by Orchestra AI based on the documents provided. It does not
              constitute legal or regulatory advice. Your licensed customs
              broker or freight forwarder remains the agent of record and is
              solely responsible for all filings submitted to CBP and other
              regulatory agencies. Orchestra AI does not file entries, ISFs,
              or any regulatory submissions on your behalf.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
