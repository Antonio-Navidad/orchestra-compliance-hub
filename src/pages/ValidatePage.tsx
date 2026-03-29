/**
 * ValidatePage — the simplified core experience.
 *
 * One screen. One action. Upload 3 documents → get an exceptions report.
 * No tabs, no sidebar content, no wizard. This is the product stripped to
 * its essential value.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useValidation } from "@/hooks/useValidation";
import { useCredits } from "@/hooks/useCredits";
import type { CrossRefResult, ExtractedDocData } from "@/hooks/useDocExtraction";
import { ExceptionsReport } from "@/components/workspace/ExceptionsReport";
import { PaywallModal } from "@/components/billing/PaywallModal";
import type { OfacStatus } from "@/components/workspace/ExceptionsReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  FileText,
  Package,
  DollarSign,
  Upload,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Zap,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── The three documents that power Orchestra's core validation ──────────────
const DOC_SLOTS = [
  {
    id: "bill_of_lading",
    label: "Bill of Lading",
    description: "Container, seal, notify party, consignee",
    Icon: Package,
    accent: "blue",
  },
  {
    id: "commercial_invoice",
    label: "Commercial Invoice",
    description: "Declared value, HTS codes, goods description",
    Icon: DollarSign,
    accent: "emerald",
  },
  {
    id: "packing_list",
    label: "Packing List",
    description: "Weight, carton count, line items",
    Icon: FileText,
    accent: "violet",
  },
] as const;

type DocSlotId = (typeof DOC_SLOTS)[number]["id"];

const ACCENT_CLASSES: Record<string, { border: string; bg: string; icon: string }> = {
  blue:    { border: "border-blue-200",   bg: "bg-blue-50/60",   icon: "text-blue-500"   },
  emerald: { border: "border-emerald-200", bg: "bg-emerald-50/60", icon: "text-emerald-500" },
  violet:  { border: "border-violet-200", bg: "bg-violet-50/60",  icon: "text-violet-500"  },
};

const OFAC_BADGE: Record<string, { label: string; cls: string }> = {
  clear:    { label: "OFAC: Clear",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  low:      { label: "OFAC: Low risk", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  medium:   { label: "OFAC: Review",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
  high:     { label: "OFAC: High risk", cls: "bg-red-100 text-red-700 border-red-200" },
  critical: { label: "OFAC: Critical", cls: "bg-red-100 text-red-700 border-red-200" },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function ValidatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Shipment lifecycle ──
  const [shipmentId]     = useState(() => crypto.randomUUID());
  const [shipmentCreated, setShipmentCreated] = useState(false);

  // ── Form state ──
  const [shipmentName, setShipmentName] = useState("");
  const [consignee, setConsignee] = useState("");

  // ── OFAC screening ──
  const [ofacStatus, setOfacStatus]   = useState<OfacStatus | null>(null);
  const [ofacLoading, setOfacLoading] = useState(false);
  const ofacTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Report & paywall ──
  const [reportOpen,  setReportOpen]  = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // ── Phase ──
  const [phase, setPhase] = useState<"upload" | "processing" | "done">("upload");

  // ── AI credits ──
  const { creditsRemaining, isSubscribed, isLoading: creditsLoading, deductCredit } = useCredits();

  // ── Doc validation (extract → crossref pipeline) ──
  const validation = useValidation({
    shipmentId,
    shipmentMode: "ocean",
    commodityType: "general",
    countryOfOrigin: "",
  });

  const { slots, result, isRunning, extractDocument: validationExtract, runCrossRef } = validation;

  // ── Derive legacy-compatible shapes for ExceptionsReport ──
  const extractedDocs: Record<string, ExtractedDocData> = Object.fromEntries(
    Object.entries(slots)
      .filter(([, s]) => s.status === "done" && s.extractedData)
      .map(([docType, s]) => [
        docType,
        {
          docId: docType,
          documentType: docType,
          extractedData: s.extractedData!,
          fieldDetails: Object.entries(s.extractedData || {})
            .slice(0, 5)
            .map(([field, value]) => ({
              field,
              value,
              confidence: 0.9,
              source_location: docType,
            })),
          warnings: s.warnings,
          pgaFlags: s.pgaFlags,
          extractionStatus: "complete",
        } satisfies ExtractedDocData,
      ])
  );

  const crossRefResults: CrossRefResult[] = result?.findings ?? [];

  const processingDocs = new Set(
    Object.entries(slots)
      .filter(([, s]) => s.status === "extracting")
      .map(([k]) => k)
  );

  // ── When cross-ref results arrive → move to done ──
  useEffect(() => {
    if (result) setPhase("done");
  }, [result]);

  // ── When any doc starts processing → show processing phase ──
  const uploadedSlotIds = DOC_SLOTS.map((s) => s.id).filter((id) => id in extractedDocs);
  useEffect(() => {
    if (phase === "upload" && (processingDocs.size > 0 || uploadedSlotIds.length >= 2)) {
      setPhase("processing");
    }
  }, [uploadedSlotIds.length, processingDocs.size, phase]);

  // ── Auto-trigger crossref when 2+ docs are extracted ──
  const prevExtractedCount = useRef(0);
  useEffect(() => {
    const doneCount = Object.values(slots).filter((s) => s.status === "done").length;
    if (doneCount >= 2 && doneCount !== prevExtractedCount.current && !isRunning) {
      prevExtractedCount.current = doneCount;
      runCrossRef();
    }
  }, [slots, isRunning, runCrossRef]);

  // ── Auto-create a minimal shipment row on first upload ──
  const ensureShipmentExists = useCallback(async () => {
    if (shipmentCreated || !user?.id) return;
    const { error } = await supabase.from("shipments").insert({
      shipment_id: shipmentId,
      user_id: user.id,
      shipment_name: shipmentName || consignee || "Untitled Shipment",
      consignee: consignee || "Pending",
      status: "new",
      hs_code: "0000.00",
    } as any);
    if (!error) setShipmentCreated(true);
  }, [shipmentId, shipmentCreated, user?.id, consignee]);

  // ── OFAC auto-screen on consignee change (debounced 1.5s) ──
  useEffect(() => {
    if (ofacTimer.current) clearTimeout(ofacTimer.current);
    const name = consignee.trim();
    if (name.length < 3) { setOfacStatus(null); return; }

    ofacTimer.current = setTimeout(async () => {
      setOfacLoading(true);
      try {
        const { data } = await supabase.functions.invoke("sanctions-screen", {
          body: { entity_name: name, shipment_id: shipmentId },
        });
        if (data) {
          setOfacStatus({
            risk: data.risk_level ?? "clear",
            entity: name,
            screened: true,
          });
        }
      } catch {
        // silent — OFAC is best-effort
      } finally {
        setOfacLoading(false);
      }
    }, 1500);
  }, [consignee, shipmentId]);

  // ── Handle file drop / selection for a slot ──
  const handleFile = useCallback(
    async (slotId: DocSlotId, file: File) => {
      await ensureShipmentExists();
      await validationExtract(slotId, file);
    },
    [ensureShipmentExists, validationExtract]
  );

  // ── Open the report (with credit check) ──
  const handleOpenReport = async () => {
    if (isSubscribed) { setReportOpen(true); return; }
    const ok = await deductCredit();
    if (ok) setReportOpen(true);
    else    setPaywallOpen(true);
  };

  // ── Reset ──
  const handleReset = () => {
    setPhase("upload");
    setConsignee("");
    setOfacStatus(null);
    setReportOpen(false);
    navigate(0); // refresh to clear hook state
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-background">
      {/* ── Page-level action bar (sits below AppLayout's h-10 global header) ── */}
      <div className="border-b bg-card/60 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 h-11 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm tracking-tight text-foreground">Validate Shipment</span>
            <Badge variant="outline" className="text-[10px] font-mono hidden sm:inline-flex">Pre-Filing · No ACE Required</Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Credit indicator */}
            {!creditsLoading && (
              isSubscribed ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                  <Zap className="h-3 w-3" /> Unlimited
                </span>
              ) : (
                <span className={cn(
                  "flex items-center gap-1 text-[11px] font-semibold",
                  creditsRemaining === 0 ? "text-destructive" :
                  creditsRemaining <= 2   ? "text-amber-600"  : "text-muted-foreground"
                )}>
                  <Sparkles className="h-3 w-3" />
                  {creditsRemaining} credit{creditsRemaining !== 1 ? "s" : ""} left
                </span>
              )
            )}
            {phase !== "upload" && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> New Validation
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* ── Heading ── */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Validate a Shipment
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your documents below. Orchestra AI cross-references everything and returns
            a green / amber / red exceptions report in under 90 seconds.
          </p>
        </div>

        {/* ── Shipment Name ── */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Shipment Name
          </label>
          <Input
            placeholder="e.g. Amazon BOL-2025-001 or Colombia Import June"
            value={shipmentName}
            onChange={(e) => setShipmentName(e.target.value)}
            disabled={phase === "done"}
          />
          <p className="text-[11px] text-muted-foreground">
            A label to identify this shipment in your history. You can always rename it later.
          </p>
        </div>

        {/* ── Consignee + OFAC ── */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Consignee Name
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="e.g. Acme International Corp"
                value={consignee}
                onChange={(e) => setConsignee(e.target.value)}
                className="pr-10"
                disabled={phase === "done"}
              />
              {ofacLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {ofacStatus?.screened && !ofacLoading && (
              <span className={cn(
                "flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
                OFAC_BADGE[ofacStatus.risk]?.cls
              )}>
                {OFAC_BADGE[ofacStatus.risk]?.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            OFAC sanctions screen auto-runs as you type. Takes 1–2 seconds.
          </p>
        </div>

        {/* ── Document Slots ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Shipment Documents
            </label>
            <span className="text-[11px] text-muted-foreground">
              {uploadedSlotIds.length} of {DOC_SLOTS.length} uploaded
              {uploadedSlotIds.length >= 2 && " · AI analysis running"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {DOC_SLOTS.map((slot) => {
              const isUploaded  = slot.id in extractedDocs;
              const isProcessing = processingDocs.has(slot.id);
              const doc = extractedDocs[slot.id];
              const accents = ACCENT_CLASSES[slot.accent];

              return (
                <DocSlot
                  key={slot.id}
                  slot={slot}
                  isUploaded={isUploaded}
                  isProcessing={isProcessing}
                  doc={doc}
                  accents={accents}
                  disabled={phase === "done"}
                  onFile={(f) => handleFile(slot.id, f)}
                />
              );
            })}
          </div>

          {/* Additional docs hint */}
          {phase === "upload" && uploadedSlotIds.length > 0 && (
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              You can also upload additional documents (ISF, Certificate of Origin, Air Waybill) for a more complete analysis.
            </p>
          )}
        </div>

        {/* ── Processing indicator ── */}
        {phase === "processing" && (
          <ValidationStepper slots={slots} isRunning={isRunning} />
        )}

        {/* ── Done state: summary + report CTA ── */}
        {phase === "done" && (
          <div className="space-y-4">
            {/* Summary bar */}
            <ExceptionsSummaryBar crossRefResults={crossRefResults} ofacStatus={ofacStatus} />

            {/* CTA */}
            <Button
              onClick={handleOpenReport}
              size="lg"
              className="w-full gap-2 text-sm font-bold"
            >
              <FileText className="h-4 w-4" />
              View Full Exceptions Report
              {!isSubscribed && creditsRemaining <= 2 && creditsRemaining > 0 && (
                <Badge variant="outline" className="ml-1 text-[10px] border-white/40 text-white/80">
                  Uses 1 credit
                </Badge>
              )}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
              Report includes print / PDF export · Your forwarder remains the agent of record
            </p>
          </div>
        )}

      </div>

      {/* ── Modals ── */}
      <ExceptionsReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        shipmentRef={`SHP-${shipmentId.slice(0, 8).toUpperCase()}`}
        consignee={consignee}
        crossRefResults={crossRefResults}
        extractedDocs={extractedDocs}
        ofacStatus={ofacStatus}
        complianceScore={result?.readinessScore}
      />

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        creditsUsed={5}
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

interface DocSlotProps {
  slot: (typeof DOC_SLOTS)[number];
  isUploaded: boolean;
  isProcessing: boolean;
  doc: any;
  accents: { border: string; bg: string; icon: string };
  disabled: boolean;
  onFile: (f: File) => void;
}

function DocSlot({ slot, isUploaded, isProcessing, doc, accents, disabled, onFile }: DocSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { Icon } = slot;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const keyField = doc?.fieldDetails?.[0];

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-4 transition-all cursor-pointer select-none",
        isUploaded
          ? `${accents.border} ${accents.bg}`
          : dragOver
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-dashed border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
        disabled && !isUploaded && "opacity-50 cursor-default"
      )}
      onClick={() => !disabled && !isUploaded && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.tiff,.webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      <div className="flex flex-col items-center text-center gap-2 min-h-[110px] justify-center">
        {isProcessing ? (
          <>
            <Loader2 className={cn("h-7 w-7 animate-spin", accents.icon)} />
            <p className="text-xs font-medium text-muted-foreground">Analyzing...</p>
          </>
        ) : isUploaded ? (
          <>
            <CheckCircle2 className={cn("h-7 w-7", accents.icon)} />
            <div>
              <p className="text-xs font-bold text-foreground">{slot.label}</p>
              {doc?.extractionStatus === "critical_issues" ? (
                <p className="text-[10px] text-destructive mt-0.5">Issues found</p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {keyField ? `${keyField.field}: ${String(keyField.value).slice(0, 22)}` : "Extracted"}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn("p-2 rounded-lg bg-muted/60")}>
                <Icon className={cn("h-5 w-5", accents.icon)} />
              </div>
              <p className="text-xs font-semibold text-foreground leading-tight">{slot.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{slot.description}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-1">
              <Upload className="h-3 w-3" />
              <span>Click or drop</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ValidationStepper ─────────────────────────────────────────────────────

function ValidationStepper({
  slots,
  isRunning,
}: {
  slots: Record<string, import("@/hooks/useValidation").DocumentSlot>;
  isRunning: boolean;
}) {
  const slotValues = Object.values(slots);
  const totalDocs = slotValues.length;
  const doneCount = slotValues.filter(s => s.status === "done").length;
  const extractingCount = slotValues.filter(s => s.status === "extracting").length;

  // Step states: "pending" | "active" | "done"
  const uploadStep = totalDocs > 0 ? "done" : "pending";
  const extractStep =
    extractingCount > 0 ? "active"
    : doneCount > 0     ? "done"
    : "pending";
  const crossRefStep =
    isRunning       ? "active"
    : doneCount >= 2 && !isRunning && extractingCount === 0 ? "done"
    : "pending";

  const steps: Array<{ label: string; sub: string; state: "pending" | "active" | "done" }> = [
    { label: "Upload",           sub: `${totalDocs} document${totalDocs !== 1 ? "s" : ""} received`,  state: uploadStep },
    { label: "OCR Extraction",   sub: `${doneCount} of ${totalDocs} extracted`,                        state: extractStep },
    { label: "Cross-Reference",  sub: "Matching fields across documents",                              state: crossRefStep },
    { label: "Report Ready",     sub: "Exceptions flagged and scored",                                 state: "pending" },
  ];

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-start gap-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex-1 flex flex-col items-center">
            {/* connector + icon row */}
            <div className="flex items-center w-full">
              {/* left connector */}
              <div className={cn(
                "flex-1 h-0.5 transition-colors",
                i === 0 ? "invisible" :
                steps[i - 1].state === "done" ? "bg-primary" : "bg-border"
              )} />
              {/* icon */}
              <div className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                step.state === "done"   ? "bg-primary border-primary text-primary-foreground" :
                step.state === "active" ? "bg-background border-primary text-primary" :
                                         "bg-muted border-border text-muted-foreground"
              )}>
                {step.state === "done" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : step.state === "active" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              {/* right connector */}
              <div className={cn(
                "flex-1 h-0.5 transition-colors",
                i === steps.length - 1 ? "invisible" :
                step.state === "done" ? "bg-primary" : "bg-border"
              )} />
            </div>

            {/* label */}
            <div className="mt-2 text-center px-1">
              <p className={cn(
                "text-xs font-semibold",
                step.state === "active" ? "text-primary" :
                step.state === "done"   ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{step.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* current action message */}
      <p className="text-center text-xs text-muted-foreground mt-5">
        {extractingCount > 0
          ? `Extracting ${extractingCount} document${extractingCount !== 1 ? "s" : ""}…`
          : isRunning
          ? "Cross-referencing fields · HTS pre-validation · PGA flag detection…"
          : "Waiting for documents…"}
      </p>
    </div>
  );
}

function ExceptionsSummaryBar({
  crossRefResults,
  ofacStatus,
}: {
  crossRefResults: any[];
  ofacStatus: OfacStatus | null;
}) {
  const critical = crossRefResults.filter((r) => r.severity === "critical").length;
  const high     = crossRefResults.filter((r) => r.severity === "high").length;
  const medium   = crossRefResults.filter((r) => r.severity === "medium").length;
  const total    = crossRefResults.filter((r) => {
    const t = (r.finding + " " + r.recommendation).toLowerCase();
    return !t.includes("no action needed") && !t.includes("no discrepancy found");
  }).length;

  const overallClear = total === 0 && (!ofacStatus?.screened || ofacStatus.risk === "clear" || ofacStatus.risk === "low");

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 flex items-center gap-4",
      overallClear  ? "border-emerald-300 bg-emerald-50"  :
      critical > 0  ? "border-red-300 bg-red-50"          :
      high > 0      ? "border-orange-300 bg-orange-50"    :
                      "border-yellow-300 bg-yellow-50"
    )}>
      {overallClear ? (
        <CheckCircle2 className="h-7 w-7 text-emerald-600 flex-shrink-0" />
      ) : critical > 0 ? (
        <XCircle className="h-7 w-7 text-red-600 flex-shrink-0" />
      ) : (
        <AlertTriangle className="h-7 w-7 text-amber-600 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-bold",
          overallClear ? "text-emerald-800" : critical > 0 ? "text-red-800" : "text-amber-800"
        )}>
          {overallClear
            ? "All Clear — No exceptions detected"
            : critical > 0
            ? `Hold — ${critical} critical issue${critical !== 1 ? "s" : ""} must be resolved before filing`
            : `Review Required — ${total} exception${total !== 1 ? "s" : ""} found`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {total > 0 && `${critical > 0 ? `${critical} critical · ` : ""}${high > 0 ? `${high} high · ` : ""}${medium > 0 ? `${medium} medium` : ""}`.replace(/\s·\s$/, "")}
          {ofacStatus?.screened && ofacStatus.risk !== "clear" && ` · OFAC: ${ofacStatus.risk} risk on "${ofacStatus.entity}"`}
        </p>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        {critical > 0 && <Badge variant="destructive" className="text-[10px]">{critical} Critical</Badge>}
        {high > 0     && <Badge className="bg-orange-500 text-white text-[10px]">{high} High</Badge>}
        {medium > 0   && <Badge className="bg-amber-500 text-white text-[10px]">{medium} Med</Badge>}
      </div>
    </div>
  );
}
