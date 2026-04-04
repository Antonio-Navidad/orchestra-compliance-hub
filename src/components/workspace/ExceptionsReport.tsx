import { useMemo, useRef } from "react";
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
} from "lucide-react";
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
  consignee?: string;
  crossRefResults: CrossRefResult[];
  extractedDocs: Record<string, ExtractedDocData>;
  ofacStatus?: OfacStatus | null;
  complianceScore?: number;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const severityConfig = {
  critical: {
    label: "CRITICAL",
    bg: "bg-red-50 border-red-200",
    icon: XCircle,
    iconClass: "text-red-500",
    textClass: "text-red-700",
  },
  high: {
    label: "HIGH",
    bg: "bg-orange-50 border-orange-200",
    icon: AlertTriangle,
    iconClass: "text-orange-500",
    textClass: "text-orange-700",
  },
  medium: {
    label: "MEDIUM",
    bg: "bg-yellow-50 border-yellow-200",
    icon: AlertTriangle,
    iconClass: "text-yellow-500",
    textClass: "text-yellow-700",
  },
  low: {
    label: "LOW",
    bg: "bg-blue-50 border-blue-200",
    icon: Flag,
    iconClass: "text-blue-500",
    textClass: "text-blue-700",
  },
} as const;

const overallStatusConfig = {
  clear: {
    label: "CLEARED — READY TO FILE",
    bg: "bg-green-50 border-green-300",
    text: "text-green-800",
    icon: CheckCircle2,
    iconClass: "text-green-600",
  },
  review: {
    label: "REVIEW REQUIRED — RESOLVE EXCEPTIONS BEFORE FILING",
    bg: "bg-yellow-50 border-yellow-400",
    text: "text-yellow-900",
    icon: AlertTriangle,
    iconClass: "text-yellow-600",
  },
  hold: {
    label: "HOLD — CRITICAL ISSUES MUST BE RESOLVED BEFORE FILING",
    bg: "bg-red-50 border-red-400",
    text: "text-red-900",
    icon: XCircle,
    iconClass: "text-red-700",
  },
};

export function ExceptionsReport({
  open,
  onClose,
  shipmentRef,
  consignee,
  crossRefResults,
  extractedDocs,
  ofacStatus,
  complianceScore,
}: ExceptionsReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = () => {
    window.print();
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
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="print:hidden flex-shrink-0"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print / Save PDF
            </Button>
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
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator className="mb-6" />

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
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-green-800">Clear</span>
                  <span className="text-green-700">
                    {" "}
                    — No OFAC matches found for "{ofacStatus.entity}"
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={`flex items-center gap-3 p-4 rounded-lg border ${
                  ["high", "critical"].includes(ofacStatus.risk)
                    ? "bg-red-50 border-red-300 text-red-800"
                    : "bg-yellow-50 border-yellow-300 text-yellow-800"
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
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
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
                          ? "bg-orange-50 border-orange-200"
                          : "bg-blue-50 border-blue-200"
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
                          <p className="text-sm font-medium text-gray-900">
                            {flag.requirement}
                          </p>
                        )}
                        {flag.reason && (
                          <p className="text-xs text-gray-700 mt-0.5">
                            {flag.reason}
                          </p>
                        )}
                        {flag.mandatory && (
                          <p className="text-xs font-semibold text-orange-700 mt-1">
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
