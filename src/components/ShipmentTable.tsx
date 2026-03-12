import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/RiskBadge";
import { ModeIcon } from "@/components/ModeIcon";
import { Shipment, TransportMode } from "@/types/orchestra";
import { Badge } from "@/components/ui/badge";
import { getStatusColor, getStatusLabel } from "@/components/StatusWorkflow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

type SortKey = "shipment_id" | "consignee" | "declared_value" | "risk_score" | "status" | "hs_code";
type SortDir = "asc" | "desc";

const SORT_OPTIONS: { label: string; key: SortKey; dir: SortDir }[] = [
  { label: "A → Z (ID)", key: "shipment_id", dir: "asc" },
  { label: "Z → A (ID)", key: "shipment_id", dir: "desc" },
  { label: "Highest Value", key: "declared_value", dir: "desc" },
  { label: "Lowest Value", key: "declared_value", dir: "asc" },
  { label: "Highest Risk", key: "risk_score", dir: "desc" },
  { label: "Lowest Risk", key: "risk_score", dir: "asc" },
  { label: "Consignee A → Z", key: "consignee", dir: "asc" },
  { label: "HS Code A → Z", key: "hs_code", dir: "asc" },
];

interface ShipmentTableProps {
  shipments: Shipment[];
  mode?: TransportMode;
}

export function ShipmentTable({ shipments, mode }: ShipmentTableProps) {
  const navigate = useNavigate();
  const [sortOption, setSortOption] = useState("0");

  const filtered = mode ? shipments.filter(s => s.mode === mode) : shipments;

  const sorted = useMemo(() => {
    const opt = SORT_OPTIONS[parseInt(sortOption)] || SORT_OPTIONS[0];
    return [...filtered].sort((a, b) => {
      const aVal = a[opt.key as keyof Shipment];
      const bVal = b[opt.key as keyof Shipment];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return opt.dir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal || "");
      const bStr = String(bVal || "");
      return opt.dir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filtered, sortOption]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 justify-end">
        <ArrowUpDown size={12} className="text-muted-foreground" />
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="w-[180px] bg-secondary/50 text-xs font-mono h-8">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt, i) => (
              <SelectItem key={i} value={String(i)} className="text-xs">{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="font-mono text-xs text-muted-foreground">SHIPMENT ID</TableHead>
              {!mode && <TableHead className="font-mono text-xs text-muted-foreground">MODE</TableHead>}
              <TableHead className="font-mono text-xs text-muted-foreground">CONSIGNEE</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground">DESCRIPTION</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground">HS CODE</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground text-right">DECLARED VALUE</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground text-center">RISK SCORE</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground">STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={mode ? 7 : 8} className="text-center text-muted-foreground py-12">
                  No shipments found for this mode.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((shipment) => (
                <TableRow
                  key={shipment.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/shipment/${shipment.shipment_id}`)}
                >
                  <TableCell className="font-mono text-sm font-semibold text-primary">
                    {shipment.shipment_id}
                  </TableCell>
                  {!mode && (
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <ModeIcon mode={shipment.mode} className="text-muted-foreground" size={14} />
                        <span className="font-mono text-xs text-muted-foreground uppercase">{shipment.mode}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-sm">{shipment.consignee}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{shipment.description}</TableCell>
                  <TableCell className="font-mono text-sm">{shipment.hs_code}</TableCell>
                  <TableCell className="font-mono text-sm text-right">
                    ${shipment.declared_value.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <RiskBadge score={shipment.risk_score} size="sm" />
                  </TableCell>
                  <TableCell>
                    {shipment.status === "waiting_docs" ? (
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(shipment.status)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/shipment/${shipment.shipment_id}?tab=documents`);
                        }}
                      >
                        {getStatusLabel(shipment.status)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={`font-mono text-[10px] ${getStatusColor(shipment.status)}`}>
                        {getStatusLabel(shipment.status)}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
