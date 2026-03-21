import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, FileText, Image, FileSpreadsheet, File, X, Check, AlertTriangle,
  Loader2, Search, Settings, CheckCircle2, XCircle, ChevronRight, Download, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSmartPacketIntake,
  isFileAccepted,
  type PacketFile,
  type PacketFileStatus,
  type CrossRefFinding,
  type ShipmentProfileData,
} from "@/hooks/useSmartPacketIntake";

const DOC_TYPE_LABELS: Record<string, string> = {
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  bill_of_lading: "Bill of Lading",
  air_waybill: "Air Waybill",
  truck_bol_carrier_manifest: "Truck BOL / Carrier Manifest",
  certificate_of_origin: "Certificate of Origin",
  usmca_certification: "USMCA Certification",
  korus_certificate: "KORUS Certificate",
  isf_confirmation: "ISF Confirmation",
  arrival_notice: "Arrival Notice",
  customs_bond: "Customs Bond",
  power_of_attorney: "Power of Attorney",
  freight_invoice: "Freight Invoice",
  insurance_certificate: "Insurance Certificate",
  phytosanitary_certificate: "Phytosanitary Certificate",
  fumigation_certificate_ispm15: "Fumigation / ISPM-15",
  paps_document: "PAPS Document",
  pars_document: "PARS Document",
  carta_porte_cfdi: "Carta Porte / CFDI",
  pedimento: "Pedimento",
  aci_emanifest: "ACI eManifest",
  carm_registration: "CARM Registration",
  cbp_form_3461: "CBP Form 3461",
  cbp_form_7501: "CBP Form 7501",
  cbp_form_7512: "CBP Form 7512",
  fda_prior_notice: "FDA Prior Notice",
  usda_aphis_permit: "USDA/APHIS Permit",
  epa_tsca_certification: "EPA TSCA Certification",
  fcc_declaration: "FCC Declaration",
  cpsc_certificate: "CPSC Certificate",
  sima_license: "SIMA License",
  export_license: "Export License",
  dangerous_goods_declaration: "Dangerous Goods Declaration",
  sds_msds: "SDS / MSDS",
  inspection_certificate: "Inspection Certificate",
  letter_of_credit: "Letter of Credit",
  purchase_order: "Purchase Order",
  delivery_order: "Delivery Order",
  pro_forma_invoice: "Pro Forma Invoice",
  unknown: "Unknown Document",
};

const ALL_DOC_TYPES = Object.entries(DOC_TYPE_LABELS)
  .filter(([k]) => k !== "unknown")
  .map(([value, label]) => ({ value, label }));

function getFileIcon(file: File) {
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) return <FileText size={16} className="text-red-500" />;
  if (file.type.startsWith("image/")) return <Image size={16} className="text-blue-500" />;
  if (file.name.endsWith(".xlsx")) return <FileSpreadsheet size={16} className="text-green-500" />;
  return <File size={16} className="text-muted-foreground" />;
}

function getStatusDisplay(status: PacketFileStatus, docType: string | null): { icon: React.ReactNode; text: string; color: string } {
  switch (status) {
    case "queued": return { icon: <Loader2 size={14} className="animate-spin text-muted-foreground" />, text: "Queued...", color: "text-muted-foreground" };
    case "uploading": return { icon: <Loader2 size={14} className="animate-spin text-blue-500" />, text: "Uploading...", color: "text-blue-500" };
    case "identifying": return { icon: <Search size={14} className="animate-pulse text-amber-500" />, text: "Identifying document type...", color: "text-amber-500" };
    case "awaiting_confirmation": return { icon: <AlertTriangle size={14} className="text-amber-500" />, text: `Confirm: ${DOC_TYPE_LABELS[docType || ""] || docType}?`, color: "text-amber-500" };
    case "extracting": return { icon: <Settings size={14} className="animate-spin text-primary" />, text: `Extracting data fields...`, color: "text-primary" };
    case "extracted": return { icon: <CheckCircle2 size={14} className="text-emerald-500" />, text: `${DOC_TYPE_LABELS[docType || ""] || docType} — extracted`, color: "text-emerald-500" };
    case "extracted_warnings": return { icon: <AlertTriangle size={14} className="text-amber-500" />, text: `${DOC_TYPE_LABELS[docType || ""] || docType} — warnings`, color: "text-amber-500" };
    case "unidentified": return { icon: <XCircle size={14} className="text-red-500" />, text: "Could not identify — assign manually", color: "text-red-500" };
    case "error": return { icon: <XCircle size={14} className="text-red-500" />, text: "Error", color: "text-red-500" };
    default: return { icon: null, text: "", color: "" };
  }
}

