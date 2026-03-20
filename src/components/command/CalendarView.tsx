import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, getDay, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, Plane, Ship, Truck } from "lucide-react";
import type { CommandShipment } from "./ShipmentCard";

interface CalendarEvent {
  date: Date;
  shipmentId: string;
  type: "departure" | "arrival" | "deadline";
  label: string;
  mode: string;
}

interface Props {
  shipments: CommandShipment[];
  onCardClick: (s: CommandShipment) => void;
}

function generateIcal(events: CalendarEvent[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Orchestra//CommandCenter//EN"];
  events.forEach(e => {
    const dt = format(e.date, "yyyyMMdd");
    lines.push("BEGIN:VEVENT", `DTSTART;VALUE=DATE:${dt}`, `DTEND;VALUE=DATE:${dt}`,
      `SUMMARY:${e.label} - ${e.shipmentId}`, `DESCRIPTION:${e.type} for shipment ${e.shipmentId}`, "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function CalendarView({ shipments, onCardClick }: Props) {
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const events = useMemo(() => {
    const evts: CalendarEvent[] = [];
    shipments.forEach(s => {
      if (s.planned_departure) {
        const d = parseISO(s.planned_departure);
        evts.push({ date: d, shipmentId: s.shipment_id, type: "departure", label: "Departure", mode: s.mode });
        // ISF deadline 24h before
        const isf = new Date(d.getTime() - 24 * 3600000);
        evts.push({ date: isf, shipmentId: s.shipment_id, type: "deadline", label: "ISF Deadline", mode: s.mode });
      }
      if (s.estimated_arrival) {
        evts.push({ date: parseISO(s.estimated_arrival), shipmentId: s.shipment_id, type: "arrival", label: "ETA", mode: s.mode });
      }
    });
    return evts;
  }, [shipments]);

  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const startDay = getDay(start);
  const paddingDays = Array.from({ length: startDay }, (_, i) => null);

  const dayEvents = (d: Date) => events.filter(e => isSameDay(e.date, d));
  const selectedEvents = selectedDay ? dayEvents(selectedDay) : [];

  const exportIcal = () => {
    const blob = new Blob([generateIcal(events)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orchestra-calendar-${format(month, "yyyy-MM")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft size={14} /></Button>
          <span className="font-mono text-sm font-bold">{format(month, "MMMM yyyy")}</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={14} /></Button>
        </div>
        <Button variant="outline" size="sm" className="font-mono text-[10px] gap-1 h-7" onClick={exportIcal}>
          <Download size={10} /> Export iCal
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="bg-secondary/50 p-2 text-center">
            <span className="font-mono text-[9px] text-muted-foreground">{d}</span>
          </div>
        ))}
        {paddingDays.map((_, i) => <div key={`pad-${i}`} className="bg-card min-h-[80px]" />)}
        {days.map(d => {
          const evts = dayEvents(d);
          const isSelected = selectedDay && isSameDay(d, selectedDay);
          const hasMultiple = evts.length > 1;
          return (
            <div
              key={d.toISOString()}
              className={`bg-card min-h-[80px] p-1.5 cursor-pointer hover:bg-secondary/30 transition-colors ${isSelected ? "ring-1 ring-primary bg-primary/5" : ""} ${hasMultiple ? "bg-risk-medium/5" : ""}`}
              onClick={() => setSelectedDay(d)}
            >
              <span className={`font-mono text-[10px] ${isSameDay(d, new Date()) ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {format(d, "d")}
              </span>
              <div className="space-y-0.5 mt-1">
                {evts.slice(0, 3).map((e, i) => {
                  const color = e.type === "deadline" ? "bg-risk-critical/80" : e.type === "departure" ? "bg-primary/80" : "bg-risk-safe/80";
                  return (
                    <div key={i} className={`${color} rounded px-1 py-0.5 truncate`}>
                      <span className="text-[8px] font-mono text-white">{e.label}</span>
                    </div>
                  );
                })}
                {evts.length > 3 && <span className="text-[8px] text-muted-foreground">+{evts.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && selectedEvents.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <span className="font-mono text-xs font-bold">{format(selectedDay, "EEEE, MMMM d, yyyy")}</span>
          {selectedEvents.map((e, i) => {
            const s = shipments.find(sh => sh.shipment_id === e.shipmentId);
            const typeColor = e.type === "deadline" ? "text-risk-critical" : e.type === "departure" ? "text-primary" : "text-risk-safe";
            return (
              <div key={i} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-secondary/30 rounded p-1.5"
                onClick={() => s && onCardClick(s)}>
                <Badge variant="outline" className={`text-[9px] font-mono ${typeColor}`}>{e.type.toUpperCase()}</Badge>
                <span className="font-mono font-bold">{e.shipmentId}</span>
                <span className="text-muted-foreground">{e.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
