import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, AlertTriangle } from "lucide-react";
import { format, addDays, subDays, subHours, differenceInHours, parseISO } from "date-fns";
import type { TransportMode } from "@/types/orchestra";

interface FilingDeadlineTimelineProps {
  mode: TransportMode;
  originCountry: string;
  destinationCountry: string;
  plannedDeparture: string;
  estimatedArrival?: string;
}

interface Deadline {
  label: string;
  date: Date;
  description: string;
  consequence: string;
}

function getDeadlines(mode: TransportMode, origin: string, dest: string, departure: Date, arrival?: Date): Deadline[] {
  const deadlines: Deadline[] = [];
  const destUpper = (dest || "").toUpperCase().trim();
  const originUpper = (origin || "").toUpperCase().trim();
  const isDestUS = destUpper === "US" || destUpper === "UNITED STATES" || destUpper.includes("UNITED STATES");
  const isDestCO = destUpper === "CO" || destUpper === "COLOMBIA" || destUpper.includes("COLOMBIA");
  const isOriginCN = originUpper === "CN" || origin === "China";
  const isDestEU = ["DE", "FR", "IT", "NL", "ES", "BE"].includes(destUpper) || destUpper === "EU";

  if (isDestUS) {
    if (mode === "sea") {
      deadlines.push({
        label: "ISF 10+2",
        date: subHours(departure, 24),
        description: "Must be filed 24 hours before vessel departure",
        consequence: "Failure to file: $5,000 penalty per violation, cargo hold at port",
      });
    }
    // AES/EEI for exports over $2,500
    deadlines.push({
      label: "AES/EEI Filing",
      date: mode === "sea" ? subDays(departure, 2) : departure,
      description: mode === "sea" ? "Required before vessel departure for exports >$2,500" : "Required before aircraft departure for exports >$2,500",
      consequence: "Failure to file: $10,000 fine per violation, shipment delay",
    });
    if (mode === "sea") {
      // Customs bond must be in place before arrival
      const arrivalDate = arrival || addDays(departure, 15);
      deadlines.push({
        label: "Customs Bond",
        date: subDays(arrivalDate, 1),
        description: "Must be in place before cargo arrives at US port",
        consequence: "No bond = cargo cannot be released, storage fees accumulate daily",
      });
    }
    deadlines.push({
      label: "Customs Entry (CBP 7501)",
      date: addDays(arrival || addDays(departure, mode === "sea" ? 15 : 5), 15),
      description: "Within 15 days of arrival for formal entries",
      consequence: "Late filing: penalties up to 4x duty amount, cargo seizure risk",
    });
  }

  if (isOriginCN) {
    deadlines.push({
      label: "Export Declaration",
      date: subDays(departure, 1),
      description: "Before departure from China",
      consequence: "Shipment will not be released for loading without export clearance",
    });
  }

  if (isDestCO) {
    deadlines.push({
      label: "DIAN Import Declaration",
      date: addDays(arrival || addDays(departure, mode === "sea" ? 20 : 10), 15),
      description: "Within 15 days of arrival in Colombia",
      consequence: "Late filing: fines starting at 5% of CIF value, cargo abandonment risk",
    });
  }

  if (isDestEU) {
    if (mode === "sea") {
      deadlines.push({
        label: "ENS Entry Summary",
        date: subHours(departure, 24),
        description: "24hr before loading at port of departure",
        consequence: "Cargo will be refused loading, vessel departure delay",
      });
    }
    deadlines.push({
      label: "Customs Declaration",
      date: addDays(arrival || addDays(departure, mode === "sea" ? 14 : 3), 0),
      description: "Upon arrival at EU port",
      consequence: "Cargo held in customs, daily storage charges apply",
    });
  }

  return deadlines.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function deadlineColor(date: Date): { text: string; bg: string; border: string; label: string } {
  const hoursAway = differenceInHours(date, new Date());
  if (hoursAway < 0) return { text: "text-risk-critical", bg: "bg-risk-critical/10", border: "border-risk-critical/30", label: "PAST DUE" };
  if (hoursAway < 24) return { text: "text-risk-critical", bg: "bg-risk-critical/10", border: "border-risk-critical/30", label: "" };
  if (hoursAway < 72) return { text: "text-risk-high", bg: "bg-risk-high/10", border: "border-risk-high/30", label: "" };
  return { text: "text-risk-safe", bg: "bg-risk-safe/10", border: "border-risk-safe/30", label: "" };
}

export function FilingDeadlineTimeline({ mode, originCountry, destinationCountry, plannedDeparture, estimatedArrival }: FilingDeadlineTimelineProps) {
  const deadlines = useMemo(() => {
    if (!plannedDeparture || !destinationCountry) return [];
    try {
      const dep = parseISO(plannedDeparture);
      const arr = estimatedArrival ? parseISO(estimatedArrival) : undefined;
      return getDeadlines(mode, originCountry, destinationCountry, dep, arr);
    } catch { return []; }
  }, [mode, originCountry, destinationCountry, plannedDeparture, estimatedArrival]);

  if (deadlines.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border border-border bg-card/50 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <CalendarClock size={12} className="text-primary" />
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">FILING DEADLINES</span>
        <Badge variant="outline" className="text-[8px] ml-auto">{deadlines.length} deadlines</Badge>
      </div>
      <div className="space-y-1.5">
        {deadlines.map((d, i) => {
          const hoursAway = differenceInHours(d.date, new Date());
          const colors = deadlineColor(d.date);
          return (
            <div key={i} className={`rounded-md border px-2.5 py-1.5 ${colors.bg} ${colors.border} ${colors.text}`}>
              <div className="flex items-center gap-1.5">
                {(hoursAway < 48) && <AlertTriangle size={10} className="shrink-0" />}
                <span className="text-[10px] font-mono font-bold">{d.label}</span>
                <span className="text-[10px] font-mono ml-auto">{format(d.date, "MMM dd, yyyy HH:mm")}</span>
                {colors.label && <Badge variant="destructive" className="text-[7px] px-1 py-0 h-3.5">{colors.label}</Badge>}
              </div>
              <div className="text-[9px] opacity-90 mt-0.5">{d.description}</div>
              <div className="text-[8px] opacity-70 mt-0.5 italic">⚠ {d.consequence}</div>
              {hoursAway > 0 && hoursAway < 72 && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  <span className="text-[9px] font-bold">{hoursAway < 24 ? `${Math.round(hoursAway)}h left` : `${Math.round(hoursAway / 24)}d ${Math.round(hoursAway % 24)}h left`}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