/* ── Drop Zone ── */
function PacketDropZone({ onDrop, variant = "full" }: { onDrop: (files: File[]) => void; variant?: "full" | "compact" }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) onDrop(droppedFiles);
  }, [onDrop]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) onDrop(selected);
    e.target.value = "";
  }, [onDrop]);

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
          isDragOver ? "border-primary bg-primary/10 scale-[1.01]" : "border-primary/30 bg-primary/5 hover:border-primary/50"
        )}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mx-auto mb-2 text-primary" size={28} />
        <p className="text-sm font-semibold text-primary">Drop your complete document packet here</p>
        <p className="text-xs text-muted-foreground mt-1">AI will sort, extract, cross-reference, and score everything at once</p>
        <p className="text-[10px] text-muted-foreground mt-2">PDF, JPG, PNG, TIFF, DOCX, XLSX · Up to 30 files · 25MB each</p>
        <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.docx,.xlsx,.msg,.eml" onChange={handleFileSelect} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all min-h-[280px] flex flex-col items-center justify-center",
        isDragOver ? "border-primary bg-primary/10 scale-[1.01]" : "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/8"
      )}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Upload className="text-primary" size={32} />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">Already have your document packet?</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-2">
        Drop all files here and AI will identify the shipment type, extract all data, and build your complete checklist automatically.
      </p>
      <p className="text-xs text-muted-foreground">
        PDF, JPG, PNG, TIFF, DOCX, XLSX · Up to 30 files · 25MB per file
      </p>
      <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.docx,.xlsx,.msg,.eml" onChange={handleFileSelect} />
    </div>
  );
}

