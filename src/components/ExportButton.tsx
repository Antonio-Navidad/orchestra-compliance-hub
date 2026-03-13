import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToExcel, type ExportColumn } from "@/lib/excelExport";

interface ExportButtonProps {
  data: Record<string, any>[];
  columns: ExportColumn[];
  filename: string;
  sheetName?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
}

export function ExportButton({
  data,
  columns,
  filename,
  sheetName,
  label = "Export to Excel",
  variant = "outline",
  size = "sm",
  className,
  disabled,
}: ExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;
    exportToExcel(data, columns, filename, sheetName);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className={`font-mono text-[10px] gap-1.5 ${className ?? ""}`}
    >
      <Download size={12} />
      {label}
    </Button>
  );
}
