import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Ship, Plane, PackageOpen, RefreshCcw, ArrowRight, ArrowLeft, Upload, Sparkles, AlertTriangle, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */
export interface WizardResult {
  title: string;
  shipmentReference: string;
  importerOfRecord: string;
  shipmentMode: ShipmentModeChoice;
  commodityType: string;
  countryOfOrigin: string;
  portOfEntry: string;
  /* Step 2 – importer setup */
  einNumber: string;
  poaOnFile: boolean;
  poaFile: File | null;
  bondStatus: "active" | "pending" | "need" | "";
  suretyCompany: string;
  bondNumber: string;
  achSetup: boolean;
}

type ShipmentModeChoice = "ocean_import" | "air_import" | "land_mexico_import" | "land_canada_import" | "ocean_export" | "air_export" | "land_mexico_export" | "land_canada_export" | "inbond_te";

export interface PacketIntakeDraft {
  shipmentReference: string;
  title: string;
}

// Mexico land border crossing ports (by trade volume)
const MEXICO_PORTS_OF_ENTRY = [
  "Laredo, TX (Juarez-Lincoln Bridge)",
  "El Paso, TX (Bridge of the Americas)",
  "Otay Mesa, CA (Otay Mesa Commercial Facility)",
  "Nogales, AZ (Mariposa Commercial Port)",
  "McAllen, TX (Pharr-Reynosa Bridge)",
  "Eagle Pass, TX (International Bridge II)",
  "Hidalgo, TX (Pharr International Bridge)",
  "Brownsville, TX (Veterans International Bridge)",
  "Del Rio, TX (International Bridge)",
  "Calexico, CA (Calexico East Commercial Port)",
];

interface ModeCard { id: ShipmentModeChoice; label: string; icon: React.ReactNode; detail: string; active: boolean }

const MODE_GROUPS: { title: string; cards: ModeCard[] }[] = [
  {
    title: "Importing into the U.S.",
    cards: [
      { id: "land_mexico_import", label: "Land — Mexico Import", icon: <Truck size={18} />, detail: "Commercial Invoice · Packing List · Truck BoL · USMCA CoO", active: true },
      { id: "land_canada_import", label: "Land — Canada Import", icon: <Truck size={18} />, detail: "Coming soon — Q3 2026", active: false },
      { id: "ocean_import", label: "Ocean Import", icon: <Ship size={18} />, detail: "Coming soon", active: false },
      { id: "air_import", label: "Air Import", icon: <Plane size={18} />, detail: "Coming soon", active: false },
    ],
  },
];

const COMMODITY_TYPES = [
  "General merchandise",
  "Food, Beverage, Supplements",
  "Electronics, Telecom",
  "Auto parts, Vehicles",
  "Textiles, Apparel",
  "Chemicals, Hazmat",
  "Medical devices, Pharmaceuticals",
  "Agricultural products, Plants",
  "Steel, Aluminum mill products",
  "Wildlife, Exotic products",
  "Firearms, Ammunition",
];