/* ── Processing Screen ── */
function ProcessingScreen({
  files, crossRefResults, profileData, score, stats,
  onConfirm, onAssign, onRemove,
}: {
  files: PacketFile[];
  crossRefResults: CrossRefFinding[];
  profileData: ShipmentProfileData;
  score: number;
  stats: { total: number; identified: number; fieldsExtracted: number; crossChecks: number; issues: number; processing: boolean };
  onConfirm: (id: string, type: string) => void;
  onAssign: (id: string, type: string) => void;
  onRemove: (id: string) => void;
}) {
  const processingCount = files.filter(f => ["queued", "uploading", "identifying", "extracting"].includes(f.status)).length;
  const progress = stats.total > 0 ? Math.round(((stats.total - processingCount) / stats.total) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Progress header */}
      <div className="px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Settings size={14} className={cn(stats.processing ? "animate-spin text-primary" : "text-emerald-500")} />
              <span className="text-sm font-semibold">
                {stats.processing ? "Processing..." : "Complete"}
              </span>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{stats.identified}/{stats.total} identified</span>
              <span>{stats.fieldsExtracted} fields</span>
              <span>{stats.crossChecks} checks</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-bold">
            Score: {score}%
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* 3-column layout */}
      <div className="flex-1 grid grid-cols-3 divide-x divide-border overflow-hidden">
        {/* LEFT — File list */}
        <ScrollArea className="h-full">
          <div className="p-3 space-y-1">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Files ({files.length})</h4>
            {files.map(pf => {
              const { icon, text, color } = getStatusDisplay(pf.status, pf.documentType);
              return (
                <div key={pf.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/40 group">
                  <div className="mt-0.5">{getFileIcon(pf.file)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{pf.file.name}</p>
                    <div className={cn("flex items-center gap-1 mt-0.5", color)}>
                      {icon}
                      <span className="text-[10px]">{text}</span>
                    </div>
                    {pf.status === "awaiting_confirmation" && (
                      <div className="flex gap-1 mt-1">
                        <Button size="sm" variant="outline" className="h-5 text-[9px] px-2" onClick={() => onConfirm(pf.id, pf.documentType!)}>
                          Yes
                        </Button>
                        <Select onValueChange={v => onAssign(pf.id, v)}>
                          <SelectTrigger className="h-5 text-[9px] px-2 w-auto border-dashed"><SelectValue placeholder="No, it's..." /></SelectTrigger>
                          <SelectContent>
                            {ALL_DOC_TYPES.map(dt => (
                              <SelectItem key={dt.value} value={dt.value} className="text-xs">{dt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {pf.status === "unidentified" && (
                      <Select onValueChange={v => onAssign(pf.id, v)}>
                        <SelectTrigger className="h-6 text-[10px] px-2 mt-1 border-dashed"><SelectValue placeholder="Assign document type..." /></SelectTrigger>
                        <SelectContent>
                          {ALL_DOC_TYPES.map(dt => (
                            <SelectItem key={dt.value} value={dt.value} className="text-xs">{dt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {pf.error && pf.status === "error" && (
                      <p className="text-[10px] text-red-500 mt-0.5">{pf.error}</p>
                    )}
                  </div>
                  <button onClick={() => onRemove(pf.id)} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                    <X size={12} className="text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* CENTER — Shipment profile building */}
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Shipment Profile</h4>

            <div className="text-center py-4">
              <div className="text-4xl font-black text-primary">{score}%</div>
              <p className="text-xs text-muted-foreground">Filing Readiness Score</p>
            </div>

            {[
              { label: "Importer of Record", value: profileData.importerOfRecord },
              { label: "Exporter / Seller", value: profileData.exporterSeller },
              { label: "Country of Origin", value: profileData.countryOfOrigin },
              { label: "Declared Value", value: profileData.declaredValue ? `${profileData.currency} ${Number(profileData.declaredValue).toLocaleString()}` : "" },
              { label: "HTS Codes", value: profileData.htsCodes.join(", ") },
              { label: "Mode Detected", value: profileData.shipmentMode },
              { label: "Incoterms", value: profileData.incoterms },
              { label: "FTA Detected", value: profileData.ftaDetected },
              { label: "Related Party", value: profileData.relatedParty ? "Yes — Transfer pricing docs needed" : (profileData.importerOfRecord ? "No — arm's length" : "") },
              { label: "Port of Loading", value: profileData.portOfLoading },
              { label: "Port of Discharge", value: profileData.portOfDischarge },
              { label: "B/L Number", value: profileData.blNumber },
              { label: "Vessel", value: profileData.vesselName },
              { label: "Container(s)", value: profileData.containerNumbers.join(", ") },
              { label: "Total Packages", value: profileData.totalPackages },
              { label: "Gross Weight", value: profileData.grossWeight },
            ].map((field, i) => (
              <div key={i} className={cn(
                "flex items-start justify-between gap-2 py-1.5 border-b border-border/50 transition-all",
                field.value ? "animate-in fade-in duration-500" : ""
              )}>
                <span className="text-[11px] text-muted-foreground shrink-0">{field.label}</span>
                {field.value ? (
                  <span className="text-[11px] font-medium text-foreground text-right break-words min-w-0" title={field.value}>{field.value}</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50 italic">—</span>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* RIGHT — Cross-reference checks */}
        <ScrollArea className="h-full">
          <div className="p-3 space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Cross-Reference Checks</h4>

            {crossRefResults.length === 0 && stats.identified < 2 && (
              <p className="text-[11px] text-muted-foreground italic py-4 text-center">
                Cross-checks will appear after 2+ documents are processed
              </p>
            )}
            {crossRefResults.length === 0 && stats.identified >= 2 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400">All cross-reference checks passed</span>
              </div>
            )}

            {crossRefResults.map((cr, i) => {
              const isMatch = cr.severity === "low" && cr.finding.toLowerCase().includes("match");
              return (
                <div
                  key={i}
                  className={cn(
                    "p-2 rounded-lg border cursor-pointer hover:shadow-sm transition-all",
                    cr.severity === "critical" ? "border-red-500/30 bg-red-500/5" :
                    cr.severity === "high" ? "border-amber-500/30 bg-amber-500/5" :
                    isMatch ? "border-emerald-500/20 bg-emerald-500/5" :
                    "border-border bg-card"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {isMatch ? (
                      <CheckCircle2 size={12} className="text-emerald-500 mt-0.5" />
                    ) : cr.severity === "critical" ? (
                      <XCircle size={12} className="text-red-500 mt-0.5" />
                    ) : (
                      <AlertTriangle size={12} className="text-amber-500 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground">
                        {DOC_TYPE_LABELS[cr.document_a] || cr.document_a} ↔ {DOC_TYPE_LABELS[cr.document_b] || cr.document_b}
                      </p>
                      <p className="text-[11px] font-medium">{cr.finding}</p>
                      {cr.estimated_financial_impact_usd > 0 && (
                        <p className="text-[10px] text-red-600 font-medium mt-0.5">
                          Est. impact: ${cr.estimated_financial_impact_usd.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

/* ── Completion Summary ── */
function CompletionSummary({
  files, crossRefResults, profileData, score, stats,
  onGoToWorkspace, onDownloadReport,
}: {
  files: PacketFile[];
  crossRefResults: CrossRefFinding[];
  profileData: ShipmentProfileData;
  score: number;
  stats: { total: number; identified: number; fieldsExtracted: number; crossChecks: number; issues: number };
  onGoToWorkspace: () => void;
  onDownloadReport: () => void;
}) {
  const successFiles = files.filter(f => f.status === "extracted" || f.status === "extracted_warnings");
  const issueFiles = files.filter(f => f.status === "extracted_warnings");
  const failedFiles = files.filter(f => f.status === "unidentified" || f.status === "error");
  const criticalFindings = crossRefResults.filter(cr => cr.severity === "critical" || cr.severity === "high");

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="text-emerald-500" size={28} />
        </div>
        <h2 className="text-xl font-bold">Smart Packet Intake Complete</h2>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Documents", value: stats.identified },
          { label: "Fields Extracted", value: stats.fieldsExtracted },
          { label: "Cross-Checks", value: stats.crossChecks },
          { label: "Score", value: `${score}%` },
        ].map((s, i) => (
          <div key={i} className="text-center p-3 rounded-lg border border-border bg-card">
            <div className="text-lg font-bold text-primary">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Successful documents */}
      {successFiles.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-emerald-600">Documents Successfully Processed</h4>
          {successFiles.map(f => (
            <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span className="text-xs flex-1">
                <strong>{DOC_TYPE_LABELS[f.documentType || ""] || f.documentType}</strong>
                {f.extractedData?.invoice_number && ` — ${f.extractedData.invoice_number}`}
                {f.extractedData?.bl_number && ` — ${f.extractedData.bl_number}`}
                {f.extractedData?.total_value && ` — ${f.extractedData.currency || "USD"} ${Number(f.extractedData.total_value).toLocaleString()}`}
              </span>
              <span className="text-[10px] text-muted-foreground">{Math.round(f.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Issues found */}
      {(criticalFindings.length > 0 || issueFiles.length > 0) && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-amber-600">Issues Found</h4>
          {criticalFindings.map((cr, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle size={14} className={cr.severity === "critical" ? "text-red-500 shrink-0 mt-0.5" : "text-amber-500 shrink-0 mt-0.5"} />
              <div className="text-xs">
                <strong>{DOC_TYPE_LABELS[cr.document_a] || cr.document_a} ↔ {DOC_TYPE_LABELS[cr.document_b] || cr.document_b}:</strong>{" "}
                {cr.finding}
                {cr.estimated_financial_impact_usd > 0 && (
                  <span className="text-red-600 font-medium"> (est. ${cr.estimated_financial_impact_usd.toLocaleString()})</span>
                )}
              </div>
            </div>
          ))}
          {issueFiles.map(f => (
            <div key={f.id} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span className="text-xs">
                <strong>{DOC_TYPE_LABELS[f.documentType || ""]}</strong> — {f.warnings.join("; ")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Failed/unidentified */}
      {failedFiles.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-red-600">Manual Review Needed</h4>
          {failedFiles.map(f => (
            <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
              <XCircle size={14} className="text-red-500 shrink-0" />
              <span className="text-xs">{f.file.name} — {f.error || "Could not identify"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button onClick={onGoToWorkspace} className="flex-1 gap-2">
          Go to workspace — review issues <ArrowRight size={14} />
        </Button>
        <Button variant="outline" onClick={onDownloadReport} className="gap-2">
          <Download size={14} /> Download report
        </Button>
      </div>
    </div>
  );
}

/* ── Multi-Shipment Dialog ── */
function MultiShipmentDialog({
  shipments, onCreateSeparate, onAssignAll, onManualSort,
}: {
  shipments: Array<{ id: string; importerName: string; fileIds: string[] }>;
  onCreateSeparate: () => void;
  onAssignAll: () => void;
  onManualSort: () => void;
}) {
  return (
    <div className="p-6 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 text-amber-600">
        <AlertTriangle size={20} />
        <h3 className="text-base font-bold">Multiple Shipments Detected</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        AI detected documents that appear to belong to {shipments.length} different shipments:
      </p>
      {shipments.map((s, i) => (
        <div key={s.id} className="p-3 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">Shipment {String.fromCharCode(65 + i)}</Badge>
            <span className="text-sm font-semibold">{s.importerName}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{s.fileIds.length} documents identified</p>
        </div>
      ))}
      <div className="space-y-2 pt-2">
        <Button onClick={onCreateSeparate} className="w-full gap-2">
          Create {shipments.length} separate workspaces automatically
        </Button>
        <Button variant="outline" onClick={onAssignAll} className="w-full">
          Assign all to this shipment manually
        </Button>
        <Button variant="ghost" onClick={onManualSort} className="w-full text-xs">
          Review and sort documents yourself
        </Button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT — SmartPacketIntake
   ══════════════════════════════════════════════════════════ */

interface SmartPacketIntakeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId?: string;
  onComplete?: (profileData: ShipmentProfileData) => void;
}

export function SmartPacketIntake({ open, onOpenChange, shipmentId, onComplete }: SmartPacketIntakeProps) {
  const {
    files, addFiles, removeFile, startProcessing,
    confirmDocType, assignDocType,
    crossRefResults, detectedShipments, profileData,
    isComplete, score, stats, reset,
  } = useSmartPacketIntake(shipmentId);

  const [phase, setPhase] = useState<"drop" | "processing" | "multi_shipment" | "summary">("drop");

  const handleDrop = useCallback((droppedFiles: File[]) => {
    const queued = addFiles(droppedFiles);
    if (queued.length > 0) {
      setPhase("processing");
      startProcessing(queued).then(() => {
        // After processing, check for multi-shipment or go to summary
      });
    }
  }, [addFiles, startProcessing]);

  const handleAddMoreFiles = useCallback((droppedFiles: File[]) => {
    const queued = addFiles(droppedFiles);
    if (queued.length > 0) {
      startProcessing(queued);
    }
  }, [addFiles, startProcessing]);

  // Check completion
  const allDone = files.length > 0 && !stats.processing;

  const handleGoToWorkspace = useCallback(() => {
    if (onComplete) onComplete(profileData);
    onOpenChange(false);
    setPhase("drop");
    reset();
  }, [onComplete, onOpenChange, profileData, reset]);

  const handleDownloadReport = useCallback(() => {
    // Generate a simple text report
    const lines: string[] = [
      "═══════════════════════════════════════",
      "SMART PACKET INTAKE REPORT",
      "═══════════════════════════════════════",
      `Date: ${new Date().toLocaleString()}`,
      `Shipment ID: ${shipmentId || "Draft"}`,
      "",
      "── SHIPMENT SUMMARY ──",
      `Importer: ${profileData.importerOfRecord || "N/A"}`,
      `Exporter: ${profileData.exporterSeller || "N/A"}`,
      `Origin: ${profileData.countryOfOrigin || "N/A"}`,
      `Value: ${profileData.currency} ${profileData.declaredValue || "N/A"}`,
      `Mode: ${profileData.shipmentMode || "N/A"}`,
      `HTS Codes: ${profileData.htsCodes.join(", ") || "N/A"}`,
      `Filing Readiness Score: ${score}%`,
      "",
      "── DOCUMENTS PROCESSED ──",
    ];
    files.forEach(f => {
      const typeName = DOC_TYPE_LABELS[f.documentType || ""] || f.documentType || "Unknown";
      lines.push(`${f.status === "extracted" ? "✓" : f.status === "extracted_warnings" ? "⚠" : "✕"} ${f.file.name} → ${typeName} (${Math.round(f.confidence * 100)}%)`);
    });
    if (crossRefResults.length > 0) {
      lines.push("", "── CROSS-REFERENCE FINDINGS ──");
      crossRefResults.forEach(cr => {
        lines.push(`[${cr.severity.toUpperCase()}] ${cr.document_a} ↔ ${cr.document_b}: ${cr.finding}`);
        if (cr.recommendation) lines.push(`  → ${cr.recommendation}`);
      });
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Orchestra_Intake_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [files, crossRefResults, profileData, score, shipmentId]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setPhase("drop");
      reset();
    }, 300);
  }, [onOpenChange, reset]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] h-[700px] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border bg-card/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Upload size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Smart Packet Intake</h2>
              <p className="text-[10px] text-muted-foreground">
                {phase === "drop" ? "Drop your document packet to begin" :
                 phase === "processing" ? `Processing ${files.length} files...` :
                 "Intake complete"}
              </p>
            </div>
          </div>
          {files.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{files.length} files</span>
              <span>·</span>
              <span>{(files.reduce((sum, f) => sum + f.file.size, 0) / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {phase === "drop" && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="w-full max-w-xl space-y-4">
                <PacketDropZone onDrop={handleDrop} variant="full" />
                <p className="text-center text-xs text-muted-foreground">
                  Or skip and fill manually →
                </p>
              </div>
            </div>
          )}

          {phase === "processing" && (
            <div className="h-full flex flex-col">
              <ProcessingScreen
                files={files}
                crossRefResults={crossRefResults}
                profileData={profileData}
                score={score}
                stats={stats}
                onConfirm={confirmDocType}
                onAssign={assignDocType}
                onRemove={removeFile}
              />
              {allDone && (
                <div className="px-4 py-3 border-t border-border bg-card/50 flex items-center justify-between shrink-0">
                  <PacketDropZone onDrop={handleAddMoreFiles} variant="compact" />
                  <Button onClick={() => setPhase("summary")} className="gap-2 ml-4">
                    View Summary <ChevronRight size={14} />
                  </Button>
                </div>
              )}
            </div>
          )}

          {phase === "multi_shipment" && detectedShipments.length > 1 && (
            <MultiShipmentDialog
              shipments={detectedShipments}
              onCreateSeparate={() => setPhase("summary")}
              onAssignAll={() => setPhase("summary")}
              onManualSort={() => setPhase("processing")}
            />
          )}

          {phase === "summary" && (
            <ScrollArea className="h-full">
              <CompletionSummary
                files={files}
                crossRefResults={crossRefResults}
                profileData={profileData}
                score={score}
                stats={stats}
                onGoToWorkspace={handleGoToWorkspace}
                onDownloadReport={handleDownloadReport}
              />
            </ScrollArea>
          )}
        </div>

        {/* Footer disclaimer */}
        <div className="px-5 py-2 border-t border-border bg-muted/30 shrink-0">
          <p className="text-[9px] text-muted-foreground text-center">
            Analysis powered by AI. All extracted data should be verified against original documents before filing.
            The broker retains final filing responsibility as the importer's legal representative.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Inline Drop Zone for Documents Tab ── */
export function SmartPacketIntakeButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="gap-2 mb-4"
      size="sm"
    >
      <Upload size={14} />
      Smart Packet Intake
    </Button>
  );
}

/* ── Drop Zone for Wizard Step 1 ── */
export { PacketDropZone };
