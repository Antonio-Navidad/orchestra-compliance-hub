import { useState } from "react";
import { Printer, Download, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, ShieldAlert, Clock, FileText, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CrossRefResult } from "@/hooks/useDocExtraction";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExceptionsReportProps {
  shipmentId: string;
  shipperName?: string;
  consignee?: string;
  hsCode?: string;
  declaredValue?: number;
  mode?: string;
  originCountry?: string;
  destinationCountry?: string;
  crossRefResults: CrossRefResult[];
  ofacStatus?: {
    risk: "clear" | "low" | "medium" | "high" | "critical";
    entity: string;
    screened: boolean;
  } | null;
  htsClassification?: {
    hts_code: string;
    confidence: number;
    duty_rate?: string;
    add_cvd_flag?: boolean;
    description?: string;
  } | null;
  uploadedDocTypes?: string[];
  generatedAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  bill_of_lading: "Bill of Lading",
  air_waybill: "Air Waybill",
  isf_filing: "ISF 10+2",
  certificate_of_origin: "Certificate of Origin",
  fta_certificate: "FTA Certificate",
  entry_summary: "Entry Summary (CF-7501)",
  customs_bond: "Customs Bond",
};

const REQUIRED_DOCS = ["commercial_invoice", "packing_list", "bill_of_lading"];

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docLabel(id: string) {
  return DOC_LABELS[id] || id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function severityLabel(s: string) {
  return { critical: "Action Required", high: "Action Required", medium: "Review Recommended", low: "Advisory" }[s] || s;
}

function severityColor(s: string) {
  return {
    critical: "text-red-400 bg-red-950/40 border-red-800/60",
    high: "text-orange-400 bg-orange-950/40 border-orange-800/60",
    medium: "text-amber-400 bg-amber-950/40 border-amber-800/60",
    low: "text-slate-400 bg-slate-800/40 border-slate-700/40",
  }[s] || "text-slate-400 bg-slate-800/40 border-slate-700/40";
}

function ofacColor(risk: string) {
  return {
    clear: "text-green-400 bg-green-950/40 border-green-800/60",
    low: "text-green-400 bg-green-950/40 border-green-800/60",
    medium: "text-amber-400 bg-amber-950/40 border-amber-800/60",
    high: "text-red-400 bg-red-950/40 border-red-800/60",
    critical: "text-red-400 bg-red-950/40 border-red-800/60",
  }[risk] || "text-slate-400 bg-slate-800/40 border-slate-700/40";
}

function overallStatus(
  crossRefResults: CrossRefResult[],
  ofacStatus: ExceptionsReportProps["ofacStatus"],
  uploadedDocTypes: string[]
): "clear" | "review" | "action" {
  const hasOfacHit = ofacStatus && !["clear", "low"].includes(ofacStatus.risk);
  const hasCriticalOrHigh = crossRefResults.some((r) => r.severity === "critical" || r.severity === "high");
  const missingRequired = REQUIRED_DOCS.some((d) => !uploadedDocTypes.includes(d));
  if (hasOfacHit || hasCriticalOrHigh || missingRequired) return "action";
  const hasMedium = crossRefResults.some((r) => r.severity === "medium");
  if (hasMedium) return "review";
  return "clear";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReviewNote({ id, onSave }: { id: string; onSave: (id: string, note: string) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <span className="text-xs text-green-400 flex items-center gap-1">
        <CheckCircle2 size={12} /> Marked reviewed
      </span>
    );
  }

  return open ? (
    <div className="mt-2 space-y-1.5">
      <Textarea
        className="text-xs h-16 bg-slate-900 border-slate-700 resize-none"
        placeholder="Add a note (optional) — logged for audit trail"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-6 text-xs px-2 bg-green-700 hover:bg-green-600"
          onClick={() => {
            onSave(id, note);
            setSaved(true);
          }}
        >
          Mark Reviewed
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  ) : (
    <button
      className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
      onClick={() => setOpen(true)}
    >
      Mark as reviewed
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ExceptionsReport({
  shipmentId,
  shipperName,
  consignee,
  hsCode,
  declaredValue,
  mode,
  originCountry,
  destinationCountry,
  crossRefResults,
  ofacStatus,
  htsClassification,
  uploadedDocTypes = [],
  generatedAt,
}: ExceptionsReportProps) {
  const [reviewLog, setReviewLog] = useState<Record<string, string>>({});

  const handleReview = (id: string, note: string) => {
    setReviewLog((prev) => ({ ...prev, [id]: note }));
  };

  const sortedIssues = [...crossRefResults]
    .filter((r) => !r.resolved && !reviewLog[r.id || ""])
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const resolvedIssues = crossRefResults.filter((r) => r.resolved || reviewLog[r.id || ""]);

  const missingDocs = REQUIRED_DOCS.filter((d) => !uploadedDocTypes.includes(d));
  const status = overallStatus(crossRefResults, ofacStatus, uploadedDocTypes);

  const reportTime = generatedAt
    ? new Date(generatedAt).toLocaleString()
    : new Date().toLocaleString();

  const totalFinancialRisk = sortedIssues.reduce(
    (sum, r) => sum + (r.estimated_financial_impact_usd || 0),
    0
  );

  const handlePrint = () => window.print();

  return (
    <div className="font-mono text-sm print:text-black print:bg-white" id="exceptions-report">
      {/* ── Header ── */}
      <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-5 space-y-4 print:border-gray-300 print:bg-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">Pre-Filing Validation Report</span>
            </div>
            <h2 className="text-xl font-bold text-white print:text-black">{shipmentId}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Generated {reportTime} · Not a filed entry · For internal review only
            </p>
          </div>

          {/* Overall status pill */}
          <div
            className={cn(
              "rounded-lg border px-4 py-2 flex items-center gap-2 text-sm font-bold",
              status === "clear"
                ? "bg-green-950/60 border-green-700 text-green-300"
                : status === "review"
                ? "bg-amber-950/60 border-amber-700 text-amber-300"
                : "bg-red-950/60 border-red-700 text-red-300"
            )}
          >
            {status === "clear" ? (
              <><ShieldCheck size={16} /> Ready to File</>
            ) : status === "review" ? (
              <><AlertTriangle size={16} /> Review Before Filing</>
            ) : (
              <><XCircle size={16} /> Action Required</>
            )}
          </div>
        </div>

        {/* Shipment metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs border-t border-slate-800 pt-3 print:border-gray-200">
          {consignee && (
            <>
              <span className="text-slate-500">Consignee</span>
              <span className="text-slate-200 print:text-black col-span-1 truncate">{consignee}</span>
            </>
          )}
          {shipperName && (
            <>
              <span className="text-slate-500">Shipper</span>
              <span className="text-slate-200 print:text-black col-span-1 truncate">{shipperName}</span>
            </>
          )}
          {mode && (
            <>
              <span className="text-slate-500">Mode</span>
              <span className="text-slate-200 print:text-black uppercase">{mode}</span>
            </>
          )}
          {declaredValue && (
            <>
              <span className="text-slate-500">Declared Value</span>
              <span className="text-slate-200 print:text-black">${declaredValue.toLocaleString()}</span>
            </>
          )}
          {originCountry && (
            <>
              <span className="text-slate-500">Origin</span>
              <span className="text-slate-200 print:text-black">{originCountry}</span>
            </>
          )}
          {destinationCountry && (
            <>
              <span className="text-slate-500">Destination</span>
              <span className="text-slate-200 print:text-black">{destinationCountry}</span>
            </>
          )}
          {hsCode && (
            <>
              <span className="text-slate-500">HTS Code</span>
              <span className="text-slate-200 print:text-black">{hsCode}</span>
            </>
          )}
          {totalFinancialRisk > 0 && (
            <>
              <span className="text-slate-500">Est. Exposure</span>
              <span className="text-red-400 font-bold">${totalFinancialRisk.toLocaleString()}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Print / Download buttons ── */}
      <div className="flex gap-2 mt-3 print:hidden">
        <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5" onClick={handlePrint}>
          <Printer size={13} /> Print / Save PDF
        </Button>
        <span className="text-xs text-slate-500 self-center">
          {sortedIssues.length} open issue{sortedIssues.length !== 1 ? "s" : ""} ·{" "}
          {resolvedIssues.length} reviewed
        </span>
      </div>

      {/* ── Section 1: Document Status ── */}
      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/60 overflow-hidden print:border-gray-300">
        <div className="px-4 py-2.5 border-b border-slate-800 print:border-gray-200">
          <span className="text-[10px] tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
            <FileText size={12} /> Document Status
          </span>
        </div>
        <div className="divide-y divide-slate-800 print:divide-gray-200">
          {/* Required docs */}
          {REQUIRED_DOCS.map((docId) => {
            const present = uploadedDocTypes.includes(docId);
            const docIssues = sortedIssues.filter(
              (r) => r.document_a === docId || r.document_b === docId
            );
            const hasAction = docIssues.some((r) => r.severity === "critical" || r.severity === "high");
            const hasReview = !hasAction && docIssues.some((r) => r.severity === "medium");

            const statusColor = !present
              ? "text-red-400"
              : hasAction
              ? "text-orange-400"
              : hasReview
              ? "text-amber-400"
              : "text-green-400";

            const StatusIcon = !present
              ? XCircle
              : hasAction
              ? AlertTriangle
              : hasReview
              ? AlertTriangle
              : CheckCircle2;

            return (
              <div key={docId} className="flex items-center justify-between px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <StatusIcon size={14} className={statusColor} />
                  <span className="text-slate-200 print:text-black">{docLabel(docId)}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-700">
                    Required
                  </Badge>
                </div>
                <span className={cn("font-bold", statusColor)}>
                  {!present
                    ? "Missing"
                    : hasAction
                    ? `${docIssues.filter((r) => ["critical", "high"].includes(r.severity)).length} issue${docIssues.filter((r) => ["critical", "high"].includes(r.severity)).length !== 1 ? "s" : ""}`
                    : hasReview
                    ? "Review"
                    : "✓ Clear"}
                </span>
              </div>
            );
          })}
          {/* Optional uploaded docs */}
          {uploadedDocTypes
            .filter((d) => !REQUIRED_DOCS.includes(d))
            .map((docId) => {
              const docIssues = sortedIssues.filter(
                (r) => r.document_a === docId || r.document_b === docId
              );
              const hasIssues = docIssues.length > 0;
              return (
                <div key={docId} className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    {hasIssues ? (
                      <AlertTriangle size={14} className="text-amber-400" />
                    ) : (
                      <CheckCircle2 size={14} className="text-green-400" />
                    )}
                    <span className="text-slate-200 print:text-black">{docLabel(docId)}</span>
                  </div>
                  <span className={cn("font-bold", hasIssues ? "text-amber-400" : "text-green-400")}>
                    {hasIssues ? `${docIssues.length} issue${docIssues.length !== 1 ? "s" : ""}` : "✓ Clear"}
                  </span>
                </div>
              );
            })}
          {/* Missing required docs warning */}
          {missingDocs.length > 0 && (
            <div className="px-4 py-3 bg-red-950/20 text-xs text-red-300">
              <span className="font-bold">⚠ Missing required documents:</span>{" "}
              {missingDocs.map(docLabel).join(", ")} — ISF cannot be filed without these.
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: OFAC Screening ── */}
      {ofacStatus && (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 overflow-hidden print:border-gray-300">
          <div className="px-4 py-2.5 border-b border-slate-800 print:border-gray-200">
            <span className="text-[10px] tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
              <ShieldAlert size={12} /> OFAC Sanctions Screening
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <p className="text-slate-300">
                Entity screened:{" "}
                <span className="text-slate-100 font-bold">{ofacStatus.entity || consignee || "—"}</span>
              </p>
              <p className="text-slate-500">
                Against OFAC SDN List, Consolidated Sanctions List
              </p>
            </div>
            <div
              className={cn(
                "rounded border px-3 py-1.5 font-bold text-xs",
                ofacColor(ofacStatus.risk)
              )}
            >
              {["clear", "low"].includes(ofacStatus.risk) ? (
                <span className="flex items-center gap-1"><ShieldCheck size={12} /> CLEAR</span>
              ) : (
                <span className="flex items-center gap-1"><ShieldAlert size={12} /> {ofacStatus.risk.toUpperCase()} RISK</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Section 3: HTS Classification ── */}
      {htsClassification && (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 overflow-hidden print:border-gray-300">
          <div className="px-4 py-2.5 border-b border-slate-800 print:border-gray-200">
            <span className="text-[10px] tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
              <Info size={12} /> HTS Classification (AI Recommendation)
            </span>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
            <span className="text-slate-500">HTS Code</span>
            <span className="text-slate-100 font-bold">{htsClassification.hts_code}</span>
            <span className="text-slate-500">Confidence</span>
            <span
              className={cn(
                "font-bold",
                htsClassification.confidence >= 0.85
                  ? "text-green-400"
                  : htsClassification.confidence >= 0.65
                  ? "text-amber-400"
                  : "text-red-400"
              )}
            >
              {Math.round(htsClassification.confidence * 100)}%
            </span>
            {htsClassification.duty_rate && (
              <>
                <span className="text-slate-500">Duty Rate</span>
                <span className="text-slate-200">{htsClassification.duty_rate}</span>
              </>
            )}
            {htsClassification.add_cvd_flag && (
              <>
                <span className="text-slate-500">ADD/CVD</span>
                <span className="text-amber-400 font-bold">⚠ Flag — verify antidumping duties</span>
              </>
            )}
            {htsClassification.description && (
              <>
                <span className="text-slate-500">Description</span>
                <span className="text-slate-300 col-span-3">{htsClassification.description}</span>
              </>
            )}
          </div>
          <div className="px-4 pb-3">
            <p className="text-[10px] text-slate-600">
              AI recommendation only. The licensed customs broker or forwarder is the filing agent of record and bears responsibility for the final classification.
            </p>
          </div>
        </div>
      )}

      {/* ── Section 4: Open Issues ── */}
      {sortedIssues.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 overflow-hidden print:border-gray-300">
          <div className="px-4 py-2.5 border-b border-slate-800 print:border-gray-200 flex items-center justify-between">
            <span className="text-[10px] tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
              <AlertTriangle size={12} /> Open Issues ({sortedIssues.length})
            </span>
            {totalFinancialRisk > 0 && (
              <span className="text-xs text-red-400 font-bold">
                Est. ${totalFinancialRisk.toLocaleString()} exposure
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-800/60 print:divide-gray-200">
            {sortedIssues.map((issue, i) => (
              <div key={issue.id || i} className="px-4 py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
                        severityColor(issue.severity)
                      )}
                    >
                      {severityLabel(issue.severity)}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {docLabel(issue.document_a)} ↔ {docLabel(issue.document_b)}
                    </span>
                    <span className="text-slate-600 text-[10px]">Field: {issue.field_checked}</span>
                  </div>
                  {issue.estimated_financial_impact_usd > 0 && (
                    <span className="text-xs text-orange-400 font-bold shrink-0">
                      ${issue.estimated_financial_impact_usd.toLocaleString()} risk
                    </span>
                  )}
                </div>
                <p className="text-slate-200 text-xs print:text-black">{issue.finding}</p>
                {issue.recommendation && (
                  <p className="text-slate-400 text-xs">
                    <span className="text-slate-500">Recommended action: </span>
                    {issue.recommendation}
                  </p>
                )}
                <div className="print:hidden">
                  <ReviewNote id={issue.id || String(i)} onSave={handleReview} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 5: Reviewed / Resolved ── */}
      {resolvedIssues.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/30 overflow-hidden print:border-gray-200">
          <div className="px-4 py-2.5 border-b border-slate-800 print:border-gray-200">
            <span className="text-[10px] tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Reviewed ({resolvedIssues.length})
            </span>
          </div>
          <div className="divide-y divide-slate-800/40 print:divide-gray-100">
            {resolvedIssues.map((issue, i) => (
              <div key={issue.id || i} className="px-4 py-2.5 flex items-start justify-between gap-3 opacity-60">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">{issue.severity}</span>
                  <span className="mx-2 text-slate-700">·</span>
                  <span className="text-xs text-slate-400">{issue.field_checked}</span>
                  <p className="text-xs text-slate-500 mt-0.5">{issue.finding}</p>
                </div>
                <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 6: All Clear ── */}
      {status === "clear" && sortedIssues.length === 0 && missingDocs.length === 0 && (
        <div className="mt-3 rounded-lg border border-green-800/60 bg-green-950/30 px-4 py-4 flex items-center gap-3">
          <ShieldCheck size={20} className="text-green-400 shrink-0" />
          <div>
            <p className="text-green-300 font-bold text-sm">No exceptions found</p>
            <p className="text-green-500 text-xs mt-0.5">
              All uploaded documents are consistent. This shipment appears ready for ISF filing. Final review by a licensed customs broker is required.
            </p>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-4 px-1 text-[10px] text-slate-600 space-y-0.5 print:text-gray-400 print:border-t print:border-gray-200 print:pt-2">
        <p>Report ID: {shipmentId}-{Date.now().toString(36).toUpperCase()}</p>
        <p>
          Orchestra AI · Pre-filing validation firewall · Not a substitute for advice from a licensed customs broker.
          The forwarder or broker is the filing agent of record.
        </p>
        <p>Orchestra does not file entries with CBP. This report does not constitute an ABI filing or entry submission.</p>
      </div>
    </div>
  );
}
