import { useState, useRef } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PdfUploadProps {
  shipmentId: string;
  onExtracted?: (data: { hs_code: string; price: number; weight: number }) => void;
}

export function PdfUpload({ shipmentId, onExtracted }: PdfUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<{ hs_code: string; price: number; weight: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || f.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    setFile(f);
    setProcessing(true);

    // Simulated extraction - replace with Google Document AI call
    setTimeout(() => {
      const mockData = { hs_code: '8507.60.00', price: 90000, weight: 4200 };
      setExtractedData(mockData);
      setProcessing(false);
      onExtracted?.(mockData);
      toast.success('PDF data extracted successfully');
    }, 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h4 className="font-mono text-xs text-muted-foreground">DOCUMENT UPLOAD</h4>
      
      <input ref={inputRef} type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
      
      <Button
        variant="outline"
        className="w-full border-dashed border-2 h-20 hover:bg-accent/50"
        onClick={() => inputRef.current?.click()}
        disabled={processing}
      >
        {processing ? (
          <div className="flex flex-col items-center gap-1">
            <Loader2 size={20} className="animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Processing with Document AI...</span>
          </div>
        ) : file ? (
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <span className="text-sm truncate">{file.name}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload size={20} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload Invoice/Manifest PDF</span>
          </div>
        )}
      </Button>

      {extractedData && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1.5">
          <h5 className="font-mono text-xs text-primary font-semibold">EXTRACTED DATA</h5>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block">HTS Code</span>
              <span className="font-mono font-semibold">{extractedData.hs_code}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Price</span>
              <span className="font-mono font-semibold">${extractedData.price.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Weight</span>
              <span className="font-mono font-semibold">{extractedData.weight.toLocaleString()} kg</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
