import { useEffect, useState, useRef } from "react";
import { useDocumentLibrary, type LibraryFilters, type LibraryDocument } from "@/hooks/useDocumentLibrary";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Search, FileText, Trash2, Filter, FolderOpen, RotateCw, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DocumentDetailSheet } from "./DocumentDetailSheet";
import { useLanguage } from "@/hooks/useLanguage";

const DOC_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "commercial_invoice", label: "Commercial Invoice" },
  { value: "packing_list", label: "Packing List" },
  { value: "bill_of_lading", label: "Bill of Lading" },
  { value: "air_waybill", label: "Air Waybill" },
  { value: "certificate_of_origin", label: "Certificate of Origin" },
  { value: "customs_declaration", label: "Customs Declaration" },
  { value: "export_license", label: "Export License" },
  { value: "import_permit", label: "Import Permit" },
  { value: "insurance_certificate", label: "Insurance Certificate" },
  { value: "phytosanitary_certificate", label: "Phytosanitary Certificate" },
  { value: "fumigation_certificate", label: "Fumigation Certificate" },
  { value: "dangerous_goods_declaration", label: "DG Declaration" },
];

const TYPE_COLORS: Record<string, string> = {
  commercial_invoice: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  packing_list: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  bill_of_lading: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  air_waybill: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  certificate_of_origin: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  customs_declaration: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

function ExtractionStatusBadge({ status, onRetry, t }: { status: string; onRetry?: () => void; t: (key: string) => string }) {
  switch (status) {
    case "processing":
      return (
        <Badge variant="outline" className="text-[9px] font-mono bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1">
          <Loader2 size={10} className="animate-spin" /> {t("library.extraction.processing")}
        </Badge>
      );
    case "complete":
      return (
        <Badge variant="outline" className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          {t("library.extraction.extracted")}
        </Badge>
      );
    case "failed":
      return (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[9px] font-mono bg-destructive/10 text-destructive border-destructive/30 gap-1">
            <AlertTriangle size={10} /> {t("library.extraction.failed")}
          </Badge>
          {onRetry && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-primary"
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              title={t("library.retryExtraction")}
            >
              <RotateCw size={10} />
            </Button>
          )}
        </div>
      );
    default:
      return (
        <Badge variant="outline" className="text-[9px] font-mono bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
          {t("library.extraction.pending")}
        </Badge>
      );
  }
}

export function DocumentLibraryTab() {
  const { documents, loading, uploading, fetchDocuments, uploadDocument, deleteDocument, extractDocument } = useDocumentLibrary();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<Partial<LibraryFilters>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<LibraryDocument | null>(null);

  useEffect(() => { fetchDocuments(filters); }, [fetchDocuments]);

  // Keep selectedDoc in sync with documents list
  useEffect(() => {
    if (selectedDoc) {
      const updated = documents.find(d => d.id === selectedDoc.id);
      if (updated && updated.extraction_status !== selectedDoc.extraction_status) {
        setSelectedDoc(updated);
      }
    }
  }, [documents, selectedDoc]);

  const handleFilterChange = (key: keyof LibraryFilters, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    fetchDocuments(next);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadDocument(file, {});
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    for (const file of Array.from(files)) {
      await uploadDocument(file, {});
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDocType = (type: string | null) => {
    if (!type) return "Unclassified";
    return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <Card
        className="border-dashed border-2 border-primary/30 bg-primary/5 cursor-pointer hover:border-primary/50 transition-colors"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="py-8 flex flex-col items-center gap-2">
          <Upload size={24} className="text-primary/60" />
          <p className="text-sm font-mono text-muted-foreground">
            {uploading ? t("library.uploading") : t("library.dropHere")}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground/60">
            {t("library.fileTypes")}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("library.searchDocs")}
            value={filters.search || ""}
            onChange={e => handleFilterChange("search", e.target.value)}
            className="pl-9 h-8 text-xs font-mono"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="text-[10px] font-mono gap-1">
          <Filter size={12} /> {t("library.filters")}
        </Button>
      </div>

      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filters.documentType || ""} onValueChange={v => handleFilterChange("documentType", v)}>
            <SelectTrigger className="w-[180px] h-8 text-xs font-mono">
              <SelectValue placeholder={t("library.docType")} />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs font-mono">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={t("library.shipmentId")}
            value={filters.shipmentId || ""}
            onChange={e => handleFilterChange("shipmentId", e.target.value)}
            className="w-[160px] h-8 text-xs font-mono"
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground font-mono text-sm animate-pulse">{t("library.loadingLibrary")}</div>
      ) : documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-2">
            <FolderOpen size={32} className="text-muted-foreground/40" />
            <p className="text-sm font-mono text-muted-foreground">{t("library.noDocuments")}</p>
            <p className="text-[10px] font-mono text-muted-foreground/60">{t("library.noDocumentsHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map(doc => (
            <Card key={doc.id} className="group hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setSelectedDoc(doc)}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-primary/60 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-medium truncate" title={doc.file_name}>{doc.file_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {formatSize(doc.file_size_bytes)} · {format(new Date(doc.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteDocument(doc); }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn("text-[9px] font-mono", TYPE_COLORS[doc.document_type || ""] || "bg-muted/20 text-muted-foreground")}
                  >
                    {formatDocType(doc.document_type)}
                  </Badge>
                  <ExtractionStatusBadge
                    status={doc.extraction_status}
                    onRetry={() => extractDocument(doc)}
                    t={t}
                  />
                </div>

                {doc.shipment_id && (
                  <p className="text-[9px] font-mono text-muted-foreground">Shipment: {doc.shipment_id}</p>
                )}
                {doc.origin_country && doc.destination_country && (
                  <p className="text-[9px] font-mono text-muted-foreground">{doc.origin_country} → {doc.destination_country}</p>
                )}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {doc.tags.map(tag => (
                      <span key={tag} className="text-[8px] font-mono bg-muted/30 rounded px-1.5 py-0.5 text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DocumentDetailSheet
        document={selectedDoc}
        open={!!selectedDoc}
        onOpenChange={(open) => { if (!open) setSelectedDoc(null); }}
        onRetryExtraction={selectedDoc ? () => extractDocument(selectedDoc) : undefined}
      />
    </div>
  );
}