/* ── Requirement tag inference (Mexico land-focused) ── */
function inferTags(mode: ShipmentModeChoice, commodity: string, origin: string): { label: string; color: string }[] {
  const tags: { label: string; color: string }[] = [];
  const c = commodity.toLowerCase();

  // Mexico land entry — always applicable
  if (mode === "land_mexico_import") {
    tags.push({ label: "USMCA Cert of Origin — required for duty-free treatment", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" });
    tags.push({ label: "PAPS filing — required for CBP ACE truck entry", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" });
    tags.push({ label: "Pedimento — required from Mexican customs side", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" });
    tags.push({ label: "25% IEEPA tariff exposure on non-USMCA goods", color: "bg-red-500/10 text-red-600 border-red-500/20" });
  }

  // Commodity-specific PGA requirements
  if (c.includes("food") || c.includes("beverage") || c.includes("supplement")) tags.push({ label: "FDA Prior Notice — mandatory for food/supplements", color: "bg-red-500/10 text-red-600 border-red-500/20" });
  if (c.includes("agricultural") || c.includes("plant")) {
    tags.push({ label: "Phytosanitary Certificate — USDA APHIS", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" });
    tags.push({ label: "Fumigation / ISPM-15 cert required", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" });
  }
  if (c.includes("steel") || c.includes("aluminum")) tags.push({ label: "Section 232 tariff — 25% steel / 25% aluminum", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" });
  if (c.includes("auto") || c.includes("vehicle")) tags.push({ label: "USMCA Regional Value Content — auto rules strict", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" });
  if (c.includes("electronics") || c.includes("telecom")) tags.push({ label: "FCC Declaration required", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" });
  if (c.includes("chemical") || c.includes("hazmat")) tags.push({ label: "Dangerous Goods Declaration — mandatory", color: "bg-red-500/10 text-red-600 border-red-500/20" });
  if (c.includes("medical") || c.includes("pharma")) tags.push({ label: "FDA 510(k) or device registration may apply", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" });

  return tags;
}

function estimateDocCount(_mode: ShipmentModeChoice, commodity: string): { required: number; conditional: number } {
  // Mexico land entry: 5 core required docs
  let base = 5; // Commercial Invoice, Packing List, Truck BoL, USMCA CoO, Customs Bond
  let cond = 0;
  const c = commodity.toLowerCase();
  if (c.includes("food") || c.includes("beverage")) cond += 2; // FDA Prior Notice + Phytosanitary
  if (c.includes("chemical") || c.includes("hazmat")) cond += 1; // Dangerous Goods Declaration
  if (c.includes("agricultural") || c.includes("plant")) cond += 2; // Phytosanitary + USDA permit
  if (c.includes("medical") || c.includes("pharma")) cond += 1; // FDA registration
  if (c.includes("steel") || c.includes("aluminum")) cond += 1; // SIMA/232 docs
  return { required: base, conditional: cond };
}

/* ── Props ── */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (result: WizardResult) => void;
  existingImporters?: string[];
  onOpenPacketIntake?: (draft: PacketIntakeDraft) => void;
}

export function NewShipmentWizard({ open, onOpenChange, onComplete, existingImporters = [], onOpenPacketIntake }: Props) {
  const [step, setStep] = useState(1);
  // Step 1
  const [title, setTitle] = useState("");
  const [shipmentReference, setShipmentReference] = useState("");
  const [referenceError, setReferenceError] = useState("");
  const [nextSequentialId, setNextSequentialId] = useState("ORC-0001");
  const [importerOfRecord, setImporterOfRecord] = useState("");
  const [importerQuery, setImporterQuery] = useState("");
  const [showImporterSuggestions, setShowImporterSuggestions] = useState(false);
  const [shipmentMode, setShipmentMode] = useState<ShipmentModeChoice>("land_mexico_import");
  const [commodityType, setCommodityType] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [portOfEntry, setPortOfEntry] = useState("");
  // Step 2
  const [einNumber, setEinNumber] = useState("");
  const [poaOnFile, setPoaOnFile] = useState(false);
  const [poaFile, setPoaFile] = useState<File | null>(null);
  const [bondStatus, setBondStatus] = useState<"active" | "pending" | "need" | "">("");
  const [suretyCompany, setSuretyCompany] = useState("");
  const [bondNumber, setBondNumber] = useState("");
  const [achSetup, setAchSetup] = useState(false);

  // Generate sequential ID on mount / open — always set reference to sequential ID independently of title
  useEffect(() => {
    if (!open) return;
    const fetchNextId = async () => {
      const { data } = await supabase
        .from("shipments")
        .select("shipment_id")
        .like("shipment_id", "ORC-%")
        .order("created_at", { ascending: false })
        .limit(200);
      let maxNum = 0;
      (data || []).forEach((s: any) => {
        const match = s.shipment_id.match(/^ORC-(\d+)$/);
        if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
      });
      const nextId = `ORC-${String(maxNum + 1).padStart(4, "0")}`;
      setNextSequentialId(nextId);
      // Always pre-fill with sequential ID — never copy from title
      setShipmentReference(nextId);
    };
    fetchNextId();
  }, [open]);

  // Validate uniqueness when reference changes
  useEffect(() => {
    if (!shipmentReference.trim()) {
      setReferenceError("");
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("shipments")
        .select("shipment_id")
        .eq("shipment_id", shipmentReference.trim())
        .maybeSingle();
      setReferenceError(data ? "This reference already exists. Please use a unique ID." : "");
    }, 400);
    return () => clearTimeout(timer);
  }, [shipmentReference]);

  const isNewImporter = importerOfRecord.length > 0 && !existingImporters.some(i => i.toLowerCase() === importerOfRecord.toLowerCase());

  const tags = useMemo(() => inferTags(shipmentMode, commodityType, countryOfOrigin), [shipmentMode, commodityType, countryOfOrigin]);
  const docEstimate = useMemo(() => estimateDocCount(shipmentMode, commodityType), [shipmentMode, commodityType]);

  const filteredImporters = existingImporters.filter(i => i.toLowerCase().includes(importerQuery.toLowerCase()));

  const canProceed = title.trim().length > 0 && importerOfRecord.trim().length > 0 && commodityType.length > 0 && !referenceError;

  const handleNext = () => {
    if (isNewImporter) {
      setStep(2);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const ref = shipmentReference.trim() || nextSequentialId;
    onComplete({
      title, shipmentReference: ref, importerOfRecord, shipmentMode, commodityType, countryOfOrigin, portOfEntry,
      einNumber, poaOnFile, poaFile, bondStatus, suretyCompany, bondNumber, achSetup,
    });
    // Reset state
    setStep(1);
    setTitle(""); setShipmentReference(""); setReferenceError("");
    setImporterOfRecord(""); setImporterQuery(""); setCommodityType("");
    setCountryOfOrigin(""); setPortOfEntry(""); setEinNumber(""); setPoaOnFile(false);
    setPoaFile(null); setBondStatus(""); setSuretyCompany(""); setBondNumber(""); setAchSetup(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setStep(1);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">New Shipment Workspace</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Step {step} of {isNewImporter ? 2 : 1} — {step === 1 ? "Shipment Identity" : "Importer Setup"}
              </DialogDescription>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1.5 mt-3">
            <div className={cn("h-1 flex-1 rounded-full transition-colors", step >= 1 ? "bg-primary" : "bg-border")} />
            {isNewImporter && <div className={cn("h-1 flex-1 rounded-full transition-colors", step >= 2 ? "bg-primary" : "bg-border")} />}
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {step === 1 && (
            <>
              {/* 1. Shipment Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Shipment Title</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder='e.g. Auto Parts — Korea Q1 2026'
                  className="text-sm"
                />
              </div>

              {/* 1b. Shipment Reference / ID */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Shipment Reference / ID</Label>
                <Input
                  value={shipmentReference}
                  onChange={e => setShipmentReference(e.target.value)}
                  placeholder={nextSequentialId}
                  className={cn("text-sm font-mono", referenceError && "border-destructive")}
                />
                {referenceError ? (
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle size={10} /> {referenceError}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Auto-generated as {nextSequentialId}. You can type any custom reference.
                  </p>
                )}
              </div>

              {/* 2. Smart Packet Intake — HERO drop zone */}
              {onOpenPacketIntake && (
                <button
                  type="button"
                  onClick={() => {
                    const ref = shipmentReference.trim() || nextSequentialId;
                    onOpenChange(false);
                    onOpenPacketIntake({ shipmentReference: ref, title: title.trim() });
                  }}
                  className="w-full flex flex-col items-center gap-3 py-8 px-6 rounded-xl border-2 border-dashed border-primary bg-primary/5 hover:bg-primary/10 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload size={24} className="text-primary" />
                  </div>
                  <span className="text-sm font-bold text-primary">Drop your document packet and AI will fill everything else</span>
                  <span className="text-xs text-muted-foreground text-center max-w-md leading-relaxed">
                    AI identifies shipment mode, extracts importer details, commodity, origin, HTS codes, and builds your complete checklist automatically.
                  </span>
                </button>
              )}

              {/* 3. Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground font-medium">or fill in manually</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* 4. Shipment Mode — Mexico Land pilot */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Shipment Mode</Label>
                  <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">Mexico Land Pilot</span>
                </div>
                {MODE_GROUPS.map(group => (
                  <div key={group.title} className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      {group.cards.map(m => {
                        const active = shipmentMode === m.id;
                        const isEnabled = m.active;
                        return (
                          <button
                            key={m.id}
                            onClick={() => isEnabled && setShipmentMode(m.id)}
                            disabled={!isEnabled}
                            className={cn(
                              "relative flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all",
                              isEnabled && "hover:border-primary/40 hover:shadow-sm active:scale-[0.98]",
                              active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card",
                              !isEnabled && "opacity-40 cursor-not-allowed"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn("transition-colors", active ? "text-primary" : "text-muted-foreground")}>{m.icon}</span>
                              <span className={cn("text-[12px] font-semibold", active ? "text-primary" : "text-foreground")}>{m.label}</span>
                            </div>
                            <p className="text-[10px] leading-snug text-muted-foreground">{m.detail}</p>
                            {active && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
                            {!isEnabled && (
                              <span className="absolute top-2 right-2 text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">SOON</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 5. Importer of Record */}
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-semibold">Importer of Record</Label>
                <Input
                  value={importerOfRecord}
                  onChange={e => {
                    setImporterOfRecord(e.target.value);
                    setImporterQuery(e.target.value);
                    setShowImporterSuggestions(true);
                  }}
                  onFocus={() => setShowImporterSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowImporterSuggestions(false), 150)}
                  placeholder="Company name"
                  className="text-sm"
                />
                {showImporterSuggestions && filteredImporters.length > 0 && importerQuery.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredImporters.slice(0, 8).map(name => (
                      <button
                        key={name}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent/40 transition-colors"
                        onMouseDown={() => {
                          setImporterOfRecord(name);
                          setImporterQuery(name);
                          setShowImporterSuggestions(false);
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
                {isNewImporter && importerOfRecord.length > 2 && (
                  <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
                    <AlertTriangle size={10} /> New importer — additional setup will be required in Step 2
                  </p>
                )}
              </div>

              {/* 6. Commodity Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Commodity Type</Label>
                <Select value={commodityType} onValueChange={setCommodityType}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select commodity type…" /></SelectTrigger>
                  <SelectContent>
                    {COMMODITY_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* 7. Country of Origin */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Country of Origin</Label>
                <Input
                  value={countryOfOrigin}
                  onChange={e => setCountryOfOrigin(e.target.value)}
                  placeholder="e.g. China, South Korea, Colombia"
                  className="text-sm"
                />
              </div>

              {/* 8. Port of Entry — Mexico land border crossings */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Port of Entry</Label>
                <Select value={portOfEntry} onValueChange={setPortOfEntry}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select Mexico land border port…" /></SelectTrigger>
                  <SelectContent>
                    {MEXICO_PORTS_OF_ENTRY.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Laredo handles ~39% of all US-Mexico truck crossings</p>
              </div>

              {/* 9. Live AI Preview */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-xs font-bold text-primary">Live AI Preview</span>
                </div>
                <p className="text-xs text-foreground">
                  Your document checklist will include <strong>{docEstimate.required}</strong> required documents
                  {docEstimate.conditional > 0 && <> and <strong>{docEstimate.conditional}</strong> conditional PGA requirements</>}.
                </p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className={cn("text-[10px] px-2 py-0.5", tag.color)}>
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                )}
                {tags.length === 0 && commodityType && (
                  <p className="text-[11px] text-muted-foreground italic">Fill in more fields to see auto-detected requirements.</p>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mb-2">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  New importer detected: <strong>{importerOfRecord}</strong>. Confirm importer details to proceed.
                </p>
              </div>

              {/* EIN */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">EIN / CBP Importer Number</Label>
                <Input value={einNumber} onChange={e => setEinNumber(e.target.value)} placeholder="XX-XXXXXXX" className="text-sm font-mono" />
              </div>

              {/* POA */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                <Checkbox checked={poaOnFile} onCheckedChange={v => setPoaOnFile(!!v)} id="poa" className="mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="poa" className="text-xs font-semibold cursor-pointer">Power of Attorney on file</label>
                  {!poaOnFile && (
                    <div className="mt-1">
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => setPoaFile(e.target.files?.[0] || null)} />
                        <Button variant="outline" size="sm" className="text-[11px] gap-1" asChild>
                          <span><Upload size={11} /> Upload POA</span>
                        </Button>
                      </label>
                      {poaFile && <span className="text-[10px] text-muted-foreground ml-2">{poaFile.name}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Bond Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Continuous Customs Bond Status</Label>
                <Select value={bondStatus} onValueChange={v => setBondStatus(v as any)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select status…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="need">Need to obtain</SelectItem>
                  </SelectContent>
                </Select>
                {(bondStatus === "active" || bondStatus === "pending") && (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Surety Company</Label>
                      <Input value={suretyCompany} onChange={e => setSuretyCompany(e.target.value)} placeholder="e.g. Great American" className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Bond Number</Label>
                      <Input value={bondNumber} onChange={e => setBondNumber(e.target.value)} placeholder="Bond #" className="text-sm font-mono" />
                    </div>
                  </div>
                )}
                {bondStatus === "need" && (
                  <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle size={10} /> A customs bond is required before entry can be filed. Orchestra will add this to your checklist.
                  </p>
                )}
              </div>

              {/* ACH */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                <Checkbox checked={achSetup} onCheckedChange={v => setAchSetup(!!v)} id="ach" />
                <label htmlFor="ach" className="text-xs font-semibold cursor-pointer">ACH (Automated Clearing House) setup complete for duty payments</label>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border bg-card/40 flex items-center justify-between">
          {step === 2 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs gap-1.5">
              <ArrowLeft size={12} /> Back
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={step === 1 ? handleNext : handleSubmit}
            disabled={!canProceed}
            className="text-xs gap-1.5 min-w-[180px]"
          >
            {step === 1 && isNewImporter ? (
              <>Continue to Importer Setup <ArrowRight size={12} /></>
            ) : (
              <>Create Shipment Workspace <Sparkles size={12} /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
