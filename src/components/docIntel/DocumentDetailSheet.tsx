import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ExternalLink, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { LibraryDocument } from "@/hooks/useDocumentLibrary";

const TYPE_COLORS: Record<string, string> = {
  commercial_invoice: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  packing_list: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  bill_of_lading: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  air_waybill: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  certificate_of_origin: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  customs_declaration: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const CONFIDENCE_COLOR = (c: number) =>
  c >= 0.9 ? "text-emerald-400" : c >= 0.7 ? "text-amber-400" : "text-rose-400";

interface Props {
  document: LibraryDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDocType = (type: string | null) => {
  if (!type) return "Unclassified";
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentDetailSheet({ document: doc, open, onOpenChange }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!doc || !open) {
      setPreviewUrl(null);
      return;
    }
    supabase.storage
      .from("document-library")
      .createSignedUrl(doc.file_path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setPreviewUrl(data.signedUrl);
      });
  }, [doc, open]);

  if (!doc) return null;

  const extractedFields = doc.extracted_fields && typeof doc.extracted_fields === "object"
    ? Object.entries(doc.extracted_fields as Record<string, any>)
    : [];

  const statusIcon = doc.extraction_status === "complete"
    ? <ShieldCheck size={14} className="text-emerald-400" />
    : <Clock size={14} className="text-yellow-400 animate-pulse" />;

  const isImage = doc.mime_type?.startsWith("image/");
  const isPdf = doc.mime_type === "application/pdf";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary shrink-0" />
            <SheetTitle className="text-sm font-mono truncate">{doc.file_name}</SheetTitle>
          </div>
          <SheetDescription className="text-[10px] font-mono text-muted-foreground">
            {formatSize(doc.file_size_bytes)} · Uploaded {format(new Date(doc.created_at), "MMM d, yyyy 'at' h:mm a")}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-4 pt-3">
            {/* Classification */}
            <section className="space-y-2">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Classification</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-mono",
                    TYPE_COLORS[doc.document_type || ""] || "bg-muted/20 text-muted-foreground"
                  )}
                >
                  {formatDocType(doc.document_type)}
                </Badge>
                {doc.classification_confidence != null && (
                  <span className={cn("text-[10px] font-mono", CONFIDENCE_COLOR(doc.classification_confidence))}>
                    {Math.round(doc.classification_confidence * 100)}% confidence
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                {statusIcon}
                <span>Extraction: {doc.extraction_status || "pending"}</span>
              </div>
            </section>

            <Separator />

            {/* Metadata */}
            <section className="space-y-2">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Metadata</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
                {doc.shipment_id && (
                  <>
                    <span className="text-muted-foreground">Shipment</span>
                    <span className="truncate">{doc.shipment_id}</span>
                  </>
                )}
                {doc.origin_country && (
                  <>
                    <span className="text-muted-foreground">Origin</span>
                    <span>{doc.origin_country}</span>
                  </>
                )}
                {doc.destination_country && (
                  <>
                    <span className="text-muted-foreground">Destination</span>
                    <span>{doc.destination_country}</span>
                  </>
                )}
                {doc.transport_mode && (
                  <>
                    <span className="text-muted-foreground">Mode</span>
                    <span className="capitalize">{doc.transport_mode}</span>
                  </>
                )}
                {doc.packet_id && (
                  <>
                    <span className="text-muted-foreground">Packet</span>
                    <span className="truncate">{doc.packet_id}</span>
                  </>
                )}
              </div>
              {doc.tags && doc.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap pt-1">
                  {doc.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-mono bg-muted/30 rounded px-1.5 py-0.5 text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* Extracted Fields */}
            <section className="space-y-2">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Extracted Fields ({extractedFields.length})
              </h3>
              {extractedFields.length === 0 ? (
                <p className="text-[10px] font-mono text-muted-foreground/60 py-3 text-center">
                  {doc.extraction_status === "pending"
                    ? "Extraction pending — fields will appear after processing"
                    : "No extracted fields available"}
                </p>
              ) : (
                <div className="space-y-1">
                  {extractedFields.map(([key, entry]) => {
                    const isObj = entry && typeof entry === "object" && !Array.isArray(entry);
                    const value = isObj ? (entry as any).value ?? JSON.stringify(entry) : String(entry);
                    const confidence = isObj ? (entry as any).confidence : null;
                    const source = isObj ? (entry as any).source : null;
                    const page = isObj ? (entry as any).page : null;

                    return (
                      <div
                        key={key}
                        className="flex items-start justify-between gap-2 rounded px-2 py-1.5 bg-muted/10 hover:bg-muted/20 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {key.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs font-mono truncate" title={String(value)}>
                            {String(value)}
                          </p>
                          {(source || page != null) && (
                            <p className="text-[9px] font-mono text-muted-foreground/60 mt-0.5">
                              {source && <>Source: {source}</>}
                              {page != null && <> · Page {page}</>}
                            </p>
                          )}
                        </div>
                        {confidence != null && (
                          <span className={cn("text-[10px] font-mono shrink-0 mt-0.5", CONFIDENCE_COLOR(confidence))}>
                            {Math.round(confidence * 100)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <Separator />

            {/* Document Preview */}
            <section className="space-y-2">
              <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Preview</h3>
              {previewUrl ? (
                <div className="space-y-2">
                  {isImage && (
                    <img
                      src={previewUrl}
                      alt={doc.file_name}
                      className="w-full rounded border border-border object-contain max-h-[400px] bg-black/20"
                    />
                  )}
                  {isPdf && (
                    <iframe
                      src={previewUrl}
                      title={doc.file_name}
                      className="w-full h-[400px] rounded border border-border bg-black/20"
                    />
                  )}
                  {!isImage && !isPdf && (
                    <p className="text-[10px] font-mono text-muted-foreground/60 text-center py-6">
                      Preview not available for this file type
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] font-mono gap-1.5"
                    onClick={() => window.open(previewUrl, "_blank")}
                  >
                    <ExternalLink size={12} /> Open Full Document
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground/40 text-[10px] font-mono animate-pulse">
                  Loading preview…
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
