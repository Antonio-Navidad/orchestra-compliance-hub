import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plane, Ship, Truck, Clock, FileText, ExternalLink, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import type { CommandShipment } from "./ShipmentCard";
import { differenceInHours, format, parseISO } from "date-fns";

const MODE_ICONS: Record<string, any> = { air: Plane, sea: Ship, land: Truck };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: CommandShipment | null;
}

export function ShipmentDetailPanel({ open, onOpenChange, shipment: s }: Props) {
  if (!s) return null;
  const ModeIcon = MODE_ICONS[s.mode] || Ship;
  const score = s.packet_score ?? 0;
  const scoreColor = score >= 80 ? "text-risk-safe" : score >= 50 ? "text-risk-medium" : "text-risk-critical";
  const progressClass = score >= 80 ? "[&>div]:bg-risk-safe" : score >= 50 ? "[&>div]:bg-risk-medium" : "[&>div]:bg-risk-critical";

  const deadlines: { label: string; date: string; hoursAway: number }[] = [];
  if (s.planned_departure) {
    const dep = parseISO(s.planned_departure);
    const isfDate = new Date(dep.getTime() - 24 * 3600000);
    deadlines.push({ label: "ISF 10+2", date: format(isfDate, "MMM d"), hoursAway: differenceInHours(isfDate, new Date()) });
    deadlines.push({ label: "Departure", date: format(dep, "MMM d"), hoursAway: differenceInHours(dep, new Date()) });
  }
  if (s.estimated_arrival) {
    deadlines.push({ label: "ETA", date: format(parseISO(s.estimated_arrival), "MMM d"), hoursAway: differenceInHours(parseISO(s.estimated_arrival), new Date()) });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-mono text-base">
            <ModeIcon size={16} className="text-primary" />
            {s.shipment_id}
            <Badge variant="outline" className="text-[9px] font-mono">{s.status.replace(/_/g, " ").toUpperCase()}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Lane */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-mono text-[10px] text-muted-foreground">ORIGIN</span>
              <p className="text-sm font-mono">{s.origin_country || "—"}</p>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground">DESTINATION</span>
              <p className="text-sm font-mono">{s.destination_country || "—"}</p>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground">HS CODE</span>
              <p className="text-sm font-mono">{s.hs_code || "—"}</p>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground">DECLARED VALUE</span>
              <p className="text-sm font-mono">${s.declared_value?.toLocaleString() ?? "—"}</p>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground">CONSIGNEE</span>
              <p className="text-sm font-mono truncate">{s.consignee || "—"}</p>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground">BROKER</span>
              <p className="text-sm font-mono truncate">{s.assigned_broker || "—"}</p>
            </div>
          </div>

          {/* Readiness */}
          <div className="space-y-2">
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider">COMPLIANCE READINESS</span>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold font-mono ${scoreColor}`}>{score}%</span>
              <Progress value={score} className={`flex-1 h-2 ${progressClass}`} />
            </div>
            <Badge variant={s.filing_readiness === "ready" ? "default" : "destructive"} className="font-mono text-[9px]">
              <Shield size={10} className="mr-1" />
              FILING: {(s.filing_readiness || "UNKNOWN").toUpperCase()}
            </Badge>
          </div>

          {/* Deadlines */}
          {deadlines.length > 0 && (
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">DEADLINES</span>
              <div className="space-y-1.5">
                {deadlines.map(d => {
                  const urgency = d.hoursAway < 24 ? "text-risk-critical" : d.hoursAway < 72 ? "text-risk-medium" : "text-risk-safe";
                  return (
                    <div key={d.label} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">{d.label}</span>
                      <span className={`font-mono font-bold ${urgency}`}>
                        <Clock size={10} className="inline mr-1" />
                        {d.date} ({d.hoursAway > 0 ? `${Math.round(d.hoursAway)}h` : "PAST"})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider">QUICK ACTIONS</span>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1" asChild>
                <Link to={`/shipment/${s.shipment_id}`}><ExternalLink size={10} /> View Detail</Link>
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1" asChild>
                <Link to="/doc-intel?tab=library"><FileText size={10} /> Documents</Link>
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1" asChild>
                <Link to="/compliance-engine"><Shield size={10} /> Compliance</Link>
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1" asChild>
                <Link to={`/decision-twin/${s.shipment_id}`}>🔮 Decision Twin</Link>
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
