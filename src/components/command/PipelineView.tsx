import { useState } from "react";
import { ShipmentCard, type CommandShipment } from "./ShipmentCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const PIPELINE_COLUMNS = [
  { key: "draft", label: "Draft", statuses: ["new"] },
  { key: "docs_pending", label: "Documents Pending", statuses: ["waiting_docs"] },
  { key: "under_review", label: "Under Review", statuses: ["in_review"] },
  { key: "ready_to_file", label: "Ready to File", statuses: ["corrected"] },
  { key: "in_transit", label: "Filed / In Transit", statuses: ["in_transit", "filed", "sent_to_broker"] },
  { key: "customs_hold", label: "Customs Hold", statuses: ["customs_hold", "flagged", "escalated"] },
  { key: "cleared", label: "Cleared", statuses: ["cleared", "closed_avoided"] },
  { key: "archived", label: "Archived", statuses: ["closed_incident"] },
];

interface PipelineViewProps {
  shipments: CommandShipment[];
  onCardClick: (s: CommandShipment) => void;
  onStatusChange: (shipmentId: string, newStatus: string) => void;
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
}

export function PipelineView({ shipments, onCardClick, onStatusChange, selectedIds, onSelect }: PipelineViewProps) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const getColumnShipments = (col: typeof PIPELINE_COLUMNS[0]) =>
    shipments.filter(s => col.statuses.includes(s.status));

  const handleDrop = (e: React.DragEvent, col: typeof PIPELINE_COLUMNS[0]) => {
    e.preventDefault();
    setDragOverCol(null);
    const shipmentId = e.dataTransfer.getData("shipment_id");
    if (shipmentId && col.statuses[0]) {
      onStatusChange(shipmentId, col.statuses[0]);
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
      {PIPELINE_COLUMNS.map(col => {
        const colShipments = getColumnShipments(col);
        const totalValue = colShipments.reduce((s, sh) => s + (sh.declared_value || 0), 0);

        return (
          <div
            key={col.key}
            className={`flex-shrink-0 w-[220px] rounded-lg border bg-secondary/30 transition-colors ${dragOverCol === col.key ? "border-primary bg-primary/5" : "border-border"}`}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, col)}
          >
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground">{col.label.toUpperCase()}</span>
                <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">{colShipments.length}</Badge>
              </div>
              {totalValue > 0 && (
                <span className="text-[9px] font-mono text-muted-foreground">${totalValue.toLocaleString()}</span>
              )}
            </div>

            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="p-2 space-y-2">
                {colShipments.map(s => (
                  <ShipmentCard
                    key={s.id}
                    shipment={s}
                    onClick={onCardClick}
                    selected={selectedIds.has(s.shipment_id)}
                    onSelect={onSelect}
                  />
                ))}
                {colShipments.length === 0 && (
                  <div className="text-center py-8 text-[10px] text-muted-foreground font-mono">
                    Drop shipments here
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
