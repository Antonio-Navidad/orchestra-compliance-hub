import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertTriangle, XCircle, MinusCircle, ChevronDown,
  Upload, FileText, Mail, RefreshCw
} from "lucide-react";

export type DocCardState = 'verified' | 'issue' | 'missing' | 'not_applicable';

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

export interface DocumentCardData {
  id: string;
  name: string;
  phase: string;
  state: DocCardState;
  statusLine: string;
  extractedFields?: ExtractedField[];
  crossRefChecks?: CrossRefCheck[];
  discrepancies?: string[];
  notes?: string[];
  /** For missing docs: action hint */
  actionHint?: string;
}

interface Props {
  doc: DocumentCardData;
  onUpload?: (docId: string, files: FileList) => void;
  onRequestFromSupplier?: (docId: string) => void;
  onUploadCorrected?: (docId: string) => void;
  onMarkNA?: (docId: string) => void;
  onClickAlert?: (docId: string, message: string) => void;
}

const STATE_CONFIG: Record<DocCardState, { border: string; dot: typeof CheckCircle2; dotClass: string; bg: string }> = {
  verified: { border: 'border-l-green-500', dot: CheckCircle2, dotClass: 'text-green-500', bg: '' },
  issue: { border: 'border-l-amber-500', dot: AlertTriangle, dotClass: 'text-amber-500', bg: 'bg-amber-500/3' },
  missing: { border: 'border-l-red-500', dot: XCircle, dotClass: 'text-red-500', bg: 'bg-red-500/3' },
  not_applicable: { border: 'border-l-muted', dot: MinusCircle, dotClass: 'text-muted-foreground/50', bg: 'opacity-50' },
};

export function DocumentCard({ doc, onUpload, onRequestFromSupplier, onUploadCorrected, onMarkNA, onClickAlert }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
    <div className={cn(
      "rounded-lg border border-l-4 transition-all overflow-hidden",
      "border-border", cfg.border, cfg.bg,
      expanded && "col-span-2"
    )}>
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
          <span className="text-xs font-semibold block truncate">{doc.name}</span>
          <span className="text-[10px] text-muted-foreground">{doc.statusLine}</span>
        </div>
        <ChevronDown size={14} className={cn(
          "text-muted-foreground transition-transform shrink-0",
          expanded && "rotate-180"
        )} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
          {doc.state === 'missing' ? (
            /* Upload drop zone for missing docs */
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
                  <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.jpg,.png,.doc,.docx" />
                </label>
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                AI will extract and verify all key data points
              </p>
            </div>
          ) : (
            /* Two-column: extracted data + cross-reference */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Left: AI extracted data */}
              {doc.extractedFields && doc.extractedFields.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    AI Extracted Data
                  </h4>
                  <div className="space-y-0.5">
                    {doc.extractedFields.map((field, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-between py-1 px-2 rounded text-[11px]",
                          i % 2 === 0 ? "bg-secondary/20" : ""
                        )}
                      >
                        <span className="text-muted-foreground font-medium">{field.label}</span>
                        <span className={cn(
                          "font-semibold",
                          field.status === 'verified' && "text-green-600",
                          field.status === 'flagged' && "text-amber-500",
                          field.status === 'error' && "text-red-500",
                        )}>
                          {field.value}
                        </span>
                      </div>
                    ))}
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
            </div>
          )}

          {/* Discrepancy boxes */}
          {doc.discrepancies && doc.discrepancies.length > 0 && (
            <div className="space-y-1">
              {doc.discrepancies.map((d, i) => (
                <button
                  key={i}
                  onClick={() => onClickAlert?.(doc.id, d)}
                  className="w-full text-left rounded-md bg-red-500/10 border border-red-500/20 p-2.5 text-[11px] text-red-600 dark:text-red-400 hover:bg-red-500/15 transition-colors active:scale-[0.99]"
                >
                  ✕ {d}
                </button>
              ))}
            </div>
          )}

          {/* Info notes */}
          {doc.notes && doc.notes.length > 0 && (
            <div className="space-y-1">
              {doc.notes.map((n, i) => (
                <div key={i} className="rounded-md bg-secondary/30 border border-border p-2.5 text-[11px] text-muted-foreground">
                  ℹ {n}
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
            {doc.state === 'issue' && (
              <label>
                <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.jpg,.png,.doc,.docx" />
                <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" asChild>
                  <span><RefreshCw size={10} /> Upload corrected version</span>
                </Button>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
