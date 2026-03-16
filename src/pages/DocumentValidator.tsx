import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Upload, Loader2, CheckCircle, AlertTriangle, XCircle,
  ShieldAlert, Info, Camera, Download, Eye, Pencil, RefreshCw,
  Save, History, LayoutTemplate, GitCompare, RotateCcw, Copy,
  Package, Truck, Plane, Ship, Search
} from "lucide-react";
import { toast } from "sonner";
import { ExportButton } from "@/components/ExportButton";
import {
  type UploadedDocument, type ExtractedField, type DetectedDocument,
  VALIDATION_DETAIL_COLUMNS, VALIDATION_SUMMARY_COLUMNS,
  buildDetailExportRows, buildSummaryExportRow,
} from "@/lib/validationExport";
import { SHIPMENT_TEMPLATES, type ShipmentTemplate } from "@/lib/shipmentTemplates";
import { detectCrossDocMismatches, type CrossDocMismatch } from "@/lib/crossDocMatching";
import { useValidationHistory, type ValidationSession } from "@/hooks/useValidationHistory";

const DOC_TYPES = [
  "commercial_invoice", "packing_list", "bill_of_lading", "air_waybill",
  "certificate_of_origin", "customs_declaration", "export_license",
  "import_permit", "insurance_certificate", "inspection_certificate",
  "phytosanitary_certificate", "fumigation_certificate",
  "dangerous_goods_declaration", "product_photo", "shipping_label", "other",
];

// Auto-detect doc type from filename
function guessDocType(filename: string): string {
  const fn = filename.toLowerCase();
  if (fn.includes("invoice") || fn.includes("factura")) return "commercial_invoice";
  if (fn.includes("packing") || fn.includes("pack_list")) return "packing_list";
  if (fn.includes("bill_of_lading") || fn.includes("bol") || fn.includes("bl_")) return "bill_of_lading";
  if (fn.includes("airway") || fn.includes("awb")) return "air_waybill";
  if (fn.includes("origin") || fn.includes("coo")) return "certificate_of_origin";
  if (fn.includes("customs") || fn.includes("declaration")) return "customs_declaration";
  if (fn.includes("export_lic")) return "export_license";
  if (fn.includes("import_perm")) return "import_permit";
  if (fn.includes("insurance")) return "insurance_certificate";
  if (fn.includes("inspect")) return "inspection_certificate";
  if (fn.includes("phyto")) return "phytosanitary_certificate";
  if (fn.includes("fumigat")) return "fumigation_certificate";
  if (fn.includes("dangerous") || fn.includes("dg_")) return "dangerous_goods_declaration";
  if (fn.includes("label") || fn.includes("shipping_label")) return "shipping_label";
  if (fn.includes("product") || fn.includes("photo")) return "product_photo";
  return "commercial_invoice";
}

interface ValidationResult {
  completenessScore: number;
  consistencyScore: number;
  overallReadiness: "ready" | "needs_attention" | "not_ready" | "critical";
  missingDocuments: { documentType: string; importance: string; reason: string }[];
  issues: { severity: string; field: string; description: string; suggestion: string }[];
  countryRequirements?: string[];
  recommendations: string[];
}

// External filing requirement types — not part of packet integrity
const EXTERNAL_FILING_TYPES = new Set([
  "isf filing", "isf filing confirmation", "importer security filing",
  "ams filing", "aci filing", "ens filing", "customs bond",
  "entry summary", "prior notice", "fda prior notice",
  "lacey act declaration", "tsca certification",
]);

const DOWNSTREAM_DOC_TYPES = new Set([
  "arrival notice", "delivery order", "cargo release order",
  "customs release", "proof of delivery", "import declaration",
]);

interface DualDisposition {
  packetIntegrity: 'clean' | 'warnings' | 'conflicts' | 'incomplete';
  complianceReadiness: 'ready' | 'action_required' | 'not_ready' | 'pending';
  packetLabel: string;
  complianceLabel: string;
  complianceDetail?: string;
}

const PACKET_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  clean: { label: "PACKET CLEAN", color: "text-risk-low", bg: "border-risk-low/30 bg-risk-low/10", icon: CheckCircle },
  warnings: { label: "PACKET OK — MINOR NOTES", color: "text-risk-medium", bg: "border-risk-medium/30 bg-risk-medium/10", icon: AlertTriangle },
  conflicts: { label: "DOCUMENT CONFLICTS", color: "text-risk-high", bg: "border-risk-high/30 bg-risk-high/10", icon: XCircle },
  incomplete: { label: "INCOMPLETE PACKET", color: "text-risk-critical", bg: "border-risk-critical/30 bg-risk-critical/10", icon: ShieldAlert },
};

const COMPLIANCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ready: { label: "FILING READY", color: "text-risk-low", bg: "border-risk-low/30 bg-risk-low/10" },
  action_required: { label: "ACTION REQUIRED", color: "text-risk-medium", bg: "border-risk-medium/30 bg-risk-medium/10" },
  not_ready: { label: "NOT FILING READY", color: "text-risk-high", bg: "border-risk-high/30 bg-risk-high/10" },
  pending: { label: "PENDING", color: "text-muted-foreground", bg: "border-border bg-card" },
};

const readinessConfig = {
  ready: { label: "READY TO FILE", color: "text-risk-low", bg: "bg-risk-low/10 border-risk-low/30", icon: CheckCircle },
  needs_attention: { label: "NEEDS ATTENTION", color: "text-risk-medium", bg: "bg-risk-medium/10 border-risk-medium/30", icon: AlertTriangle },
  not_ready: { label: "NOT READY", color: "text-risk-high", bg: "bg-risk-high/10 border-risk-high/30", icon: XCircle },
  critical: { label: "CRITICAL ISSUES", color: "text-risk-critical", bg: "bg-risk-critical/10 border-risk-critical/30", icon: ShieldAlert },
};

