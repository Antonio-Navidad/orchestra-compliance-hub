import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Upload, FileText, Loader2, Check, AlertTriangle, ChevronRight, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ExtractedField {
  fieldName: string;
  value: string;
  confidence: number;
  sourceText?: string;
  accepted?: boolean;
}

interface SmartPreFillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (fields: Record<string, string>) => void;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 95
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : confidence >= 80
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-red-500/15 text-red-400 border-red-500/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border tabular-nums ${color}`}>
      {confidence}%
    </span>
  );
}

function formatFieldLabel(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function SmartPreFillModal({ open, onOpenChange, onApply }: SmartPreFillModalProps) {
  const [step, setStep] = useState<"upload" | "processing" | "review">("upload");
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const toBase64 = (bytes: Uint8Array) => {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStep("processing");

    try {
      const fallbackMime = file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain";
      const mimeType = file.type || fallbackMime;
      const shouldSendBinary = mimeType === "application/pdf" || !mimeType.startsWith("text/");

      const requestBody: Record<string, unknown> = {
        action: "extract_document",
        fileName: file.name,
        mimeType,
      };

      if (shouldSendBinary) {
        const arrayBuffer = await file.arrayBuffer();
        requestBody.documentBase64 = toBase64(new Uint8Array(arrayBuffer));
      } else {
        const text = await file.text();
        requestBody.documentText = text.slice(0, 60000);
      }

      const { data, error } = await supabase.functions.invoke("intake-validate", {
        body: requestBody,
      });

      if (error) throw error;

      const extracted: ExtractedField[] = (data.fields || []).map((f: any) => ({
        ...f,
        accepted: f.confidence >= 85,
      }));

      setFields(extracted);
      setStep("review");
    } catch (err: any) {
      toast({ title: "Extraction failed", description: err.message, variant: "destructive" });
      setStep("upload");
    }
  };

  const toggleField = (idx: number) => {
    setFields(prev => prev.map((f, i) => (i === idx ? { ...f, accepted: !f.accepted } : f)));
  };

  const acceptedCount = useMemo(() => fields.filter(f => f.accepted).length, [fields]);
  const needsReviewCount = useMemo(() => fields.filter(f => f.confidence < 85).length, [fields]);

  const applyFields = (onlySelected: boolean) => {
    const toApply = onlySelected ? fields.filter(f => f.accepted) : fields;
    const result: Record<string, string> = {};
    toApply.forEach(f => {
      result[f.fieldName] = f.value;
    });
    onApply(result);
    onOpenChange(false);
    setStep("upload");
    setFields([]);
    toast({
      title: "Fields applied",
      description: `${Object.keys(result).length} fields auto-populated from document.`,
    });
  };

  const resetModal = () => {
    setStep("upload");
    setFields([]);
    setFileName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-border/60 bg-[hsl(var(--card))]">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border/50">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Sparkles size={18} className="text-primary" />
              Smart Pre-fill from Documents
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/80 font-normal leading-relaxed">
              {step === "review"
                ? `${fields.length} fields extracted — review and apply to your shipment.`
                : "Drop a commercial invoice, packing list, or shipping document. Orchestra will extract and populate matching fields."}
            </DialogDescription>
          </DialogHeader>

          {/* File indicator in review mode */}
          {step === "review" && fileName && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-md bg-muted/40 border border-border/40">
              <File size={14} className="text-primary shrink-0" />
              <span className="text-xs font-medium text-foreground truncate">{fileName}</span>
              <Badge className="ml-auto shrink-0 bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] font-semibold hover:bg-emerald-500/20">
                <Check size={10} className="mr-0.5" />
                Extracted
              </Badge>
            </div>
          )}
        </div>

        {/* Upload step */}
        {step === "upload" && (
          <div className="p-5">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.doc,.docx,.csv"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <div
              className="border-2 border-dashed border-border/60 rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              <Upload className="mx-auto mb-3 text-muted-foreground/60" size={32} />
              <p className="text-sm text-foreground font-semibold">Drop your document here</p>
              <p className="text-xs text-muted-foreground/70 mt-1.5">or click to browse · PDF, TXT, DOC, CSV</p>
            </div>
          </div>
        )}

        {/* Processing step */}
        {step === "processing" && (
          <div className="py-16 text-center space-y-3 px-5">
            <div className="relative mx-auto w-12 h-12">
              <Loader2 className="animate-spin text-primary w-12 h-12" />
              <Sparkles size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
            <p className="text-sm text-foreground font-semibold">Extracting fields from {fileName}...</p>
            <p className="text-xs text-muted-foreground/70">Orchestra AI is reading your document</p>
          </div>
        )}

        {/* Review step */}
        {step === "review" && (
          <>
            {/* Summary bar */}
            <div className="px-5 py-2.5 border-b border-border/40 bg-muted/20">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                  <Check size={12} />
                  {acceptedCount} fields ready to apply
                </span>
                <span className="text-muted-foreground/50">·</span>
                {needsReviewCount > 0 ? (
                  <span className="flex items-center gap-1 text-amber-500 font-medium">
                    <AlertTriangle size={11} />
                    {needsReviewCount} need review
                  </span>
                ) : (
                  <span className="text-muted-foreground/60 font-medium">0 need review</span>
                )}
              </div>
            </div>

            {/* Fields list */}
            <ScrollArea className="max-h-[380px]">
              <div className="px-3 py-2">
                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    No fields could be extracted from this document.
                  </p>
                ) : (
                  fields.map((field, idx) => {
                    const isHighConf = field.confidence === 100;
                    const isLowConf = field.confidence < 85;
                    const borderColor = isHighConf
                      ? "border-l-emerald-500/60"
                      : isLowConf
                      ? "border-l-amber-500/60"
                      : "border-l-transparent";

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 px-3 py-3 rounded-lg border-l-[3px] cursor-pointer transition-colors mb-1 ${borderColor} ${
                          idx % 2 === 0 ? "bg-muted/15" : "bg-transparent"
                        } hover:bg-muted/30`}
                        onClick={() => toggleField(idx)}
                      >
                        {/* Checkbox */}
                        <div className="pt-0.5">
                          <Checkbox
                            checked={field.accepted}
                            onCheckedChange={() => toggleField(idx)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </div>

                        {/* Field info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                              {formatFieldLabel(field.fieldName)}
                            </span>
                            {isLowConf && (
                              <Badge
                                variant="outline"
                                className="text-[9px] text-amber-500 border-amber-500/30 bg-amber-500/10 gap-0.5 py-0 px-1.5"
                              >
                                <AlertTriangle size={8} /> Please verify
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-bold text-foreground truncate leading-tight">
                            {field.value}
                          </p>
                          {field.sourceText && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <FileText size={10} className="text-muted-foreground/40 shrink-0" />
                              <span className="text-[10px] text-muted-foreground/50 truncate">
                                Source: {field.sourceText}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Confidence badge */}
                        <div className="shrink-0 pt-1">
                          <ConfidenceBadge confidence={field.confidence} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Action area */}
            <div className="px-5 py-4 border-t border-border/40 space-y-2.5">
              <Button
                onClick={() => applyFields(false)}
                disabled={fields.length === 0}
                className="w-full h-10 font-semibold text-sm gap-2"
              >
                Apply All {fields.length} Fields
                <ChevronRight size={14} />
              </Button>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyFields(true)}
                  disabled={acceptedCount === 0}
                  className="text-xs font-medium h-8"
                >
                  Review & Apply Selected ({acceptedCount})
                </Button>
                <button
                  onClick={resetModal}
                  className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors underline-offset-2 hover:underline font-medium"
                >
                  Try another document
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
