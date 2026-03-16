import { useState, useCallback, useRef } from "react";
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
import {
  FileText, Upload, Loader2, CheckCircle, AlertTriangle, XCircle,
  ShieldAlert, Info, Camera, Image, Download, Eye, Pencil, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { ExportButton } from "@/components/ExportButton";
import {
  type UploadedDocument, type ExtractedField,
  VALIDATION_DETAIL_COLUMNS, VALIDATION_SUMMARY_COLUMNS,
  buildDetailExportRows, buildSummaryExportRow,
} from "@/lib/validationExport";

const DOC_TYPES = [
  "commercial_invoice", "packing_list", "bill_of_lading", "air_waybill",
  "certificate_of_origin", "customs_declaration", "export_license",
  "import_permit", "insurance_certificate", "inspection_certificate",
  "phytosanitary_certificate", "fumigation_certificate",
  "dangerous_goods_declaration", "product_photo", "other",
];

interface ValidationResult {
  completenessScore: number;
  consistencyScore: number;
  overallReadiness: "ready" | "needs_attention" | "not_ready" | "critical";
  missingDocuments: { documentType: string; importance: string; reason: string }[];
  issues: { severity: string; field: string; description: string; suggestion: string }[];
  countryRequirements?: string[];
  recommendations: string[];
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill shipment context from extracted fields
  const autoFillContext = useCallback((fields: ExtractedField[]) => {
    for (const f of fields) {
      const name = f.fieldName.toLowerCase();
      if (name.includes("origin_country") && !originCountry && f.confidence >= 0.6) {
        setOriginCountry(f.value);
      }
      if (name.includes("destination_country") && !destinationCountry && f.confidence >= 0.6) {
        setDestinationCountry(f.value);
      }
      if (name.includes("hs_code") && !hsCode && f.confidence >= 0.6) {
        setHsCode(f.value);
      }
      if (name.includes("declared_value") && !declaredValue && f.confidence >= 0.6) {
        setDeclaredValue(f.value);
      }
      if (name.includes("transport_mode") && f.confidence >= 0.6) {
        const val = f.value.toLowerCase();
        if (val.includes("air")) setShipmentMode("air");
        else if (val.includes("sea") || val.includes("ocean")) setShipmentMode("sea");
        else if (val.includes("land") || val.includes("truck") || val.includes("road")) setShipmentMode("land");
      }
    }
  }, [originCountry, destinationCountry, hsCode, declaredValue]);

  const extractDocument = async (doc: UploadedDocument) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, status: "extracting" } : d))
    );

    try {
      const formData = new FormData();
      formData.append("file", doc.file);
      formData.append("documentType", doc.type);
      formData.append("shipmentContext", JSON.stringify({
        shipmentMode, originCountry, destinationCountry,
      }));

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Extraction failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const fields: ExtractedField[] = (data.fields || []).map((f: any) => ({
        fieldName: f.fieldName,
        value: f.value,
        confidence: f.confidence,
        sourceLocation: f.sourceLocation,
      }));

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: "extracted",
                extractedFields: fields,
                detectedType: data.detectedDocumentType,
                overallQuality: data.overallQuality,
                parseWarnings: data.parseWarnings,
                rawTextSummary: data.rawTextSummary,
                extractionId: data.extractionId,
              }
            : d
        )
      );

      autoFillContext(fields);
      toast.success(`Extracted ${fields.length} fields from ${doc.file.name}`);
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
      if (!isValid) {
        toast.error(`${file.name}: unsupported format. Use PDF or image.`);
        continue;
      }
      newDocs.push({
        id: crypto.randomUUID(),
        file,
        type: "commercial_invoice",
        name: file.name,
        status: "uploading",
        extractedFields: [],
      });
    }
    setDocuments((prev) => [...prev, ...newDocs]);

    // Auto-extract each
    for (const doc of newDocs) {
      await extractDocument(doc);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleValidate = async () => {
    const extracted = documents.filter((d) => d.status === "extracted");
    if (extracted.length === 0) {
      toast.error("Upload and extract at least one document first");
      return;
    }
    setValidating(true);
    setResult(null);
    try {
      const docsPayload = extracted.map((d) => ({
        type: d.detectedType || d.type,
        name: d.name,
        extractedFields: Object.fromEntries(d.extractedFields.map((f) => [f.fieldName, f.value])),
      }));

      const { data, error } = await supabase.functions.invoke("validate-documents", {
        body: {
          documents: docsPayload,
          shipmentMode,
          originCountry,
          destinationCountry,
          hsCode,
          declaredValue,
          shipmentId: shipmentId || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      setActiveTab("results");
      toast.success("Validation complete");
    } catch (e: any) {
      toast.error(e.message || "Validation failed");
    } finally {
      setValidating(false);
    }
  };

  const startEdit = (docId: string, fieldName: string, currentValue: string) => {
    setEditingField({ docId, fieldName });
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (!editingField) return;
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === editingField.docId
          ? {
              ...d,
              extractedFields: d.extractedFields.map((f) =>
                f.fieldName === editingField.fieldName
                  ? { ...f, value: editValue, confidence: 1.0 }
                  : f
              ),
            }
          : d
      )
    );
    setEditingField(null);
    setEditValue("");
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const allExtracted = documents.length > 0 && documents.every((d) => d.status === "extracted");
  const anyExtracting = documents.some((d) => d.status === "extracting");
  const totalFields = documents.reduce((sum, d) => sum + d.extractedFields.length, 0);
  const highConfFields = documents.reduce(
    (sum, d) => sum + d.extractedFields.filter((f) => f.confidence >= 0.8).length,
    0
  );
  const lowConfFields = totalFields - highConfFields;

  const exportContext = { shipmentId, origin: originCountry, destination: destinationCountry, mode: shipmentMode };
  const detailRows = result ? buildDetailExportRows(documents, result, exportContext) : [];
  const summaryRows = result ? [buildSummaryExportRow(documents, result, exportContext)] : [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono">DOCUMENT PACKET VALIDATOR</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload documents → AI extracts fields → Auto-validate → Export
          </p>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <>
              <ExportButton
                data={detailRows}
                columns={VALIDATION_DETAIL_COLUMNS}
                filename={`validation-detail-${shipmentId || "draft"}`}
                label="Export Details"
              />
              <ExportButton
                data={summaryRows}
                columns={VALIDATION_SUMMARY_COLUMNS}
                filename={`validation-summary-${shipmentId || "draft"}`}
                label="Export Summary"
              />
            </>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {documents.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <Card className="border-border bg-card">
            <CardContent className="py-3 px-4">
              <p className="text-[10px] font-mono text-muted-foreground">DOCUMENTS</p>
              <p className="text-2xl font-bold font-mono">{documents.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="py-3 px-4">
              <p className="text-[10px] font-mono text-muted-foreground">FIELDS EXTRACTED</p>
              <p className="text-2xl font-bold font-mono">{totalFields}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="py-3 px-4">
              <p className="text-[10px] font-mono text-muted-foreground">HIGH CONFIDENCE</p>
              <p className="text-2xl font-bold font-mono text-risk-low">{highConfFields}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="py-3 px-4">
              <p className="text-[10px] font-mono text-muted-foreground">NEEDS REVIEW</p>
              <p className="text-2xl font-bold font-mono text-risk-medium">{lowConfFields}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="font-mono">
          <TabsTrigger value="upload" className="text-xs">
            <Upload size={12} className="mr-1.5" /> UPLOAD & EXTRACT
          </TabsTrigger>
          <TabsTrigger value="fields" className="text-xs" disabled={totalFields === 0}>
            <Eye size={12} className="mr-1.5" /> EXTRACTED FIELDS ({totalFields})
          </TabsTrigger>
          <TabsTrigger value="results" className="text-xs" disabled={!result}>
            <CheckCircle size={12} className="mr-1.5" /> VALIDATION RESULTS
          </TabsTrigger>
        </TabsList>

        {/* UPLOAD TAB */}
        <TabsContent value="upload" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Zone */}
            <div className="lg:col-span-2 space-y-4">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="relative border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <Upload size={36} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">Drop documents here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG — invoices, packing lists, BOL, COO, customs declarations
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono text-[10px]"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    <FileText size={12} className="mr-1.5" /> Browse Files
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono text-[10px]"
                    onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  >
                    <Camera size={12} className="mr-1.5" /> Take Photo
                  </Button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>
              </div>

              {/* Uploaded documents list */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="border-border bg-card">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {doc.status === "extracting" ? (
                            <Loader2 size={16} className="text-primary animate-spin shrink-0" />
                          ) : doc.status === "extracted" ? (
                            <CheckCircle size={16} className="text-risk-low shrink-0" />
                          ) : doc.status === "error" ? (
                            <XCircle size={16} className="text-risk-critical shrink-0" />
                          ) : (
                            <Upload size={16} className="text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono truncate">{doc.file.name}</span>
                              {doc.detectedType && (
                                <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                                  {doc.detectedType.replace(/_/g, " ").toUpperCase()}
                                </Badge>
                              )}
                              {doc.overallQuality && (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-mono shrink-0 ${
                                    doc.overallQuality === "high"
                                      ? "border-risk-low/50 text-risk-low"
                                      : doc.overallQuality === "medium"
                                      ? "border-risk-medium/50 text-risk-medium"
                                      : "border-risk-high/50 text-risk-high"
                                  }`}
                                >
                                  {doc.overallQuality} quality
                                </Badge>
                              )}
                            </div>
                            {doc.status === "extracting" && (
                              <p className="text-xs text-muted-foreground mt-1">Extracting fields with AI...</p>
                            )}
                            {doc.status === "extracted" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {doc.extractedFields.length} fields extracted
                              </p>
                            )}
                            {doc.status === "error" && (
                              <p className="text-xs text-risk-critical mt-1">{doc.error}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {doc.status === "error" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => extractDocument(doc)}
                              >
                                <RefreshCw size={12} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-risk-critical"
                              onClick={() => removeDocument(doc.id)}
                            >
                              <XCircle size={12} />
                            </Button>
                          </div>
                        </div>
                        {doc.parseWarnings && doc.parseWarnings.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {doc.parseWarnings.map((w, i) => (
                              <p key={i} className="text-[10px] text-risk-medium flex items-center gap-1">
                                <AlertTriangle size={10} className="shrink-0" /> {w}
                              </p>
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
                    <Input value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} placeholder="Optional" />
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleValidate}
                disabled={validating || !allExtracted || anyExtracting}
                className="w-full font-mono"
                size="lg"
              >
                {validating ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <ShieldAlert size={16} className="mr-2" />
                )}
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
                ALL EXTRACTED FIELDS — {totalFields} fields from {documents.filter(d => d.status === "extracted").length} documents
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
                    <TableHead className="text-[10px] font-mono">SOURCE</TableHead>
                    <TableHead className="text-[10px] font-mono">LOCATION</TableHead>
                    <TableHead className="text-[10px] font-mono w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents
                    .filter((d) => d.status === "extracted")
                    .flatMap((doc) =>
                      doc.extractedFields.map((field) => (
                        <TableRow key={`${doc.id}-${field.fieldName}`}>
                          <TableCell className="py-2">
                            <ConfidenceDot confidence={field.confidence} />
                          </TableCell>
                          <TableCell className="py-2 text-xs font-mono">
                            {field.fieldName.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="py-2 text-xs">
                            {editingField?.docId === doc.id && editingField?.fieldName === field.fieldName ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-6 text-xs w-40"
                                  autoFocus
                                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                                />
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={saveEdit}>
                                  <CheckCircle size={10} className="text-risk-low" />
                                </Button>
                              </div>
                            ) : (
                              <span className={field.confidence < 0.7 ? "text-risk-high" : ""}>
                                {field.value}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {doc.file.name}
                          </TableCell>
                          <TableCell className="py-2 text-[10px] text-muted-foreground">
                            {field.sourceLocation || "—"}
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => startEdit(doc.id, field.fieldName, field.value)}
                            >
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

        {/* VALIDATION RESULTS TAB */}
        <TabsContent value="results" className="mt-4 space-y-4">
          {result && (() => {
            const rc = readinessConfig[result.overallReadiness];
            const StatusIcon = rc.icon;
            return (
              <>
                {/* Readiness Banner */}
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

                {/* Exception Queue - low confidence fields */}
                {lowConfFields > 0 && (
                  <Card className="border-risk-medium/30 bg-risk-medium/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-risk-medium">
                        EXCEPTION REVIEW — {lowConfFields} field(s) need attention
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px] font-mono">CONF</TableHead>
                            <TableHead className="text-[10px] font-mono">FIELD</TableHead>
                            <TableHead className="text-[10px] font-mono">VALUE</TableHead>
                            <TableHead className="text-[10px] font-mono">SOURCE</TableHead>
                            <TableHead className="text-[10px] font-mono w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documents
                            .filter((d) => d.status === "extracted")
                            .flatMap((doc) =>
                              doc.extractedFields
                                .filter((f) => f.confidence < 0.8)
                                .map((field) => (
                                  <TableRow key={`exc-${doc.id}-${field.fieldName}`}>
                                    <TableCell className="py-2"><ConfidenceDot confidence={field.confidence} /></TableCell>
                                    <TableCell className="py-2 text-xs font-mono">{field.fieldName.replace(/_/g, " ")}</TableCell>
                                    <TableCell className="py-2 text-xs text-risk-high">{field.value}</TableCell>
                                    <TableCell className="py-2 text-[10px] text-muted-foreground">{doc.file.name}</TableCell>
                                    <TableCell className="py-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => { startEdit(doc.id, field.fieldName, field.value); setActiveTab("fields"); }}
                                      >
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

                {/* Issues */}
                {result.issues.length > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-muted-foreground">
                        ISSUES ({result.issues.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.issues.map((issue, i) => (
                        <div key={i} className="p-3 rounded border border-border bg-secondary/30">
                          <div className="flex items-start gap-2">
                            {issue.severity === "critical" ? (
                              <XCircle size={14} className="text-risk-critical shrink-0" />
                            ) : issue.severity === "high" ? (
                              <AlertTriangle size={14} className="text-risk-high shrink-0" />
                            ) : (
                              <AlertTriangle size={14} className="text-risk-medium shrink-0" />
                            )}
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

                {/* Missing Documents */}
                {result.missingDocuments.length > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-muted-foreground">MISSING DOCUMENTS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.missingDocuments.map((doc, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded border border-border">
                          <FileText size={14} className={doc.importance === "required" ? "text-risk-critical" : "text-risk-medium"} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono">{doc.documentType.replace(/_/g, " ").toUpperCase()}</span>
                              <Badge variant={doc.importance === "required" ? "destructive" : "outline"} className="text-[10px]">
                                {doc.importance}
                              </Badge>
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
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-primary">RECOMMENDATIONS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <CheckCircle size={14} className="text-primary shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Country Requirements */}
                {(result.countryRequirements?.length || 0) > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-muted-foreground">COUNTRY-SPECIFIC REQUIREMENTS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {result.countryRequirements?.map((req, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <Info size={12} className="text-muted-foreground shrink-0" />
                            {req}
                          </li>
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
    </div>
  );
}
