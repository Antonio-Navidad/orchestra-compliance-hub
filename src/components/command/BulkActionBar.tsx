import { Button } from "@/components/ui/button";
import { Download, RefreshCw, UserPlus, Archive, ShieldCheck, X } from "lucide-react";

interface Props {
  count: number;
  onClear: () => void;
  onBulkExport: () => void;
  onBulkArchive: () => void;
  onBulkCompliance: () => void;
}

export function BulkActionBar({ count, onClear, onBulkExport, onBulkArchive, onBulkCompliance }: Props) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2 px-4">
      <span className="font-mono text-xs font-bold text-primary">{count} selected</span>
      <div className="flex-1" />
      <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1 h-7" onClick={onBulkExport}>
        <Download size={10} /> Export Docs
      </Button>
      <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1 h-7" onClick={onBulkCompliance}>
        <ShieldCheck size={10} /> Run Compliance
      </Button>
      <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1 h-7" onClick={onBulkArchive}>
        <Archive size={10} /> Archive
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClear}>
        <X size={12} />
      </Button>
    </div>
  );
}
