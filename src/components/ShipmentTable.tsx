import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/RiskBadge";
import { ModeIcon } from "@/components/ModeIcon";
import { Shipment, TransportMode } from "@/types/orchestra";
import { Badge } from "@/components/ui/badge";

interface ShipmentTableProps {
  shipments: Shipment[];
  mode?: TransportMode;
}

export function ShipmentTable({ shipments, mode }: ShipmentTableProps) {
  const navigate = useNavigate();
  const filtered = mode ? shipments.filter(s => s.mode === mode) : shipments;

  const statusColors: Record<string, string> = {
    in_transit: 'bg-primary/20 text-primary border-primary/30',
    customs_hold: 'bg-risk-medium/20 text-risk-medium border-risk-medium/30',
    cleared: 'bg-risk-safe/20 text-risk-safe border-risk-safe/30',
    flagged: 'bg-risk-critical/20 text-risk-critical border-risk-critical/30',
  };

  return (
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
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={mode ? 7 : 8} className="text-center text-muted-foreground py-12">
                No shipments found for this mode.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((shipment) => (
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
                  <Badge variant="outline" className={`font-mono text-[10px] ${statusColors[shipment.status] || ''}`}>
                    {shipment.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
