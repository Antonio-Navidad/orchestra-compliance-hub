import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Upload, FileText, Loader2, Check, AlertTriangle } from "lucide-react";
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

export function SmartPreFillModal({ open, onOpenChange, onApply }: SmartPreFillModalProps) {
  const [step, setStep] = useState<"upload" | "processing" | "review">("upload");
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStep("processing");

    try {
      // Read file as text (for PDF we'd use extraction API, simplified here)
      const text = await file.text();
      const { data, error } = await supabase.functions.invoke("intake-validate", {
        body: { action: "extract_document", documentText: text.slice(0, 8000) },
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
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, accepted: !f.accepted } : f));
  };

  const acceptAll = () => {
    setFields(prev => prev.map(f => ({ ...f, accepted: true })));
  };

  const applyFields = () => {
    const result: Record<string, string> = {};
    fields.filter(f => f.accepted).forEach(f => {
      result[f.fieldName] = f.value;
    });
    onApply(result);
    onOpenChange(false);
    setStep("upload");
    setFields([]);
    toast({ title: "Fields applied", description: `${Object.keys(result).length} fields auto-populated from document.` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            Smart Pre-fill from Documents
          </DialogTitle>
          <DialogDescription>
            Drop a commercial invoice, packing list, or shipping document. Orchestra will extract and populate matching fields.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
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
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              <Upload className="mx-auto mb-3 text-muted-foreground" size={32} />
              <p className="text-sm text-foreground font-medium">Drop your document here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse · PDF, TXT, DOC, CSV</p>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="mx-auto animate-spin text-primary" size={32} />
            <p className="text-sm text-foreground">Extracting fields from {fileName}...</p>
            <p className="text-xs text-muted-foreground">Orchestra AI is reading your document</p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-primary" />
                <span className="text-xs font-mono text-muted-foreground">{fileName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={acceptAll} className="text-xs">
                Accept All
              </Button>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-1.5">
              {fields.map((field, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                    field.accepted ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  }`}
                  onClick={() => toggleField(idx)}
                >
                  <div className={`w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 ${
                    field.accepted ? "bg-primary border-primary" : "border-muted-foreground"
                  }`}>
                    {field.accepted && <Check size={12} className="text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono capitalize">{field.fieldName.replace(/_/g, " ")}</span>
                      {field.confidence < 85 && (
                        <Badge variant="outline" className="text-[9px] text-risk-high border-risk-high/30 gap-0.5">
                          <AlertTriangle size={8} /> Verify
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{field.value}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                    {field.confidence}%
                  </Badge>
                </div>
              ))}
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No fields could be extracted from this document.</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={applyFields} disabled={!fields.some(f => f.accepted)} className="flex-1 font-mono text-xs">
                Apply {fields.filter(f => f.accepted).length} Fields
              </Button>
              <Button variant="outline" onClick={() => { setStep("upload"); setFields([]); }} className="font-mono text-xs">
                Try Another
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
