import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertTriangle, XCircle, MinusCircle, ChevronDown,
  Upload, FileText, Mail, RefreshCw, Loader2, Info, Trash2
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export type DocCardState = 'verified' | 'issue' | 'critical' | 'missing' | 'not_applicable' | 'processing';

export interface ExtractedField {
  label: string;
  value: string;
  status: 'verified' | 'flagged' | 'error';
}

export interface CrossRefCheck {
  againstDoc: string;
  label: string;
  passed: boolean;
}

export interface DiscrepancyItem {
  severity: 'critical' | 'high' | 'medium' | 'low';
  label: string;
  detail: string;
  impact?: string;
}

export interface DocumentCardData {
  id: string;
  name: string;
  phase: string;
  state: DocCardState;
  statusLine: string;
  extractedFields?: ExtractedField[];
  crossRefChecks?: CrossRefCheck[];
  discrepancies?: DiscrepancyItem[];
  notes?: string[];
  actionHint?: string;
  fileName?: string;
}

interface Props {
  doc: DocumentCardData;
  onUpload?: (docId: string, files: FileList) => void;
  onRequestFromSupplier?: (docId: string) => void;
  onUploadCorrected?: (docId: string) => void;
  onMarkNA?: (docId: string) => void;
  onClickAlert?: (docId: string, message: string) => void;
  onClickCard?: (docId: string) => void;
  onDelete?: (docId: string) => void;
  onReplace?: (docId: string, files: FileList) => void;
}

const STATE_CONFIG: Record<DocCardState, { border: string; dot: typeof CheckCircle2; dotClass: string; bg: string }> = {
  verified: { border: 'border-l-green-500', dot: CheckCircle2, dotClass: 'text-green-500', bg: '' },
  issue: { border: 'border-l-amber-500', dot: AlertTriangle, dotClass: 'text-amber-500', bg: 'bg-amber-500/3' },
  missing: { border: 'border-l-red-500', dot: XCircle, dotClass: 'text-red-500', bg: 'bg-red-500/3' },
  processing: { border: 'border-l-blue-500', dot: Loader2, dotClass: 'text-blue-500 animate-spin', bg: 'bg-blue-500/3' },
  not_applicable: { border: 'border-l-muted', dot: MinusCircle, dotClass: 'text-muted-foreground/50', bg: 'opacity-50' },
};

