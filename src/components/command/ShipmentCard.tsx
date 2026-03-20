import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Ship, Truck, FileWarning, Clock, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import type { TransportMode } from "@/types/orchestra";

export interface CommandShipment {
  id: string;
  shipment_id: string;
  mode: TransportMode;
  description: string;
  consignee: string;
  hs_code: string;
  declared_value: number;
  risk_score: number;
  status: string;
  created_at: string;
  origin_country?: string;
  destination_country?: string;
  packet_score?: number;
  filing_readiness?: string;
  priority?: string;
  assigned_broker?: string;
  direction?: string;
  planned_departure?: string;
  estimated_arrival?: string;
}

const MODE_ICONS: Record<string, any> = { air: Plane, sea: Ship, land: Truck };

function ReadinessRing({ score }: { score: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "hsl(var(--risk-safe))" : score >= 50 ? "hsl(var(--risk-medium))" : "hsl(var(--risk-critical))";

  return (
    <svg width={36} height={36} className="shrink-0">
      <circle cx={18} cy={18} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={3} />
      <circle cx={18} cy={18} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 18 18)" className="transition-all duration-500" />
      <text x={18} y={18} textAnchor="middle" dominantBaseline="central"
        className="fill-foreground" style={{ fontSize: 9, fontFamily: "monospace" }}>{score}%</text>
    </svg>
  );
}

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function getNextAction(s: CommandShipment): string {
  if (!s.packet_score || s.packet_score < 30) return "Upload documents";
  if (s.filing_readiness === "not_ready") return "Complete filing requirements";
  if (s.packet_score < 70) return "Resolve compliance gaps";
  if (s.status === "new" || s.status === "waiting_docs") return "Submit for review";
  if (s.status === "in_review") return "Awaiting reviewer";
  if (s.status === "customs_hold") return "Resolve hold issues";
  return "Monitor status";
}

interface ShipmentCardProps {
  shipment: CommandShipment;
  onClick: (s: CommandShipment) => void;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
}

export function ShipmentCard({ shipment: s, onClick, selected, onSelect }: ShipmentCardProps) {
  const ModeIcon = MODE_ICONS[s.mode] || Ship;
  const days = daysSince(s.created_at);
  const missingDocs = s.packet_score ? Math.max(0, Math.round((100 - s.packet_score) / 10)) : 0;

  return (
    <div
      className={`rounded-lg border bg-card p-3 cursor-pointer hover:border-primary/40 transition-all group ${selected ? "border-primary ring-1 ring-primary/30" : "border-border"}`}
      onClick={() => onClick(s)}
      draggable
      onDragStart={e => e.dataTransfer.setData("shipment_id", s.shipment_id)}
    >
      <div className="flex items-center gap-2 mb-2">
        {onSelect && (
          <input type="checkbox" checked={selected} onChange={e => { e.stopPropagation(); onSelect(s.shipment_id, e.target.checked); }}
            className="rounded border-border" onClick={e => e.stopPropagation()} />
        )}
        <ReadinessRing score={s.packet_score ?? 0} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold truncate">{s.shipment_id}</span>
            <ModeIcon size={11} className="text-muted-foreground shrink-0" />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <span>{s.origin_country || "?"}</span>
            <span>→</span>
            <span>{s.destination_country || "?"}</span>
          </div>
        </div>
      </div>

      {missingDocs > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-risk-high mb-1">
          <FileWarning size={10} /> {missingDocs} missing doc{missingDocs > 1 ? "s" : ""}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock size={9} /> {days}d ago
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => {
              e.stopPropagation();
              const row = {
                "Shipment ID": s.shipment_id,
                "Mode": s.mode,
                "Lane": `${s.origin_country || "?"} → ${s.destination_country || "?"}`,
                "Status": s.status,
                "Declared Value": s.declared_value,
                "HS Code": s.hs_code,
                "Compliance Score": s.packet_score ?? 0,
                "Consignee": s.consignee,
                "Broker": s.assigned_broker || "",
                "Created": s.created_at?.slice(0, 10),
              };
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([row]), "Shipment");
              XLSX.writeFile(wb, `Orchestra_${s.shipment_id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
              toast({ title: "Exported", description: `${s.shipment_id} exported to Excel.` });
            }}
            title="Export to Excel"
          >
            <Download size={10} />
          </Button>
          <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 max-w-[120px] truncate">
            {getNextAction(s)}
          </Badge>
        </div>
      </div>
    </div>
  );
}
