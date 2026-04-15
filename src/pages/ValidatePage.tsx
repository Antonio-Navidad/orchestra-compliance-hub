/**
 * ValidatePage — the simplified core experience.
 *
 * One screen. One action. Upload 3 documents → get an exceptions report.
 * No tabs, no sidebar content, no wizard. This is the product stripped to
 * its essential value.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
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
  Ship,
  Truck,
  ArrowRight,
  Anchor,
  ClipboardList,
  Globe,
  Lock,
  BadgeAlert,
  BookmarkPlus,
  AlertOctagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── The three documents that power Orchestra's core validation ──────────────
interface DocSlotDef {
  id: string;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

type DocSlotId = string;

const OCEAN_TRANSPORT_SLOT: DocSlotDef = {
  id: "bill_of_lading",
  label: "Bill of Lading",
  description: "Container, seal, notify party, consignee",
  Icon: Package,
  accent: "blue",
};

// Mexico & Canada land: truck BOL uses a dedicated extraction schema
const LAND_TRANSPORT_SLOT: DocSlotDef = {
  id: "truck_bol_carrier_manifest",
  label: "Truck BOL / Carrier Manifest",
  description: "PAPS number, carrier, truck/trailer, crossing date",
  Icon: Truck,
  accent: "blue",
};

const CORE_COMMODITY_SLOTS: DocSlotDef[] = [
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
];

// Legacy constant kept for any remaining static references
const DOC_SLOTS: DocSlotDef[] = [OCEAN_TRANSPORT_SLOT, ...CORE_COMMODITY_SLOTS];

const ACCENT_CLASSES: Record<string, { border: string; bg: string; icon: string }> = {
  blue:    { border: "border-blue-200",   bg: "bg-blue-50/60",    icon: "text-blue-500"    },
  emerald: { border: "border-emerald-200", bg: "bg-emerald-50/60", icon: "text-emerald-500" },
  violet:  { border: "border-violet-200", bg: "bg-violet-50/60",  icon: "text-violet-500"  },
  amber:   { border: "border-amber-200",  bg: "bg-amber-50/60",   icon: "text-amber-500"   },
  orange:  { border: "border-orange-200", bg: "bg-orange-50/60",  icon: "text-orange-500"  },
  rose:    { border: "border-rose-200",   bg: "bg-rose-50/60",    icon: "text-rose-500"    },
};

const OFAC_BADGE: Record<string, { label: string; cls: string }> = {
  clear:    { label: "OFAC: Clear",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  low:      { label: "OFAC: Low risk", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  medium:   { label: "OFAC: Review",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
  high:     { label: "OFAC: High risk", cls: "bg-red-100 text-red-700 border-red-200" },
  critical: { label: "OFAC: Critical", cls: "bg-red-100 text-red-700 border-red-200" },
};

// ── Urgency helpers (shared with Dashboard) ───────────────────────────────────
type UrgencyTier = "overdue"|"arriving_today"|"critical_24h"|"urgent_48h"|"warn_72h"|"watch_7d"|"normal"|"unknown";
function getUrgencyTier(d: string | null): UrgencyTier {
  if (!d) return "unknown";
  const today = new Date(); today.setHours(0,0,0,0);
  const diff  = Math.round((new Date(d + "T00:00:00").getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return "overdue";
  if (diff === 0) return "arriving_today";
  if (diff <= 1) return "critical_24h";
  if (diff <= 2) return "urgent_48h";
  if (diff <= 3) return "warn_72h";
  if (diff <= 7) return "watch_7d";
  return "normal";
}
const URGENCY_BADGE_CFG: Record<UrgencyTier, { label: string; cls: string; icon?: any } | null> = {
  overdue:       { label: "OVERDUE",  cls: "bg-red-100 text-red-800 border-red-300",      icon: null },
  arriving_today:{ label: "TODAY",    cls: "bg-red-50  text-red-700 border-red-200",      icon: null },
  critical_24h:  { label: "< 24h",   cls: "bg-red-50  text-red-700 border-red-200",      icon: null },
  urgent_48h:    { label: "< 48h",   cls: "bg-amber-50 text-amber-700 border-amber-200", icon: null },
  warn_72h:      { label: "< 72h",   cls: "bg-amber-50 text-amber-600 border-amber-100", icon: null },
  watch_7d:      { label: "< 7 days",cls: "bg-blue-50 text-blue-600 border-blue-100",    icon: null },
  normal:        null,
  unknown:       null,
};

// ── Shipment mode config ─────────────────────────────────────────────────────

const SHIPMENT_MODES = [
  {
    id: "ocean",
    label: "Sea Freight",
    sub: "Ocean / maritime import",
    Icon: Ship,
    accent: "blue",
    countryHint: "Any origin",
  },
  {
    id: "land_canada",
    label: "Land Freight — Canada",
    sub: "Cross-border truck / rail (USMCA)",
    Icon: Truck,
    accent: "emerald",
    countryHint: "Origin: Canada",
  },
  {
    id: "land_mexico",
    label: "Land Freight — Mexico",
    sub: "Cross-border truck / rail (USMCA)",
    Icon: Truck,
    accent: "amber",
    countryHint: "Origin: Mexico",
  },
] as const;

type ShipmentModeId = (typeof SHIPMENT_MODES)[number]["id"];

// ── Additional required/recommended documents by mode ────────────────────────
// These go beyond the core 3 and power mode-specific AI cross-reference checks.

interface AdditionalDocSlot {
  id: string;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
  required: boolean;        // true = required for full compliance, false = recommended
  whyImportant: string;     // tooltip / badge text shown on the slot
}

const MODE_ADDITIONAL_SLOTS: Record<ShipmentModeId, AdditionalDocSlot[]> = {
  ocean: [
    {
      id: "isf",
      label: "ISF 10+2",
      description: "Importer Security Filing",
      Icon: Shield,
      accent: "blue",
      required: true,
      whyImportant: "$5,000 fine per violation if data mismatches invoice",
    },
    {
      id: "customs_bond",
      label: "Customs Bond",
      description: "Bond number, type, surety company",
      Icon: Lock,
      accent: "emerald",
      required: true,
      whyImportant: "Required for all commercial ocean imports",
    },
    {
      id: "arrival_notice",
      label: "Arrival Notice",
      description: "Vessel, port of arrival, last free day",
      Icon: Anchor,
      accent: "violet",
      required: false,
      whyImportant: "Calculates D&D (demurrage) risk exposure",
    },
    {
      id: "certificate_of_origin",
      label: "Certificate of Origin",
      description: "If claiming preferential duty rate",
      Icon: Globe,
      accent: "amber",
      required: false,
      whyImportant: "Required for GSP or trade agreement duty reduction",
    },
  ],
  land_canada: [
    {
      id: "usmca_certification",
      label: "USMCA Certification",
      description: "9 mandatory data elements (Annex 5-A)",
      Icon: ClipboardList,
      accent: "emerald",
      required: true,
      whyImportant: "Required for 0% duty — 25% tariff without it",
    },
    {
      id: "pars_document",
      label: "PARS / ACI eManifest",
      description: "Pre-Arrival Review System barcode",
      Icon: Truck,
      accent: "blue",
      required: true,
      whyImportant: "Enables expedited border crossing via CBSA",
    },
  ],
  land_mexico: [
    {
      id: "usmca_certification",
      label: "USMCA Certification",
      description: "9 mandatory data elements (Annex 5-A)",
      Icon: ClipboardList,
      accent: "emerald",
      required: true,
      whyImportant: "Required for 0% duty — 25% tariff without it",
    },
    {
      id: "paps_document",
      label: "PAPS / ACE Manifest",
      description: "Pre-Arrival Processing System number",
      Icon: Truck,
      accent: "blue",
      required: true,
      whyImportant: "Mandatory ACE filing for all commercial truck crossings",
    },
    {
      id: "pedimento",
      label: "Pedimento",
      description: "Mexico export customs declaration",
      Icon: FileText,
      accent: "amber",
      required: false,
      whyImportant: "Value discrepancy triggers CBP + SAT audit",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

export default function ValidatePage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Shipment lifecycle ──
  const [shipmentId]     = useState(() => crypto.randomUUID());
  const [shipmentCreated, setShipmentCreated] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // ── Form state ──
  const [shipmentName, setShipmentName] = useState("");
  const [expectedShipDate, setExpectedShipDate] = useState("");
  const [expectedArrivalDate, setExpectedArrivalDate] = useState("");
  const [shipmentNameError, setShipmentNameError] = useState(false);
  const [consignee, setConsignee] = useState("");
  const [selectedMode, setSelectedMode] = useState<ShipmentModeId | null>(null);

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
  // Pass exact mode so the edge function applies the right USMCA / ocean rules
  const validation = useValidation({
    shipmentId,
    workspaceId: currentWorkspace?.id,
    shipmentMode: selectedMode || "ocean",
    commodityType: "general",
    countryOfOrigin: selectedMode === "land_canada" ? "CA" : selectedMode === "land_mexico" ? "MX" : "",
  });

  const { slots, result, isRunning, extractDocument: validationExtract, runCrossRef } = validation;

  // ── Compute doc slots based on selected mode (land vs ocean) ──────────────
  const docSlots: DocSlotDef[] = useMemo(() => {
    if (selectedMode === "land_mexico" || selectedMode === "land_canada") {
      return [LAND_TRANSPORT_SLOT, ...CORE_COMMODITY_SLOTS];
    }
    return DOC_SLOTS;
  }, [selectedMode]);

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
  const uploadedSlotIds = docSlots.map((s) => s.id).filter((id) => id in extractedDocs);
  useEffect(() => {
    if ((phase === "upload" || phase === "done") && (processingDocs.size > 0)) {
      setPhase("processing");
    }
    if (phase === "upload" && uploadedSlotIds.length >= 2) {
      setPhase("processing");
    }
  }, [uploadedSlotIds.length, processingDocs.size, phase]);

  // ── Auto-trigger crossref when doc count changes (covers initial + re-uploads) ──
  const prevExtractedCount = useRef(0);
  useEffect(() => {
    const doneCount = Object.values(slots).filter((s) => s.status === "done").length;
    // Re-run crossref any time the extracted count changes AND we have ≥2 docs
    if (doneCount >= 2 && doneCount !== prevExtractedCount.current && !isRunning) {
      prevExtractedCount.current = doneCount;
      runCrossRef();
    }
  }, [slots, isRunning, runCrossRef]);

  // ── Auto-create a minimal shipment row on first upload ──
  const ensureShipmentExists = useCallback(async () => {
    if (shipmentCreated || !user?.id) return;
    const label = shipmentName || consignee || "Untitled Shipment";
    // mode enum values in DB: "sea" | "land" | "air"  (NOT "ocean")
    const modeForDb = selectedMode === "land_canada" || selectedMode === "land_mexico" ? "land" : "sea";
    const { error } = await supabase.from("shipments").insert({
      shipment_id: shipmentId,
      shipment_name: label,
      description: label,
      mode: modeForDb,
      consignee: consignee || "Pending",
      status: "in_transit",
      hs_code: "0000.00",
      declared_value: 0,
      expected_ship_date: expectedShipDate || null,
      expected_arrival_date: expectedArrivalDate || null,
      risk_score: 0,
      workspace_id: currentWorkspace?.id ?? null,
    } as any);
    if (!error) setShipmentCreated(true);
    else console.warn("[ValidatePage] shipment insert error:", error.message, "workspace_id:", currentWorkspace?.id);
  }, [shipmentId, shipmentCreated, user?.id, shipmentName, consignee, selectedMode, currentWorkspace?.id]);

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

  // ── Load draft from URL param (?draft=<shipment_id>) ──
  useEffect(() => {
    const draftId = searchParams.get("draft");
    if (!draftId || !user?.id) return;
    supabase
      .from("shipments")
      .select("shipment_id, shipment_name, consignee, mode, status")
      .eq("shipment_id", draftId)
      .eq("status", "draft")
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.shipment_name) setShipmentName(data.shipment_name);
        if (data.consignee && data.consignee !== "Pending") setConsignee(data.consignee);
        if (data.mode) {
          const modeMap: Record<string, ShipmentModeId> = {
            sea: "ocean", land: "land_canada",
          };
          setSelectedMode((modeMap[data.mode] as ShipmentModeId) ?? null);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Save draft without uploading docs ──
  const handleSaveDraft = useCallback(async () => {
    if (!shipmentName.trim()) {
      setShipmentNameError(true);
      toast.error("Add a shipment name before saving a draft.");
      return;
    }
    if (!user?.id) return;
    setSavingDraft(true);
    try {
      const modeForDb = selectedMode === "land_canada" || selectedMode === "land_mexico" ? "land" : "sea";
      const { error } = await supabase.from("shipments").insert({
        shipment_id:   shipmentId,
        shipment_name: shipmentName.trim(),
        description:   shipmentName.trim(),
        mode:          modeForDb,
        consignee:     consignee.trim() || "Pending",
        status:        "draft" as any,
        hs_code:       "0000.00",
        declared_value: 0,
        expected_ship_date: expectedShipDate || null,
        expected_arrival_date: expectedArrivalDate || null,
        risk_score:    0,
        workspace_id:  currentWorkspace?.id ?? null,
      } as any);
      if (error) throw error;
      setShipmentCreated(true);
      toast.success("Draft saved! Find it in Shipments → Draft.", {
        action: { label: "View Shipments", onClick: () => navigate("/dashboard") },
      });
    } catch (err: any) {
      toast.error("Failed to save draft: " + err.message);
    } finally {
      setSavingDraft(false);
    }
  }, [shipmentId, shipmentName, consignee, selectedMode, user?.id, navigate, expectedShipDate, expectedArrivalDate, currentWorkspace?.id]);

  // ── Handle file drop / selection for a slot ──
  const handleFile = useCallback(
    async (slotId: string, file: File) => {
      if (!shipmentName.trim()) {
        setShipmentNameError(true);
        toast.error("Please enter a shipment name before uploading documents.");
        return;
      }
      if (!selectedMode) {
        toast.error("Please select a shipment mode before uploading documents.");
        return;
      }
      setShipmentNameError(false);
      // If slot already has a document, reset phase so we re-run crossref with updated set
      if (phase === "done") {
        setPhase("processing");
      }
      await ensureShipmentExists();
      await validationExtract(slotId, file);
    },
    [ensureShipmentExists, validationExtract, shipmentName, selectedMode, phase]
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
    setShipmentName("");
    setShipmentNameError(false);
    setSelectedMode(null);
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
            {phase === "upload" && !shipmentCreated && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={savingDraft || !shipmentName.trim()}
                className="gap-1.5 text-xs"
              >
                {savingDraft
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <BookmarkPlus className="h-3.5 w-3.5" />
                }
                Save Draft
              </Button>
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
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
            Shipment Name <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="e.g. Amazon BOL-2025-001 or Colombia Import June"
            value={shipmentName}
            onChange={(e) => { setShipmentName(e.target.value); setShipmentNameError(false); }}
            disabled={isRunning}
            className={shipmentNameError ? "border-destructive ring-1 ring-destructive" : ""}
          />
          {shipmentNameError ? (
            <p className="text-[11px] text-destructive font-semibold">⚠ Shipment name is required before uploading.</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              A label to identify this shipment in your history. You can always rename it later.
            </p>
          )}
        </div>

        {/* ── Shipment Mode Selector ── */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
            Shipment Mode <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {SHIPMENT_MODES.map((m) => {
              const { Icon } = m;
              const isSelected = selectedMode === m.id;
              const accentMap: Record<string, string> = {
                blue:    "border-blue-400 bg-blue-50 ring-2 ring-blue-300",
                emerald: "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300",
                amber:   "border-amber-400 bg-amber-50 ring-2 ring-amber-300",
              };
              const iconMap: Record<string, string> = {
                blue:    "text-blue-600",
                emerald: "text-emerald-600",
                amber:   "text-amber-600",
              };
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setSelectedMode(m.id)}
                  className={cn(
                    "rounded-xl border-2 p-3 text-left transition-all",
                    isSelected
                      ? accentMap[m.accent]
                      : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
                    isRunning && "opacity-60 cursor-default"
                  )}
                >
                  <Icon className={cn("h-5 w-5 mb-1.5", isSelected ? iconMap[m.accent] : "text-muted-foreground")} />
                  <p className={cn("text-xs font-bold leading-tight", isSelected ? "text-foreground" : "text-foreground/80")}>{m.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{m.sub}</p>
                </button>
              );
            })}
          </div>
          {!selectedMode && phase === "upload" && (
            <p className="text-[11px] text-muted-foreground">Select the transport mode to ensure correct compliance rules are applied.</p>
          )}
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
                disabled={isRunning}
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

        {/* ── Time-Sensitive Alert Banner ── */}
        {expectedArrivalDate && (() => {
          const tier = getUrgencyTier(expectedArrivalDate);
          const isUrgent = ["overdue","arriving_today","critical_24h","urgent_48h","warn_72h"].includes(tier);
          if (!isUrgent) return null;
          const missingRequired = selectedMode
            ? MODE_ADDITIONAL_SLOTS[selectedMode].filter(slot => slot.required && !(slot.id in extractedDocs))
            : [];
          const coreDocsMissing = docSlots.filter(slot => !(slot.id in extractedDocs));
          const allMissing = [...coreDocsMissing.map(d => d.label), ...missingRequired.map(d => d.label)];
          if (allMissing.length === 0) return null;
          const daysLeft = Math.round((new Date(expectedArrivalDate + "T00:00:00").getTime() - new Date().setHours(0,0,0,0)) / 86400000);
          return (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span className="text-xs font-bold text-red-800">
                  TIME-CRITICAL — {daysLeft <= 0 ? "ARRIVAL TODAY OR OVERDUE" : `${daysLeft} DAY${daysLeft !== 1 ? "S" : ""} UNTIL ARRIVAL`}
                </span>
              </div>
              <p className="text-[11px] text-red-700 pl-6">
                The following documents must be filed before arrival:{" "}
                <span className="font-semibold">{allMissing.join(", ")}</span>.
                {tier === "critical_24h" && " ISF 10+2 requires 24hr advance filing — act immediately."}
                {tier === "warn_72h" && " CBP entry must be filed before vessel arrives."}
              </p>
            </div>
          );
        })()}

        {/* ── Expected Dates ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Expected Ship Date
            </label>
            <Input
              type="date"
              value={expectedShipDate}
              onChange={e => setExpectedShipDate(e.target.value)}
              disabled={isRunning}
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Date goods leave origin port/border.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              Expected Arrival Date
              {expectedArrivalDate && (() => {
                const tier = getUrgencyTier(expectedArrivalDate);
                const cfg  = URGENCY_BADGE_CFG[tier];
                return cfg ? (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1", cfg.cls)}>
                    {cfg.icon && <cfg.icon className="h-2.5 w-2.5"/>}{cfg.label}
                  </span>
                ) : null;
              })()}
            </label>
            <Input
              type="date"
              value={expectedArrivalDate}
              onChange={e => setExpectedArrivalDate(e.target.value)}
              disabled={isRunning}
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Sets 24/48/72hr document deadline alerts.
            </p>
          </div>
        </div>

        {/* ── Document Slots ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Shipment Documents
            </label>
            <span className="text-[11px] text-muted-foreground">
              {uploadedSlotIds.length} of {docSlots.length} uploaded
              {uploadedSlotIds.length >= 2 && " · AI analysis running"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {docSlots.map((slot) => {
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
                  disabled={isRunning}
                  onFile={(f) => handleFile(slot.id, f)}
                />
              );
            })}
          </div>

        </div>

        {/* ── Mode-Specific Additional Documents ── */}
        {selectedMode && MODE_ADDITIONAL_SLOTS[selectedMode]?.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BadgeAlert className="h-4 w-4 text-amber-500" />
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {selectedMode === "ocean" ? "Ocean" : selectedMode === "land_canada" ? "Canada" : "Mexico"} — Required &amp; Recommended Documents
              </label>
            </div>

            {/* Required additional docs */}
            {MODE_ADDITIONAL_SLOTS[selectedMode].filter(s => s.required).length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-destructive uppercase tracking-widest mb-2">
                  Required for Full Compliance
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {MODE_ADDITIONAL_SLOTS[selectedMode].filter(s => s.required).map((slot) => {
                    const isUploaded = slot.id in extractedDocs;
                    const isProcessing = processingDocs.has(slot.id);
                    const doc = extractedDocs[slot.id];
                    const accents = ACCENT_CLASSES[slot.accent] ?? ACCENT_CLASSES["blue"];
                    return (
                      <AdditionalDocSlotCard
                        key={slot.id}
                        slot={slot}
                        isUploaded={isUploaded}
                        isProcessing={isProcessing}
                        doc={doc}
                        accents={accents}
                        disabled={isRunning}
                        onFile={(f) => handleFile(slot.id, f)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommended additional docs */}
            {MODE_ADDITIONAL_SLOTS[selectedMode].filter(s => !s.required).length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Recommended — Enhances Analysis
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {MODE_ADDITIONAL_SLOTS[selectedMode].filter(s => !s.required).map((slot) => {
                    const isUploaded = slot.id in extractedDocs;
                    const isProcessing = processingDocs.has(slot.id);
                    const doc = extractedDocs[slot.id];
                    const accents = ACCENT_CLASSES[slot.accent] ?? ACCENT_CLASSES["blue"];
                    return (
                      <AdditionalDocSlotCard
                        key={slot.id}
                        slot={slot}
                        isUploaded={isUploaded}
                        isProcessing={isProcessing}
                        doc={doc}
                        accents={accents}
                        disabled={isRunning}
                        onFile={(f) => handleFile(slot.id, f)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Processing indicator ── */}
        {phase === "processing" && (
          <ValidationStepper slots={slots} isRunning={isRunning} />
        )}

        {/* ── Done state: summary + report CTA ── */}
        {phase === "done" && (
          <div className="space-y-4">
            {/* Summary bar */}
            <ExceptionsSummaryBar crossRefResults={crossRefResults} ofacStatus={ofacStatus} />

            {/* View Report CTA */}
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
              Add the packing list above to re-run analysis with all 3 documents · Report includes print / PDF export
            </p>
          </div>
        )}

        {/* ── Persistent Save & Continue — visible once any doc is uploaded OR shipment is created ── */}
        {(shipmentCreated || uploadedSlotIds.length > 0) && (
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-1.5 text-sm text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> New Validation
              </Button>
              <Button
                variant="default"
                onClick={async () => {
                  await ensureShipmentExists();
                  navigate("/dashboard");
                }}
                className="flex-1 gap-2 text-sm font-bold"
              >
                Save & Continue to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              Your shipment is saved. You can always return to add more documents or view the report later.
            </p>
          </div>
        )}

      </div>

      {/* ── Modals ── */}
      <ExceptionsReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        shipmentRef={shipmentName.trim() || `SHP-${shipmentId.slice(0, 8).toUpperCase()}`}
        shipmentId={shipmentId}
        workspaceId={currentWorkspace?.id}
        consignee={consignee}
        crossRefResults={crossRefResults}
        extractedDocs={extractedDocs}
        ofacStatus={ofacStatus}
        complianceScore={result?.readinessScore}
        totalExposureUsd={result?.total_exposure_usd}
        totalExposureSummary={result?.total_exposure_summary}
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
  slot: DocSlotDef;
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
          ? `${accents.border} ${accents.bg} hover:opacity-90`
          : dragOver
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-dashed border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
        disabled && "opacity-50 cursor-default"
      )}
      onClick={() => !disabled && inputRef.current?.click()}
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
              {!disabled && (
                <p className="text-[9px] text-muted-foreground/50 mt-1">Click to replace</p>
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

// ─── AdditionalDocSlotCard ─────────────────────────────────────────────────
// Compact 2-column card for mode-specific docs — shows risk badge + why it matters.

interface AdditionalDocSlotCardProps {
  slot: AdditionalDocSlot;
  isUploaded: boolean;
  isProcessing: boolean;
  doc: any;
  accents: { border: string; bg: string; icon: string };
  disabled: boolean;
  onFile: (f: File) => void;
}

function AdditionalDocSlotCard({ slot, isUploaded, isProcessing, doc, accents, disabled, onFile }: AdditionalDocSlotCardProps) {
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

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-3 transition-all cursor-pointer select-none",
        isUploaded
          ? `${accents.border} ${accents.bg} hover:opacity-90`
          : dragOver
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-dashed border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
        disabled && "opacity-50 cursor-default"
      )}
      onClick={() => !disabled && inputRef.current?.click()}
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
      <div className="flex items-start gap-2.5">
        {isProcessing ? (
          <Loader2 className={cn("h-5 w-5 animate-spin mt-0.5 flex-shrink-0", accents.icon)} />
        ) : isUploaded ? (
          <CheckCircle2 className={cn("h-5 w-5 mt-0.5 flex-shrink-0", accents.icon)} />
        ) : (
          <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", accents.icon)} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground leading-tight">{slot.label}</p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{slot.description}</p>
          <p className={cn(
            "text-[9px] font-semibold mt-1 leading-tight",
            slot.required ? "text-amber-600" : "text-muted-foreground/70"
          )}>
            {isUploaded ? "✓ Uploaded — click to replace" : `⚡ ${slot.whyImportant}`}
          </p>
        </div>
        {!isUploaded && !isProcessing && (
          <Upload className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
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