function ConfidenceDot({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 90 ? "bg-risk-low" : pct >= 70 ? "bg-risk-medium" : "bg-risk-high";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-mono">{pct}% confidence</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function computeDualDisposition(result: ValidationResult, mismatches: CrossDocMismatch[], lowConfFields: number): DualDisposition {
  const trueConflicts = mismatches.filter((m) => m.mismatchType === "true_conflict");
  const critConflicts = trueConflicts.filter((m) => m.severity === "critical").length;
  const highConflicts = trueConflicts.filter((m) => m.severity === "high").length;

  // Classify missing docs
  const missingUploaded = result.missingDocuments.filter(
    (d) => d.importance === "required"
      && !DOWNSTREAM_DOC_TYPES.has(d.documentType.toLowerCase())
      && !EXTERNAL_FILING_TYPES.has(d.documentType.toLowerCase())
  );
  const missingExternal = result.missingDocuments.filter(
    (d) => EXTERNAL_FILING_TYPES.has(d.documentType.toLowerCase())
  );

  // --- Packet Integrity (internal consistency of uploaded docs) ---
  let packetIntegrity: DualDisposition['packetIntegrity'] = 'clean';
  let packetLabel = 'Documentation Internally Consistent';

  if (critConflicts > 0 || highConflicts > 0) {
    packetIntegrity = 'conflicts';
    packetLabel = `${critConflicts + highConflicts} Material Conflict${critConflicts + highConflicts > 1 ? 's' : ''} Detected`;
  } else if (missingUploaded.length > 0) {
    packetIntegrity = 'incomplete';
    packetLabel = `${missingUploaded.length} Required Document${missingUploaded.length > 1 ? 's' : ''} Missing`;
  } else if (lowConfFields > 3) {
    packetIntegrity = 'warnings';
    packetLabel = 'Low-Confidence Extractions Present';
  } else if (trueConflicts.length > 0) {
    packetIntegrity = 'warnings';
    packetLabel = 'Minor Discrepancies Noted';
  }

  // --- Compliance Readiness (external filings + regulatory) ---
  let complianceReadiness: DualDisposition['complianceReadiness'] = 'ready';
  let complianceLabel = 'All Filing Requirements Met';
  let complianceDetail: string | undefined;

  const critIssues = result.issues.filter((i) => i.severity === "critical").length;
  const highIssues = result.issues.filter((i) => i.severity === "high").length;

  if (critIssues > 0) {
    complianceReadiness = 'not_ready';
    complianceLabel = 'Critical Compliance Issue';
  } else if (missingExternal.length > 0 || highIssues > 0) {
    complianceReadiness = 'action_required';
    const parts: string[] = [];
    if (missingExternal.length > 0) parts.push(missingExternal.map(d => d.documentType.replace(/_/g, ' ')).join(', '));
    if (highIssues > 0) parts.push(`${highIssues} issue${highIssues > 1 ? 's' : ''}`);
    complianceLabel = 'Filing Action Required';
    complianceDetail = parts.join(' · ');
  } else if (result.issues.length > 0 || result.countryRequirements?.length) {
    complianceReadiness = 'action_required';
    complianceLabel = 'Advisory Items Present';
  }

  return { packetIntegrity, complianceReadiness, packetLabel, complianceLabel, complianceDetail };
}

// Legacy compat for saved sessions
function dispositionFromDual(d: DualDisposition): string {
  if (d.packetIntegrity === 'conflicts') return 'data_mismatch';
  if (d.packetIntegrity === 'incomplete') return 'missing_required_docs';
  if (d.complianceReadiness === 'not_ready') return 'high_risk';
  if (d.complianceReadiness === 'action_required') return 'cleared_warnings';
  if (d.packetIntegrity === 'warnings') return 'cleared_warnings';
  return 'ready_to_ship';
}

export default function DocumentValidator() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [shipmentMode, setShipmentMode] = useState("sea");
  const [originCountry, setOriginCountry] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [shipmentId, setShipmentId] = useState("");
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [editingField, setEditingField] = useState<{ docId: string; fieldName: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [crossDocMismatches, setCrossDocMismatches] = useState<CrossDocMismatch[]>([]);
  const [disposition, setDisposition] = useState("pending");
  const [dualDisp, setDualDisp] = useState<DualDisposition | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ShipmentTemplate | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { sessions, loading: historyLoading, fetchSessions, saveSession } = useValidationHistory();

  // Auto-fill shipment context from extracted fields
  const autoFillContext = useCallback((fields: ExtractedField[]) => {
    for (const f of fields) {
      const name = f.fieldName.toLowerCase();
      if (name.includes("origin_country") && !originCountry && f.confidence >= 0.6)
        setOriginCountry(f.value);
      if (name.includes("destination_country") && !destinationCountry && f.confidence >= 0.6)
        setDestinationCountry(f.value);
      if (name.includes("hs_code") && !hsCode && f.confidence >= 0.6)
        setHsCode(f.value);
      if ((name.includes("declared_value") || name.includes("total_value")) && !declaredValue && f.confidence >= 0.6)
        setDeclaredValue(f.value);
      if (name.includes("shipment_id") && !shipmentId && f.confidence >= 0.6)
        setShipmentId(f.value);
      if (name.includes("transport_mode") && f.confidence >= 0.6) {
        const val = f.value.toLowerCase();
        if (val.includes("air")) setShipmentMode("air");
        else if (val.includes("sea") || val.includes("ocean")) setShipmentMode("sea");
        else if (val.includes("land") || val.includes("truck") || val.includes("road")) setShipmentMode("land");
      }
      if (name.includes("invoice_number") && !shipmentId && f.confidence >= 0.6)
        setShipmentId(f.value);
    }
  }, [originCountry, destinationCountry, hsCode, declaredValue, shipmentId]);

  const extractDocument = async (doc: UploadedDocument) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, status: "extracting" } : d))
    );
    try {
      const formData = new FormData();
      formData.append("file", doc.file);
      formData.append("documentType", doc.type);
      formData.append("shipmentContext", JSON.stringify({ shipmentMode, originCountry, destinationCountry }));

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-document`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: formData,
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Extraction failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const allFields: ExtractedField[] = (data.fields || []).map((f: any) => ({
        fieldName: f.fieldName, value: f.value, confidence: f.confidence,
        sourceLocation: f.sourceLocation, sourceDocumentType: f.sourceDocumentType,
      }));
      const detectedDocs: DetectedDocument[] = (data.detectedDocuments || []).map((d: any) => ({
        documentType: d.documentType, pageRange: d.pageRange,
        confidence: d.confidence, detectionMethod: d.detectionMethod || "direct",
      }));
      const isMulti = data.isMultiDocument === true && detectedDocs.length > 1;

      if (isMulti) {
        // Split into virtual sub-documents per detected document type
        const subDocs: UploadedDocument[] = detectedDocs.map((dd) => {
          const subFields = allFields.filter(
            (f) => f.sourceDocumentType?.toLowerCase() === dd.documentType.toLowerCase()
          );
          return {
            id: crypto.randomUUID(),
            file: doc.file,
            type: dd.documentType,
            name: `${doc.file.name} → ${dd.documentType.replace(/_/g, " ")}`,
            status: "extracted" as const,
            extractedFields: subFields,
            detectedType: dd.documentType,
            overallQuality: data.overallQuality,
            parseWarnings: [],
            rawTextSummary: "",
            extractionId: data.extractionId,
            parentUploadId: doc.id,
            isMultiDocument: false,
            detectedDocuments: [],
          };
        });

        // Also collect any unattributed fields
        const attributedTypes = new Set(detectedDocs.map((d) => d.documentType.toLowerCase()));
        const unattributed = allFields.filter(
          (f) => !f.sourceDocumentType || !attributedTypes.has(f.sourceDocumentType.toLowerCase())
        );

        // Replace the parent doc with a packet marker + sub-docs
        setDocuments((prev) => {
          const withoutParent = prev.filter((d) => d.id !== doc.id);
          const parentMarker: UploadedDocument = {
            ...doc,
            status: "extracted",
            extractedFields: unattributed,
            detectedType: "multi_document_packet",
            overallQuality: data.overallQuality,
            parseWarnings: data.parseWarnings || [],
            rawTextSummary: data.rawTextSummary || "",
            extractionId: data.extractionId,
            isMultiDocument: true,
            detectedDocuments: detectedDocs,
          };
          return [...withoutParent, parentMarker, ...subDocs];
        });

        // Auto-fill from all fields
        autoFillContext(allFields);
        toast.success(`Detected ${detectedDocs.length} documents in ${doc.file.name}, extracted ${allFields.length} fields`);
      } else {
        // Single document handling (existing behavior)
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? {
                  ...d, status: "extracted", extractedFields: allFields,
                  detectedType: data.detectedDocumentType,
                  overallQuality: data.overallQuality,
                  parseWarnings: data.parseWarnings,
                  rawTextSummary: data.rawTextSummary,
                  extractionId: data.extractionId,
                  isMultiDocument: false,
                  detectedDocuments: detectedDocs.length > 0 ? detectedDocs : [{ documentType: data.detectedDocumentType || doc.type, confidence: 1, detectionMethod: "direct" as const }],
                }
              : d
          )
        );
        autoFillContext(allFields);
        toast.success(`Extracted ${allFields.length} fields from ${doc.file.name}`);
      }
    } catch (e: any) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: "error", error: e.message } : d))
      );
      toast.error(e.message || "Extraction failed");
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newDocs: UploadedDocument[] = [];
    for (const file of Array.from(files)) {
      const isValid = file.type.startsWith("image/") || file.type === "application/pdf";
      if (!isValid) { toast.error(`${file.name}: unsupported format`); continue; }
      newDocs.push({
        id: crypto.randomUUID(), file, type: guessDocType(file.name), name: file.name,
        status: "uploading", extractedFields: [],
      });
    }
    setDocuments((prev) => [...prev, ...newDocs]);
    for (const doc of newDocs) await extractDocument(doc);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };

  // Run cross-doc matching whenever documents change (exclude packet parents)
  useEffect(() => {
    const extracted = documents.filter((d) => d.status === "extracted" && !d.isMultiDocument);
    if (extracted.length >= 2) {
      setCrossDocMismatches(detectCrossDocMismatches(extracted));
    } else {
      setCrossDocMismatches([]);
    }
  }, [documents]);

  const handleValidate = async () => {
    const extracted = documents.filter((d) => d.status === "extracted" && !d.isMultiDocument);
    if (extracted.length === 0) { toast.error("Upload and extract at least one document first"); return; }
    setValidating(true); setResult(null);
    try {
      const docsPayload = extracted.map((d) => ({
        type: d.detectedType || d.type, name: d.name,
        extractedFields: Object.fromEntries(d.extractedFields.map((f) => [f.fieldName, f.value])),
      }));
      const { data, error } = await supabase.functions.invoke("validate-documents", {
        body: { documents: docsPayload, shipmentMode, originCountry, destinationCountry, hsCode, declaredValue, shipmentId: shipmentId || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      const dual = computeDualDisposition(data, crossDocMismatches, lowConfFields);
      setDualDisp(dual);
      setDisposition(dispositionFromDual(dual));
      setActiveTab("results");
      toast.success("Validation complete");
    } catch (e: any) {
      toast.error(e.message || "Validation failed");
    } finally { setValidating(false); }
  };

  const handleSaveSession = async () => {
    if (!result) return;
    const id = await saveSession({
      shipmentId, templateId: selectedTemplate?.id, shipmentMode, originCountry, destinationCountry,
      hsCode, declaredValue, documents, validationResult: result,
      crossDocMismatches, disposition,
    });
    if (id) setSavedSessionId(id);
  };

  const handleLoadTemplate = (t: ShipmentTemplate) => {
    setSelectedTemplate(t);
    setShipmentMode(t.mode);
    if (t.origin) setOriginCountry(t.origin);
    if (t.destination) setDestinationCountry(t.destination);
    setShowTemplates(false);
    toast.success(`Template loaded: ${t.name}`);
  };

  const handleResetAll = () => {
    setDocuments([]); setResult(null); setCrossDocMismatches([]);
    setShipmentMode("sea"); setOriginCountry(""); setDestinationCountry("");
    setHsCode(""); setDeclaredValue(""); setShipmentId("");
    setSelectedTemplate(null); setDisposition("pending"); setSavedSessionId(null);
    setActiveTab("upload");
    toast("Workspace reset");
  };

  const handleRecallSession = (session: ValidationSession) => {
    setShipmentId(session.shipment_id || "");
    setShipmentMode(session.shipment_mode || "sea");
    setOriginCountry(session.origin_country || "");
    setDestinationCountry(session.destination_country || "");
    setHsCode(session.hs_code || "");
    setDeclaredValue(session.declared_value || "");
    setResult(session.validation_result);
    setCrossDocMismatches(session.cross_doc_mismatches || []);
    setDisposition(session.disposition || "pending");
    setSavedSessionId(session.id);
    setShowHistory(false);
    setActiveTab("results");
    toast.success("Session recalled");
  };

  const startEdit = (docId: string, fieldName: string, currentValue: string) => {
    setEditingField({ docId, fieldName }); setEditValue(currentValue);
  };
  const saveEdit = () => {
    if (!editingField) return;
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === editingField.docId
          ? { ...d, extractedFields: d.extractedFields.map((f) => f.fieldName === editingField.fieldName ? { ...f, value: editValue, confidence: 1.0 } : f) }
          : d
      )
    );
    setEditingField(null); setEditValue("");
  };
  const removeDocument = (id: string) => setDocuments((prev) => prev.filter((d) => d.id !== id));

  const allExtracted = documents.length > 0 && documents.filter(d => !d.isMultiDocument).length > 0 && documents.filter(d => !d.isMultiDocument).every((d) => d.status === "extracted");
  const anyExtracting = documents.some((d) => d.status === "extracting");
  const nonPacketDocs = documents.filter(d => !d.isMultiDocument);
  const totalFields = nonPacketDocs.reduce((sum, d) => sum + d.extractedFields.length, 0);
  const highConfFields = nonPacketDocs.reduce((sum, d) => sum + d.extractedFields.filter((f) => f.confidence >= 0.8).length, 0);
  const lowConfFields = totalFields - highConfFields;

  const exportContext = { shipmentId, origin: originCountry, destination: destinationCountry, mode: shipmentMode };
  const detailRows = result ? buildDetailExportRows(documents, result, exportContext) : [];
  const summaryRows = result ? [buildSummaryExportRow(documents, result, exportContext)] : [];

  const filteredSessions = sessions.filter((s) => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return (s.shipment_id || "").toLowerCase().includes(q)
      || (s.origin_country || "").toLowerCase().includes(q)
      || (s.destination_country || "").toLowerCase().includes(q)
      || (s.disposition || "").toLowerCase().includes(q);
  });

  // Compute all detected document types across all uploads (including sub-docs from packets)
  const allDetectedDocTypes = new Set<string>();
  for (const doc of documents) {
    if (doc.status === "extracted" && !doc.isMultiDocument) {
      allDetectedDocTypes.add((doc.detectedType || doc.type).toLowerCase());
    }
    if (doc.detectedDocuments) {
      for (const dd of doc.detectedDocuments) {
        allDetectedDocTypes.add(dd.documentType.toLowerCase());
      }
    }
  }

  // Template required docs checklist — uses allDetectedDocTypes for accurate matching
  const templateChecklist = selectedTemplate
    ? selectedTemplate.requiredDocs.map((docType) => ({
        docType,
        present: allDetectedDocTypes.has(docType.toLowerCase()),
      }))
    : null;

  const modeIcon = shipmentMode === "air" ? <Plane size={14} /> : shipmentMode === "sea" ? <Ship size={14} /> : <Truck size={14} />;

  // Visible documents (exclude packet parents from count, show sub-docs instead)
  const visibleDocs = documents.filter((d) => !d.isMultiDocument);
  const packetParents = documents.filter((d) => d.isMultiDocument);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono">DOCUMENT PACKET VALIDATOR</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload → AI Extract → Auto-Validate → Export
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1.5" onClick={() => setShowTemplates(true)}>
            <LayoutTemplate size={12} /> Templates
          </Button>
          <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1.5" onClick={() => { setShowHistory(true); fetchSessions(); }}>
            <History size={12} /> History
          </Button>
          <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1.5" onClick={handleResetAll}>
            <RotateCcw size={12} /> Reset
          </Button>
          {result && !savedSessionId && (
            <Button variant="default" size="sm" className="font-mono text-[10px] gap-1.5" onClick={handleSaveSession}>
              <Save size={12} /> Save Session
            </Button>
          )}
          {savedSessionId && (
            <Badge variant="outline" className="font-mono text-[10px] border-risk-low/50 text-risk-low">SAVED</Badge>
          )}
          {result && (
            <>
              <ExportButton data={detailRows} columns={VALIDATION_DETAIL_COLUMNS} filename={`validation-detail-${shipmentId || "draft"}`} label="Export Details" />
              <ExportButton data={summaryRows} columns={VALIDATION_SUMMARY_COLUMNS} filename={`validation-summary-${shipmentId || "draft"}`} label="Export Summary" />
            </>
          )}
        </div>
      </div>

      {/* Dual Disposition Banner */}
      {result && dualDisp && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Packet Integrity */}
          {(() => {
            const pc = PACKET_CONFIG[dualDisp.packetIntegrity];
            const PIcon = pc.icon;
            return (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${pc.bg}`}>
                <PIcon size={18} className={pc.color} />
                <div className="flex-1 min-w-0">
                  <p className={`font-mono text-xs font-bold ${pc.color}`}>{pc.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{dualDisp.packetLabel}</p>
                </div>
                <Badge variant="outline" className="text-[9px] font-mono shrink-0">PACKET</Badge>
              </div>
            );
          })()}
          {/* Compliance Readiness */}
          {(() => {
            const cc = COMPLIANCE_CONFIG[dualDisp.complianceReadiness];
            return (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${cc.bg}`}>
                <ShieldAlert size={18} className={cc.color} />
                <div className="flex-1 min-w-0">
                  <p className={`font-mono text-xs font-bold ${cc.color}`}>{cc.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{dualDisp.complianceDetail || dualDisp.complianceLabel}</p>
                </div>
                <Badge variant="outline" className="text-[9px] font-mono shrink-0">FILING</Badge>
              </div>
            );
          })()}
          {selectedTemplate && (
            <Badge variant="secondary" className="text-[10px] font-mono md:col-span-2 w-fit">{selectedTemplate.name}</Badge>
          )}
        </div>
      )}

      {/* Stats Bar */}
      {documents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-border bg-card"><CardContent className="py-3 px-4">
            <p className="text-[10px] font-mono text-muted-foreground">DOCUMENTS</p>
            <p className="text-2xl font-bold font-mono">{visibleDocs.length}</p>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="py-3 px-4">
            <p className="text-[10px] font-mono text-muted-foreground">FIELDS EXTRACTED</p>
            <p className="text-2xl font-bold font-mono">{totalFields}</p>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="py-3 px-4">
            <p className="text-[10px] font-mono text-muted-foreground">AUTO-APPROVED</p>
            <p className="text-2xl font-bold font-mono text-risk-low">{highConfFields}</p>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="py-3 px-4">
            <p className="text-[10px] font-mono text-muted-foreground">NEEDS REVIEW</p>
            <p className="text-2xl font-bold font-mono text-risk-medium">{lowConfFields}</p>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="py-3 px-4">
            <p className="text-[10px] font-mono text-muted-foreground">MISMATCHES</p>
            <p className="text-2xl font-bold font-mono text-risk-high">
              {crossDocMismatches.filter(m => m.mismatchType === "true_conflict").length}
            </p>
            {crossDocMismatches.filter(m => m.mismatchType !== "true_conflict").length > 0 && (
              <p className="text-[10px] font-mono text-muted-foreground">+{crossDocMismatches.filter(m => m.mismatchType !== "true_conflict").length} info</p>
            )}
          </CardContent></Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="font-mono">
          <TabsTrigger value="upload" className="text-xs"><Upload size={12} className="mr-1.5" /> UPLOAD</TabsTrigger>
          <TabsTrigger value="fields" className="text-xs" disabled={totalFields === 0}><Eye size={12} className="mr-1.5" /> FIELDS ({totalFields})</TabsTrigger>
          <TabsTrigger value="mismatches" className="text-xs" disabled={crossDocMismatches.length === 0}>
            <GitCompare size={12} className="mr-1.5" /> MISMATCHES ({crossDocMismatches.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="text-xs" disabled={!result}><CheckCircle size={12} className="mr-1.5" /> RESULTS</TabsTrigger>
        </TabsList>

        {/* UPLOAD TAB */}
        <TabsContent value="upload" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Drop zone */}
              <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                className="relative border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                <Upload size={36} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">Drop documents here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG — invoices, packing lists, BOL, AWB, COO, labels, product photos
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Button variant="outline" size="sm" className="font-mono text-[10px]"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <FileText size={12} className="mr-1.5" /> Browse Files
                  </Button>
                  <Button variant="outline" size="sm" className="font-mono text-[10px]"
                    onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                    <Camera size={12} className="mr-1.5" /> Capture Photo
                  </Button>
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                </div>
              </div>

              {/* Template required docs checklist */}
              {templateChecklist && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-mono text-primary">REQUIRED DOCUMENTS — {selectedTemplate?.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {templateChecklist.map((item) => (
                      <div key={item.docType} className="flex items-center gap-2 text-sm">
                        {item.present
                          ? <CheckCircle size={14} className="text-risk-low" />
                          : <XCircle size={14} className="text-risk-high" />}
                        <span className={`font-mono text-xs ${item.present ? "text-muted-foreground" : ""}`}>
                          {item.docType.replace(/_/g, " ").toUpperCase()}
                        </span>
                        {item.present && <Badge variant="outline" className="text-[10px] border-risk-low/50 text-risk-low">UPLOADED</Badge>}
                      </div>
                    ))}
                    {selectedTemplate?.ruleHints && selectedTemplate.ruleHints.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border space-y-1">
                        <p className="text-[10px] font-mono text-muted-foreground">RULE HINTS</p>
                        {selectedTemplate.ruleHints.map((hint, i) => (
                          <p key={i} className="text-xs flex items-start gap-1.5">
                            <Info size={10} className="text-primary shrink-0 mt-0.5" /> {hint}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Detected Documents Panel — shows for multi-doc packets */}
              {packetParents.length > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-mono text-primary">
                      DETECTED DOCUMENTS — {allDetectedDocTypes.size} types identified
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground">
                      Combined packet segmented into logical documents
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {packetParents.flatMap((p) => p.detectedDocuments || []).map((dd, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle size={14} className={
                          dd.detectionMethod === "direct" ? "text-risk-low" :
                          dd.detectionMethod === "inferred" ? "text-risk-medium" : "text-risk-high"
                        } />
                        <span className="font-mono text-xs">{dd.documentType.replace(/_/g, " ").toUpperCase()}</span>
                        <Badge variant="outline" className={`text-[10px] font-mono ${
                          dd.detectionMethod === "direct" ? "border-risk-low/50 text-risk-low" :
                          dd.detectionMethod === "inferred" ? "border-risk-medium/50 text-risk-medium" :
                          "border-risk-high/50 text-risk-high"
                        }`}>
                          {dd.detectionMethod}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{Math.round(dd.confidence * 100)}%</span>
                        {dd.pageRange && <span className="text-[10px] text-muted-foreground">({dd.pageRange})</span>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Uploaded documents list */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <Card key={doc.id} className={`border-border bg-card ${doc.isMultiDocument ? "border-primary/20" : doc.parentUploadId ? "ml-4 border-l-2 border-l-primary/30" : ""}`}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {doc.status === "extracting" ? <Loader2 size={16} className="text-primary animate-spin shrink-0" />
                            : doc.status === "extracted" ? <CheckCircle size={16} className="text-risk-low shrink-0" />
                            : doc.status === "error" ? <XCircle size={16} className="text-risk-critical shrink-0" />
                            : <Upload size={16} className="text-muted-foreground shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-mono truncate">{doc.isMultiDocument ? `📦 ${doc.file.name}` : doc.parentUploadId ? `↳ ${doc.name}` : doc.file.name}</span>
                              {doc.isMultiDocument ? (
                                <Badge variant="secondary" className="text-[10px] font-mono">COMBINED PACKET</Badge>
                              ) : (
                                <Select value={doc.type} onValueChange={(val) => setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, type: val } : d))}>
                                  <SelectTrigger className="h-6 w-auto text-[10px] font-mono border-border">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DOC_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t.replace(/_/g, " ")}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              )}
                              {!doc.isMultiDocument && doc.detectedType && doc.detectedType !== doc.type && (
                                <Badge variant="secondary" className="text-[10px] font-mono">AI: {doc.detectedType.replace(/_/g, " ")}</Badge>
                              )}
                              {doc.overallQuality && !doc.parentUploadId && (
                                <Badge variant="outline" className={`text-[10px] font-mono ${doc.overallQuality === "high" ? "border-risk-low/50 text-risk-low" : doc.overallQuality === "medium" ? "border-risk-medium/50 text-risk-medium" : "border-risk-high/50 text-risk-high"}`}>
                                  {doc.overallQuality} quality
                                </Badge>
                              )}
                            </div>
                            {doc.status === "extracting" && <p className="text-xs text-muted-foreground mt-1">Extracting fields with AI...</p>}
                            {doc.isMultiDocument && doc.detectedDocuments && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {doc.detectedDocuments.length} documents detected · {doc.extractedFields.length} unattributed fields
                              </p>
                            )}
                            {doc.status === "extracted" && !doc.isMultiDocument && <p className="text-xs text-muted-foreground mt-1">{doc.extractedFields.length} fields extracted</p>}
                            {doc.status === "error" && <p className="text-xs text-risk-critical mt-1">{doc.error}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            {doc.status === "error" && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => extractDocument(doc)}><RefreshCw size={12} /></Button>
                            )}
                            {!doc.parentUploadId && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-risk-critical" onClick={() => {
                                // Remove parent and all its children
                                setDocuments((prev) => prev.filter((d) => d.id !== doc.id && d.parentUploadId !== doc.id));
                              }}>
                                <XCircle size={12} />
                              </Button>
                            )}
                          </div>
                        </div>
                        {doc.parseWarnings && doc.parseWarnings.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {doc.parseWarnings.map((w, i) => (
                              <p key={i} className="text-[10px] text-risk-medium flex items-center gap-1"><AlertTriangle size={10} className="shrink-0" /> {w}</p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Context Panel */}
            <div className="space-y-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-mono text-muted-foreground">SHIPMENT CONTEXT</CardTitle>
                  <p className="text-[10px] text-muted-foreground">Auto-filled from documents. Edit if needed.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-1 block">Transport Mode</label>
                    <Select value={shipmentMode} onValueChange={setShipmentMode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="air">Air</SelectItem>
                        <SelectItem value="sea">Sea</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-1 block">Origin</label>
                    <Input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="Auto-detected" />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-1 block">Destination</label>
                    <Input value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} placeholder="Auto-detected" />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-1 block">HS Code</label>
                    <Input value={hsCode} onChange={(e) => setHsCode(e.target.value)} placeholder="Auto-detected" />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-1 block">Declared Value</label>
                    <Input value={declaredValue} onChange={(e) => setDeclaredValue(e.target.value)} placeholder="Auto-detected" />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-1 block">Shipment ID</label>
                    <Input value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} placeholder="Auto-detected or manual" />
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleValidate} disabled={validating || !allExtracted || anyExtracting} className="w-full font-mono" size="lg">
                {validating ? <Loader2 size={16} className="mr-2 animate-spin" /> : <ShieldAlert size={16} className="mr-2" />}
                {validating ? "VALIDATING..." : "VALIDATE PACKET"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* EXTRACTED FIELDS TAB */}
        <TabsContent value="fields" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono text-muted-foreground">
                ALL EXTRACTED FIELDS — {totalFields} fields from {visibleDocs.filter(d => d.status === "extracted").length} documents
              </CardTitle>
              <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-risk-low inline-block" /> ≥90%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-risk-medium inline-block" /> 70–89%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-risk-high inline-block" /> &lt;70%</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-mono">CONF</TableHead>
                    <TableHead className="text-[10px] font-mono">FIELD</TableHead>
                    <TableHead className="text-[10px] font-mono">VALUE</TableHead>
                    <TableHead className="text-[10px] font-mono">DOC TYPE</TableHead>
                    <TableHead className="text-[10px] font-mono">SOURCE</TableHead>
                    <TableHead className="text-[10px] font-mono">STATUS</TableHead>
                    <TableHead className="text-[10px] font-mono w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.filter((d) => d.status === "extracted" && !d.isMultiDocument).flatMap((doc) =>
                    doc.extractedFields.map((field) => (
                      <TableRow key={`${doc.id}-${field.fieldName}`}>
                        <TableCell className="py-2"><ConfidenceDot confidence={field.confidence} /></TableCell>
                        <TableCell className="py-2 text-xs font-mono">{field.fieldName.replace(/_/g, " ")}</TableCell>
                        <TableCell className="py-2 text-xs">
                          {editingField?.docId === doc.id && editingField?.fieldName === field.fieldName ? (
                            <div className="flex items-center gap-1">
                              <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-6 text-xs w-40" autoFocus onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={saveEdit}><CheckCircle size={10} className="text-risk-low" /></Button>
                            </div>
                          ) : (
                            <span className={field.confidence < 0.7 ? "text-risk-high" : ""}>{field.value}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {(field.sourceDocumentType || doc.detectedType || doc.type).replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-[10px] text-muted-foreground truncate max-w-[100px]">{doc.parentUploadId ? doc.name.split("→")[0]?.trim() : doc.file.name}</TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className={`text-[10px] font-mono ${
                            field.confidence >= 0.8 ? "border-risk-low/50 text-risk-low" :
                            field.confidence >= 0.6 ? "border-risk-medium/50 text-risk-medium" :
                            "border-risk-high/50 text-risk-high"
                          }`}>
                            {field.confidence >= 0.8 ? "AUTO" : field.confidence >= 0.6 ? "REVIEW" : "FLAG"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEdit(doc.id, field.fieldName, field.value)}>
                            <Pencil size={10} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CROSS-DOC MISMATCHES TAB */}
        <TabsContent value="mismatches" className="mt-4 space-y-3">
          {(() => {
            const trueConflicts = crossDocMismatches.filter(m => m.mismatchType === "true_conflict");
            const infoItems = crossDocMismatches.filter(m => m.mismatchType !== "true_conflict");
            const MISMATCH_TYPE_LABELS: Record<string, { label: string; color: string }> = {
              true_conflict: { label: "TRUE CONFLICT", color: "text-risk-high" },
              semantic_variant: { label: "SEMANTIC VARIANT", color: "text-muted-foreground" },
              unit_conversion: { label: "UNIT CONVERSION", color: "text-muted-foreground" },
              port_gateway: { label: "SAME GATEWAY", color: "text-muted-foreground" },
              expected_difference: { label: "EXPECTED DIFFERENCE", color: "text-muted-foreground" },
            };
            const renderMismatchCard = (mm: CrossDocMismatch, i: number) => {
              const isConflict = mm.mismatchType === "true_conflict";
              return (
                <div key={i} className={`p-3 rounded border ${isConflict ? 'border-risk-high/30 bg-risk-high/5' : 'border-border bg-card'}`}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant={mm.severity === "critical" ? "destructive" : "outline"} className="text-[10px] font-mono uppercase">{mm.severity}</Badge>
                    <Badge variant="secondary" className={`text-[10px] font-mono ${MISMATCH_TYPE_LABELS[mm.mismatchType]?.color || ''}`}>
                      {MISMATCH_TYPE_LABELS[mm.mismatchType]?.label || mm.mismatchType}
                    </Badge>
                    <span className="text-sm font-mono">{mm.fieldName.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{mm.description}</p>
                  <p className="text-xs text-foreground/70 mb-2 italic">{mm.reason}</p>
                  <div className="space-y-1">
                    {mm.documents.map((d, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs">
                        <ConfidenceDot confidence={d.confidence} />
                        <span className="font-mono text-muted-foreground w-32 truncate">{d.docName}</span>
                        <Badge variant="secondary" className="text-[10px]">{d.docType.replace(/_/g, " ")}</Badge>
                        <span className="font-medium">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            };
            return (
              <>
                {trueConflicts.length > 0 && (
                  <Card className="border-risk-high/20 bg-risk-high/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-risk-high">
                        TRUE CONFLICTS — {trueConflicts.length} material discrepancies
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {trueConflicts.map(renderMismatchCard)}
                    </CardContent>
                  </Card>
                )}
                {infoItems.length > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-muted-foreground">
                        INFORMATIONAL — {infoItems.length} normalized differences (no action required)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {infoItems.map(renderMismatchCard)}
                    </CardContent>
                  </Card>
                )}
                {crossDocMismatches.length === 0 && (
                  <Card className="border-border bg-card">
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">No cross-document mismatches detected.</CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* VALIDATION RESULTS TAB */}
        <TabsContent value="results" className="mt-4 space-y-4">
          {result && (() => {
            const rc = readinessConfig[result.overallReadiness];
            const StatusIcon = rc.icon;

            // Categorize missing docs
            const missingUploaded = result.missingDocuments.filter(
              (d) => !DOWNSTREAM_DOC_TYPES.has(d.documentType.toLowerCase()) && !EXTERNAL_FILING_TYPES.has(d.documentType.toLowerCase())
            );
            const externalFilings = result.missingDocuments.filter(
              (d) => EXTERNAL_FILING_TYPES.has(d.documentType.toLowerCase())
            );
            const downstreamDocs = result.missingDocuments.filter(
              (d) => DOWNSTREAM_DOC_TYPES.has(d.documentType.toLowerCase())
            );

            // Categorize issues
            const regulatoryIssues = result.issues.filter(i => i.severity === "critical" || i.severity === "high");
            const advisoryIssues = result.issues.filter(i => i.severity !== "critical" && i.severity !== "high");

            const trueConflicts = crossDocMismatches.filter(m => m.mismatchType === "true_conflict");
            const infoCount = crossDocMismatches.length - trueConflicts.length;

            return (
              <>
                {/* Scores Card */}
                <Card className={`border ${rc.bg}`}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <StatusIcon size={24} className={rc.color} />
                      <div>
                        <p className={`text-lg font-bold font-mono ${rc.color}`}>{rc.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {documents.filter(d => d.status === "extracted").length} document(s), {totalFields} fields analyzed
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground mb-1">COMPLETENESS</p>
                        <div className="flex items-center gap-2">
                          <Progress value={result.completenessScore} className="h-2 flex-1" />
                          <span className="font-mono text-sm font-bold">{result.completenessScore}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground mb-1">CONSISTENCY</p>
                        <div className="flex items-center gap-2">
                          <Progress value={result.consistencyScore} className="h-2 flex-1" />
                          <span className="font-mono text-sm font-bold">{result.consistencyScore}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ═══ SECTION 1: DOCUMENT MISMATCHES ═══ */}
                {crossDocMismatches.length > 0 && (() => {
                  const borderColor = trueConflicts.length > 0 ? "border-risk-high/20 bg-risk-high/5" : "border-risk-low/20 bg-risk-low/5";
                  const titleColor = trueConflicts.length > 0 ? "text-risk-high" : "text-risk-low";
                  const titleText = trueConflicts.length > 0
                    ? `DOCUMENT MISMATCHES — ${trueConflicts.length} conflict${trueConflicts.length !== 1 ? 's' : ''}`
                    : `DOCUMENT CONSISTENCY — No conflicts`;
                  return (
                    <Card className={borderColor}>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className={`text-xs font-mono ${titleColor}`}>{titleText}</CardTitle>
                        <Button variant="ghost" size="sm" className="text-[10px] font-mono" onClick={() => setActiveTab("mismatches")}>View All</Button>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {trueConflicts.length > 0 ? trueConflicts.slice(0, 3).map((mm, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <Badge variant={mm.severity === "critical" ? "destructive" : "outline"} className="text-[10px] font-mono">{mm.severity}</Badge>
                            <span className="font-mono">{mm.fieldName.replace(/_/g, " ")}</span>
                            <span className="text-muted-foreground">— {mm.reason.slice(0, 60)}</span>
                          </div>
                        )) : (
                          <p className="text-xs text-risk-low flex items-center gap-1.5">
                            <CheckCircle size={12} /> All documents internally consistent.
                            {infoCount > 0 && <span className="text-muted-foreground ml-1">({infoCount} normalized difference{infoCount !== 1 ? 's' : ''})</span>}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Clean packet confirmation when no conflicts */}
                {crossDocMismatches.length === 0 && (
                  <Card className="border-risk-low/20 bg-risk-low/5">
                    <CardContent className="py-4">
                      <p className="text-xs text-risk-low flex items-center gap-1.5 font-mono">
                        <CheckCircle size={14} /> DOCUMENT CONSISTENCY — No cross-document mismatches detected
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* ═══ SECTION 2: MISSING UPLOADED DOCUMENTS ═══ */}
                {missingUploaded.length > 0 && (
                  <Card className="border-risk-high/20 bg-risk-high/5">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-mono text-risk-high">MISSING UPLOADED DOCUMENTS — {missingUploaded.length}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {missingUploaded.map((doc, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded border border-risk-high/20">
                          <FileText size={14} className={doc.importance === "required" ? "text-risk-critical" : "text-risk-medium"} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono">{doc.documentType.replace(/_/g, " ").toUpperCase()}</span>
                              <Badge variant={doc.importance === "required" ? "destructive" : "outline"} className="text-[10px]">{doc.importance}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{doc.reason}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* ═══ SECTION 3: EXTERNAL FILING REQUIREMENTS ═══ */}
                {externalFilings.length > 0 && (
                  <Card className="border-risk-medium/20 bg-risk-medium/5">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-mono text-risk-medium">EXTERNAL FILING REQUIREMENTS — {externalFilings.length}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {externalFilings.map((doc, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded border border-risk-medium/20">
                          <ShieldAlert size={14} className="text-risk-medium shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono">{doc.documentType.replace(/_/g, " ").toUpperCase()}</span>
                              <Badge variant="outline" className="text-[10px] border-risk-medium/50 text-risk-medium">external filing</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{doc.reason}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* ═══ SECTION 4: REGULATORY ADVISORIES / ISSUES ═══ */}
                {regulatoryIssues.length > 0 && (
                  <Card className="border-risk-high/20 bg-risk-high/5">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-mono text-risk-high">REGULATORY ISSUES — {regulatoryIssues.length}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {regulatoryIssues.map((issue, i) => (
                        <div key={i} className="p-3 rounded border border-risk-high/20">
                          <div className="flex items-start gap-2">
                            {issue.severity === "critical" ? <XCircle size={14} className="text-risk-critical shrink-0" />
                              : <AlertTriangle size={14} className="text-risk-high shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-mono uppercase">{issue.severity}</Badge>
                                <span className="text-xs font-mono text-muted-foreground">{issue.field}</span>
                              </div>
                              <p className="text-sm mt-1">{issue.description}</p>
                              <p className="text-xs text-primary mt-1">💡 {issue.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {advisoryIssues.length > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-mono text-muted-foreground">ADVISORIES — {advisoryIssues.length}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {advisoryIssues.map((issue, i) => (
                        <div key={i} className="p-3 rounded border border-border bg-secondary/30">
                          <div className="flex items-start gap-2">
                            <Info size={14} className="text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-mono">{issue.severity}</Badge>
                                <span className="text-xs font-mono text-muted-foreground">{issue.field}</span>
                              </div>
                              <p className="text-sm mt-1">{issue.description}</p>
                              <p className="text-xs text-primary mt-1">💡 {issue.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Exception Queue */}
                {lowConfFields > 0 && (
                  <Card className="border-risk-medium/30 bg-risk-medium/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-risk-medium">EXCEPTION REVIEW — {lowConfFields} field(s) need attention</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead className="text-[10px] font-mono">CONF</TableHead>
                          <TableHead className="text-[10px] font-mono">FIELD</TableHead>
                          <TableHead className="text-[10px] font-mono">VALUE</TableHead>
                          <TableHead className="text-[10px] font-mono">SOURCE</TableHead>
                          <TableHead className="text-[10px] font-mono w-10"></TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {documents.filter((d) => d.status === "extracted").flatMap((doc) =>
                            doc.extractedFields.filter((f) => f.confidence < 0.8).map((field) => (
                              <TableRow key={`exc-${doc.id}-${field.fieldName}`}>
                                <TableCell className="py-2"><ConfidenceDot confidence={field.confidence} /></TableCell>
                                <TableCell className="py-2 text-xs font-mono">{field.fieldName.replace(/_/g, " ")}</TableCell>
                                <TableCell className="py-2 text-xs text-risk-high">{field.value}</TableCell>
                                <TableCell className="py-2 text-[10px] text-muted-foreground">{doc.file.name}</TableCell>
                                <TableCell className="py-2">
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                                    onClick={() => { startEdit(doc.id, field.fieldName, field.value); setActiveTab("fields"); }}>
                                    <Pencil size={10} />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* ═══ SECTION 5: RECOMMENDED OPTIONAL DOCUMENTS ═══ */}
                {downstreamDocs.length > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-mono text-muted-foreground">RECOMMENDED / LATER-STAGE DOCUMENTS</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {downstreamDocs.map((doc, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded border border-border/50 opacity-60">
                          <FileText size={14} className="text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono">{doc.documentType.replace(/_/g, " ").toUpperCase()}</span>
                              <Badge variant="outline" className="text-[10px]">later stage</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{doc.reason}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-mono text-primary">RECOMMENDATIONS</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <CheckCircle size={14} className="text-primary shrink-0 mt-0.5" /> <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Country Requirements */}
                {(result.countryRequirements?.length || 0) > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-mono text-muted-foreground">COUNTRY-SPECIFIC REQUIREMENTS</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {result.countryRequirements?.map((req, i) => (
                          <li key={i} className="text-sm flex items-center gap-2"><Info size={12} className="text-muted-foreground shrink-0" /> {req}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono">Shipment Templates</DialogTitle>
            <DialogDescription>Pre-load required documents, rules, and context for common workflows.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {SHIPMENT_TEMPLATES.map((t) => (
              <Card key={t.id} className="border-border bg-card hover:border-primary/50 cursor-pointer transition-colors" onClick={() => handleLoadTemplate(t)}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    {t.mode === "air" ? <Plane size={14} className="text-primary" /> : t.mode === "sea" ? <Ship size={14} className="text-primary" /> : <Truck size={14} className="text-primary" />}
                    <span className="text-sm font-bold font-mono">{t.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{t.description}</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{t.requiredDocs.length} required</Badge>
                    <Badge variant="outline" className="text-[10px]">{t.optionalDocs.length} optional</Badge>
                    {t.origin && <Badge variant="outline" className="text-[10px]">{t.origin}</Badge>}
                    {t.destination && <Badge variant="outline" className="text-[10px]">{t.destination}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent className="w-[450px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle className="font-mono">Validation History</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search by shipment, origin, destination..." className="pl-9 text-xs" />
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
              ) : filteredSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No validation sessions found</p>
              ) : (
                <div className="space-y-2 pr-2">
                  {filteredSessions.map((s) => (
                    <Card key={s.id} className="border-border bg-card hover:border-primary/50 cursor-pointer transition-colors" onClick={() => handleRecallSession(s)}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-bold">{s.shipment_id || "Draft"}</span>
                          <Badge variant="outline" className={`text-[10px] font-mono ${
                            s.disposition === "ready_to_ship" ? "text-risk-low" :
                            s.disposition === "high_risk" || s.disposition === "data_mismatch" ? "text-risk-high" :
                            "text-risk-medium"
                          }`}>
                            {(s.disposition || "pending").replace(/_/g, " ").toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {s.origin_country && <span>{s.origin_country}</span>}
                          {s.origin_country && s.destination_country && <span>→</span>}
                          {s.destination_country && <span>{s.destination_country}</span>}
                          <span>·</span>
                          <span>{s.shipment_mode}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {s.completeness_score != null && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              Completeness: {Math.round(Number(s.completeness_score))}%
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(s.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
