import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskDot } from "@/components/RiskDot";
import { StatusBadge } from "@/components/StatusBadge";
import { ModeIcon } from "@/components/ModeIcon";
import { Shipment, TransportMode } from "@/types/orchestra";
import { getScoreBorderClass } from "@/lib/compliance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

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
  const { t } = useLanguage();

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
              <TableHead className="font-mono text-xs text-muted-foreground">{t("table.shipmentId")}</TableHead>
              {!mode && <TableHead className="font-mono text-xs text-muted-foreground">{t("table.mode")}</TableHead>}
              <TableHead className="font-mono text-xs text-muted-foreground">{t("table.consignee")}</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground">{t("table.description")}</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground">{t("table.hsCode")}</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground text-right">{t("table.declaredValue")}</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground text-center">{t("table.risk")}</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground">{t("common.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={mode ? 7 : 8} className="text-center text-muted-foreground py-12">
                  {t("table.noShipments")}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((shipment) => (
                <TableRow
                  key={shipment.id}
                  className={`cursor-pointer hover:bg-accent/50 transition-colors border-l-[3px] ${getScoreBorderClass(shipment.risk_score)}`}
                  onClick={() => navigate(`/shipment/${shipment.shipment_id}`)}
                >
                  <TableCell className="font-mono text-sm font-semibold text-primary">
                    <div className="flex items-center gap-2">
                      <RiskDot score={shipment.risk_score} />
                      {shipment.shipment_id}
                    </div>
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
                    <StatusBadge
                      status={shipment.status}
                      onClick={shipment.status === "waiting_docs" ? (e) => {
                        e.stopPropagation();
                        navigate(`/shipment/${shipment.shipment_id}?tab=documents`);
                      } : undefined}
                    />
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
