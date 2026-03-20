import { useMemo } from "react";
import { differenceInDays, format, parseISO, addDays, startOfDay, max, min } from "date-fns";
import { Plane, Ship, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CommandShipment } from "./ShipmentCard";

const MODE_ICONS: Record<string, any> = { air: Plane, sea: Ship, land: Truck };

interface Props {
  shipments: CommandShipment[];
  onCardClick: (s: CommandShipment) => void;
}

export function TimelineView({ shipments, onCardClick }: Props) {
  const { timelineShipments, startDate, totalDays } = useMemo(() => {
    const now = new Date();
    const items = shipments
      .filter(s => s.status !== "cleared" && s.status !== "closed_incident" && s.status !== "closed_avoided")
      .map(s => ({
        ...s,
        start: parseISO(s.created_at),
        end: s.estimated_arrival ? parseISO(s.estimated_arrival) : addDays(parseISO(s.created_at), 30),
        departure: s.planned_departure ? parseISO(s.planned_departure) : null,
      }));

    if (items.length === 0) return { timelineShipments: [], startDate: now, totalDays: 60 };

    const allDates = items.flatMap(i => [i.start, i.end]);
    const earliest = startOfDay(min(allDates));
    const latest = max(allDates);
    const days = Math.max(differenceInDays(latest, earliest) + 7, 30);

    return { timelineShipments: items, startDate: earliest, totalDays: days };
  }, [shipments]);

  if (timelineShipments.length === 0) {
    return <div className="text-center py-16 text-muted-foreground font-mono text-xs">No active shipments to display on timeline.</div>;
  }

  const dayWidth = 24;
  const totalWidth = totalDays * dayWidth;

  // Generate week markers
  const weeks: Date[] = [];
  for (let d = 0; d < totalDays; d += 7) {
    weeks.push(addDays(startDate, d));
  }

  return (
    <div className="overflow-x-auto border rounded-lg bg-card">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border flex" style={{ minWidth: totalWidth + 200 }}>
        <div className="w-[200px] shrink-0 p-2 border-r border-border">
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider">SHIPMENT</span>
        </div>
        <div className="flex relative" style={{ width: totalWidth }}>
          {weeks.map((w, i) => (
            <div key={i} className="border-r border-border/50 text-center" style={{ width: dayWidth * 7, minWidth: dayWidth * 7 }}>
              <span className="font-mono text-[9px] text-muted-foreground">{format(w, "MMM d")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      {timelineShipments.map(s => {
        const ModeIcon = MODE_ICONS[s.mode] || Ship;
        const startOffset = Math.max(0, differenceInDays(s.start, startDate));
        const barLength = Math.max(1, differenceInDays(s.end, s.start));
        const score = s.packet_score ?? 0;
        const barColor = score >= 80 ? "bg-risk-safe/60" : score >= 50 ? "bg-risk-medium/60" : "bg-risk-critical/60";

        return (
          <div key={s.id} className="flex border-b border-border/50 hover:bg-secondary/30 cursor-pointer"
            style={{ minWidth: totalWidth + 200 }} onClick={() => onCardClick(s)}>
            <div className="w-[200px] shrink-0 p-2 border-r border-border flex items-center gap-2">
              <ModeIcon size={11} className="text-muted-foreground" />
              <div className="min-w-0">
                <span className="font-mono text-[10px] font-bold block truncate">{s.shipment_id}</span>
                <span className="font-mono text-[9px] text-muted-foreground">{s.origin_country}→{s.destination_country}</span>
              </div>
            </div>
            <div className="relative h-10" style={{ width: totalWidth }}>
              {/* Bar */}
              <div
                className={`absolute top-2 h-6 rounded ${barColor} border border-border/50`}
                style={{ left: startOffset * dayWidth, width: barLength * dayWidth }}
              >
                <span className="text-[8px] font-mono font-bold text-foreground px-1 leading-6 truncate block">
                  {score}%
                </span>
              </div>
              {/* Departure marker */}
              {s.departure && (
                <div
                  className="absolute top-0 h-full w-px bg-primary"
                  style={{ left: differenceInDays(s.departure, startDate) * dayWidth }}
                  title={`Departure: ${format(s.departure, "MMM d")}`}
                >
                  <div className="absolute -top-0.5 -left-1 w-2 h-2 rounded-full bg-primary" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