/** Try to parse a value as a line items array and render a table */
function LineItemsTable({ value }: { value: string }) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed) || parsed.length === 0) return <span>{value}</span>;

    return (
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] h-7 px-2">#</TableHead>
              <TableHead className="text-[10px] h-7 px-2">Description</TableHead>
              <TableHead className="text-[10px] h-7 px-2">Ctns</TableHead>
              <TableHead className="text-[10px] h-7 px-2">Qty</TableHead>
              <TableHead className="text-[10px] h-7 px-2">Net Wt</TableHead>
              <TableHead className="text-[10px] h-7 px-2">Gross Wt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsed.map((item: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="text-[10px] py-1 px-2">{i + 1}</TableCell>
                <TableCell className="text-[10px] py-1 px-2 max-w-[160px] truncate">
                  {item.description || item.item_description || item.name || '—'}
                </TableCell>
                <TableCell className="text-[10px] py-1 px-2">{item.cartons ?? item.ctns ?? '—'}</TableCell>
                <TableCell className="text-[10px] py-1 px-2">{item.quantity ?? item.qty ?? '—'}</TableCell>
                <TableCell className="text-[10px] py-1 px-2">{item.net_weight ?? item.net_weight_kg ?? '—'}</TableCell>
                <TableCell className="text-[10px] py-1 px-2">{item.gross_weight ?? item.gross_weight_kg ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  } catch {
    return <span>{value}</span>;
  }
}

/** Check if a value looks like a JSON array string */
function isLineItemsField(label: string, value: string): boolean {
  const lcLabel = label.toLowerCase();
  if (lcLabel.includes('line item') || lcLabel.includes('line_item')) return true;
  if (typeof value === 'string' && value.startsWith('[') && value.includes('{')) return true;
  return false;
}

export function DocumentCard({ doc, onUpload, onRequestFromSupplier, onUploadCorrected, onMarkNA, onClickAlert, onClickCard, onDelete, onReplace }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const cfg = STATE_CONFIG[doc.state];
  const Icon = cfg.dot;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0 && onUpload) {
      onUpload(doc.id, e.dataTransfer.files);
    }
  }, [doc.id, onUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUpload) {
      onUpload(doc.id, e.target.files);
    }
    e.target.value = '';
  }, [doc.id, onUpload]);

  const handleReplaceInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onReplace) {
      onReplace(doc.id, e.target.files);
    }
    e.target.value = '';
  }, [doc.id, onReplace]);

  const isUploaded = doc.state === 'verified' || doc.state === 'issue' || doc.state === 'processing';

  if (doc.state === 'not_applicable' && !expanded) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-l-4 transition-colors",
          "border-border", cfg.border, cfg.bg,
          "hover:bg-accent/20 active:scale-[0.995]"
        )}
      >
        <Icon size={14} className={cfg.dotClass} />
        <span className="flex-1 text-left text-xs font-medium text-muted-foreground/60">{doc.name}</span>
        <span className="text-[10px] text-muted-foreground/40">N/A</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 transition-all overflow-hidden relative",
        "border-border", cfg.border, cfg.bg,
        expanded && "col-span-2"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover action buttons for uploaded docs */}
      {isUploaded && hovered && !expanded && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
          <label title="Replace document">
            <input type="file" className="hidden" onChange={handleReplaceInput} accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.docx,.xlsx" />
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <Upload size={12} />
            </span>
          </label>
          <button
            title="Remove document"
            onClick={(e) => { e.stopPropagation(); setDeleteConfirmOpen(true); }}
            className="inline-flex items-center justify-center w-6 h-6 rounded bg-secondary/80 hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 text-left",
          "hover:bg-accent/20 active:scale-[0.998] transition-colors"
        )}
      >
        <Icon size={14} className={cn(cfg.dotClass, "shrink-0")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold block truncate">{doc.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onClickCard?.(doc.id); }}
              className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors p-0.5 shrink-0"
              aria-label={`Learn about ${doc.name}`}
              title={`What is ${doc.name}? Click to learn more.`}
            >
              <Info size={12} />
            </button>
            {doc.fileName && (
              <span className="text-[9px] text-muted-foreground/60 truncate max-w-[120px]">
                {doc.fileName}
              </span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClickCard?.(doc.id); }}
            className="text-[10px] text-muted-foreground hover:text-foreground hover:underline transition-colors text-left"
          >
            {doc.statusLine}
          </button>
        </div>
        {doc.state === 'processing' ? (
          <Badge className="text-[9px] bg-blue-500/10 text-blue-500 border-blue-500/20 shrink-0 animate-pulse">
            Extracting...
          </Badge>
        ) : (
          <ChevronDown size={14} className={cn(
            "text-muted-foreground transition-transform shrink-0",
            expanded && "rotate-180"
          )} />
        )}
      </button>

      {/* Expanded content */}
      {expanded && doc.state !== 'processing' && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
          {doc.state === 'missing' ? (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border"
              )}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto mb-2 text-muted-foreground" size={20} />
              <p className="text-xs text-muted-foreground">
                Drop <strong>{doc.name}</strong> here or{" "}
                <label className="text-primary cursor-pointer hover:underline">
                  click to upload
                  <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.docx,.xlsx" />
                </label>
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                AI will extract and cross-reference all data fields
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Left: AI extracted data */}
              {doc.extractedFields && doc.extractedFields.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText size={10} /> AI Extracted Data
                  </h4>
                  <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                    {doc.extractedFields.map((field, i) => {
                      // Render line items as a table
                      if (isLineItemsField(field.label, field.value)) {
                        return (
                          <div key={i} className="col-span-2 py-1">
                            <span className="text-muted-foreground font-medium text-[11px] block mb-1">{field.label}</span>
                            <LineItemsTable value={field.value} />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-start justify-between py-1 px-2 rounded text-[11px] gap-2",
                            i % 2 === 0 ? "bg-secondary/20" : ""
                          )}
                        >
                          <span className="text-muted-foreground font-medium shrink-0">{field.label}</span>
                          <span className={cn(
                            "font-semibold text-right break-words min-w-0",
                            field.status === 'verified' && "text-green-600",
                            field.status === 'flagged' && "text-amber-500",
                            field.status === 'error' && "text-red-500",
                          )}>
                            {field.value}
                            {field.status === 'flagged' && (
                              <span className="text-[9px] block text-amber-400 font-normal">Please verify</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Right: Cross-reference checks */}
              {doc.crossRefChecks && doc.crossRefChecks.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cross-Reference Checks
                  </h4>
                  <div className="space-y-1">
                    {doc.crossRefChecks.map((check, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        {check.passed ? (
                          <CheckCircle2 size={12} className="text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="text-muted-foreground">vs. {check.againstDoc}: </span>
                          <span className={check.passed ? "text-green-600" : "text-red-500"}>
                            {check.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No cross-ref checks and verified: show confirmation */}
              {(!doc.crossRefChecks || doc.crossRefChecks.length === 0) && doc.state === 'verified' && (
                <div className="flex items-center gap-2 text-[11px] text-green-600 py-4">
                  <CheckCircle2 size={14} className="shrink-0" />
                  No discrepancies found
                </div>
              )}
            </div>
          )}

          {/* Discrepancy boxes */}
          {doc.discrepancies && doc.discrepancies.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Issues Detected ({doc.discrepancies.length})
              </h4>
              {doc.discrepancies.map((d, i) => (
                <button
                  key={i}
                  onClick={() => onClickAlert?.(doc.id, d.detail)}
                  className={cn(
                    "w-full text-left rounded-md border p-2.5 transition-colors active:scale-[0.99]",
                    d.severity === 'critical' ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/15" :
                    d.severity === 'high' ? "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15" :
                    "bg-yellow-500/5 border-yellow-500/15 hover:bg-yellow-500/10"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Badge className={cn(
                      "text-[8px] px-1.5 py-0 shrink-0 mt-0.5 uppercase font-bold",
                      d.severity === 'critical' ? "bg-red-500/20 text-red-600 border-red-500/30" :
                      d.severity === 'high' ? "bg-amber-500/20 text-amber-600 border-amber-500/30" :
                      "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
                    )}>
                      {d.severity}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <span className={cn(
                        "text-[11px] font-semibold block",
                        d.severity === 'critical' ? "text-red-600 dark:text-red-400" :
                        d.severity === 'high' ? "text-amber-600 dark:text-amber-400" :
                        "text-yellow-700 dark:text-yellow-400"
                      )}>
                        {d.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{d.detail}</span>
                      {d.impact && (
                        <span className="text-[9px] text-muted-foreground/70 block mt-0.5">
                          Est. impact: {d.impact}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Warnings/notes */}
          {doc.notes && doc.notes.length > 0 && (
            <div className="space-y-1">
              {doc.notes.map((n, i) => (
                <div key={i} className="rounded-md bg-amber-500/5 border border-amber-500/15 p-2.5 text-[11px] text-amber-600 dark:text-amber-400">
                  ⚠ {n}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {doc.state === 'missing' && (
              <>
                <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => onRequestFromSupplier?.(doc.id)}>
                  <Mail size={10} /> Request from supplier
                </Button>
                <Button variant="ghost" size="sm" className="text-[10px] h-7 gap-1 text-muted-foreground" onClick={() => onMarkNA?.(doc.id)}>
                  <MinusCircle size={10} /> Mark as not applicable
                </Button>
              </>
            )}
            {(doc.state === 'issue' || doc.state === 'verified') && (
              <>
                <label>
                  <input type="file" className="hidden" onChange={handleReplaceInput} accept=".pdf,.jpg,.png,.doc,.docx,.xlsx" />
                  <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" asChild>
                    <span><RefreshCw size={10} /> Replace with corrected version</span>
                  </Button>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] h-7 gap-1 text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 size={10} /> Remove document
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Processing state expanded content */}
      {expanded && doc.state === 'processing' && (
        <div className="px-3 pb-4 pt-2 border-t border-border/50">
          <div className="flex flex-col items-center gap-2 py-6">
            <Loader2 size={24} className="text-blue-500 animate-spin" />
            <p className="text-xs text-muted-foreground font-medium">Extracting with AI...</p>
            <p className="text-[10px] text-muted-foreground/60">Identifying fields, verifying data, checking compliance</p>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {doc.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the uploaded file and all extracted data for this document.
              You can re-upload it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete?.(doc.id)}
            >
              Remove document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
