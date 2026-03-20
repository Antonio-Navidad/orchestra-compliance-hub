import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Archive, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import type { CommandShipment } from "./ShipmentCard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipments: CommandShipment[];
  selectedIds: Set<string>;
}

export function ExportCenter({ open, onOpenChange, shipments, selectedIds }: Props) {
  const selected = selectedIds.size > 0
    ? shipments.filter(s => selectedIds.has(s.shipment_id))
    : shipments;

  const exportExcel = () => {
    const rows = selected.map(s => ({
      "Shipment ID": s.shipment_id,
      "Lane": `${s.origin_country || "?"} → ${s.destination_country || "?"}`,
      "Mode": s.mode,
      "Status": s.status,
      "Declared Value": s.declared_value,
      "HS Code": s.hs_code,
      "Compliance Score": s.packet_score ?? 0,
      "Filing Readiness": s.filing_readiness || "unknown",
      "Consignee": s.consignee,
      "Broker": s.assigned_broker || "",
      "Created": s.created_at?.slice(0, 10) || "",
      "Departure": s.planned_departure?.slice(0, 10) || "",
      "ETA": s.estimated_arrival?.slice(0, 10) || "",
      "Priority": s.priority || "normal",
      "Direction": s.direction || "inbound",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Shipments");
    XLSX.writeFile(wb, `orchestra-shipments-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Export complete", description: `${rows.length} shipments exported to Excel.` });
    onOpenChange(false);
  };

  const exportHistorical = () => {
    const historical = shipments.filter(s => ["cleared", "closed_avoided", "closed_incident"].includes(s.status));
    if (historical.length === 0) {
      toast({ title: "No historical data", description: "No cleared/archived shipments found.", variant: "destructive" });
      return;
    }
    const rows = historical.map(s => ({
      "Shipment ID": s.shipment_id,
      "Lane": `${s.origin_country || "?"} → ${s.destination_country || "?"}`,
      "Mode": s.mode,
      "Status": s.status,
      "Declared Value": s.declared_value,
      "Compliance Score": s.packet_score ?? 0,
      "Created": s.created_at?.slice(0, 10) || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Historical");
    XLSX.writeFile(wb, `orchestra-historical-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Historical export complete", description: `${rows.length} shipments exported.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm flex items-center gap-2">
            <Download size={16} className="text-primary" /> Export Center
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <p className="text-xs text-muted-foreground">
            {selectedIds.size > 0
              ? `Exporting ${selectedIds.size} selected shipment${selectedIds.size > 1 ? "s" : ""}`
              : `Exporting all ${shipments.length} shipments`
            }
          </p>

          <Button variant="outline" className="w-full justify-start font-mono text-xs gap-2 h-12" onClick={exportExcel}>
            <FileSpreadsheet size={16} className="text-risk-safe" />
            <div className="text-left">
              <p className="font-bold">Master Summary (Excel)</p>
              <p className="text-[10px] text-muted-foreground">One row per shipment with all key fields</p>
            </div>
          </Button>

          <Button variant="outline" className="w-full justify-start font-mono text-xs gap-2 h-12" onClick={exportHistorical}>
            <Archive size={16} className="text-primary" />
            <div className="text-left">
              <p className="font-bold">Historical Compliance Record</p>
              <p className="text-[10px] text-muted-foreground">All cleared & archived shipments for audit</p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
