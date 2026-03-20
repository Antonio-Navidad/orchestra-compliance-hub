import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ChevronDown, ChevronUp, Clock, AlertTriangle, TrendingDown, FileText } from "lucide-react";
import { differenceInDays, differenceInHours, format, parseISO, addDays } from "date-fns";
import type { CommandShipment } from "./ShipmentCard";
import { Link } from "react-router-dom";

interface Props {
  shipments: CommandShipment[];
}

interface BriefItem {
  icon: any;
  urgency: "critical" | "warning" | "info";
  title: string;
  detail: string;
  actionLabel: string;
  actionUrl: string;
}

function generateBriefItems(shipments: CommandShipment[]): BriefItem[] {
  const items: BriefItem[] = [];

  // Deadlines in next 48h
  const now = new Date();
  shipments.forEach(s => {
    if (s.planned_departure) {
      const dep = parseISO(s.planned_departure);
      const hoursAway = differenceInHours(dep, now);
      if (hoursAway > 0 && hoursAway <= 48) {
        items.push({
          icon: Clock,
          urgency: hoursAway <= 24 ? "critical" : "warning",
          title: `${s.shipment_id} departs in ${Math.round(hoursAway)}h`,
          detail: `${s.origin_country} → ${s.destination_country} via ${s.mode}. Filing deadline approaching.`,
          actionLabel: "Review filings →",
          actionUrl: `/shipment/${s.shipment_id}`,
        });
      }
    }
  });

  // Stuck shipments (same status > 3 days, active statuses)
  const activeStatuses = ["new", "waiting_docs", "in_review"];
  shipments.filter(s => activeStatuses.includes(s.status)).forEach(s => {
    const days = differenceInDays(now, parseISO(s.created_at));
    if (days >= 3) {
      items.push({
        icon: AlertTriangle,
        urgency: days >= 7 ? "critical" : "warning",
        title: `${s.shipment_id} stuck for ${days} days`,
        detail: `Status: ${s.status.replace(/_/g, " ")}. Consider escalating or updating documents.`,
        actionLabel: "Review gaps →",
        actionUrl: `/shipment/${s.shipment_id}`,
      });
    }
  });

  // Low readiness + departure within 7 days
  shipments.forEach(s => {
    if ((s.packet_score ?? 100) < 60 && s.planned_departure) {
      const dep = parseISO(s.planned_departure);
      const daysToDepart = differenceInDays(dep, now);
      if (daysToDepart > 0 && daysToDepart <= 7) {
        items.push({
          icon: TrendingDown,
          urgency: "critical",
          title: `${s.shipment_id} at risk — ${s.packet_score}% ready, departs in ${daysToDepart}d`,
          detail: `Compliance readiness is below threshold. Upload missing documents immediately.`,
          actionLabel: "Fix compliance →",
          actionUrl: `/shipment/${s.shipment_id}`,
        });
      }
    }
  });

  return items.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.urgency] - order[b.urgency];
  }).slice(0, 8);
}

export function AIPriorityBrief({ shipments }: Props) {
  const [open, setOpen] = useState(true);
  const items = generateBriefItems(shipments);
  if (items.length === 0 && shipments.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 hover:bg-primary/10 transition-colors">
          <Brain size={16} className="text-primary" />
          <span className="font-mono text-xs font-bold text-foreground">AI Priority Brief</span>
          <Badge variant="outline" className="text-[9px] font-mono">{format(new Date(), "MMM d")}</Badge>
          {items.length > 0 && <Badge className="text-[9px] px-1.5 py-0 bg-risk-critical">{items.length}</Badge>}
          <div className="flex-1" />
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 border-primary/20 rounded-b-lg p-4 space-y-3 bg-card/50">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono text-center py-4">
              ✅ All clear. No urgent items requiring attention today.
            </p>
          ) : (
            items.map((item, i) => {
              const Icon = item.icon;
              const borderColor = item.urgency === "critical" ? "border-l-risk-critical" : item.urgency === "warning" ? "border-l-risk-medium" : "border-l-primary";
              return (
                <div key={i} className={`rounded-lg border border-border bg-card p-3 border-l-[3px] ${borderColor}`}>
                  <div className="flex items-start gap-2">
                    <Icon size={14} className={item.urgency === "critical" ? "text-risk-critical mt-0.5" : "text-risk-medium mt-0.5"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-bold">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="font-mono text-[10px] h-6 px-2 text-primary shrink-0" asChild>
                      <Link to={item.actionUrl}>{item.actionLabel}</Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
