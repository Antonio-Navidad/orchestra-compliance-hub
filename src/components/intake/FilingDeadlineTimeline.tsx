import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, AlertTriangle } from "lucide-react";
import { format, addDays, subDays, differenceInHours, parseISO } from "date-fns";
import type { TransportMode } from "@/types/orchestra";

interface FilingDeadlineTimelineProps {
  mode: TransportMode;
  originCountry: string;
  destinationCountry: string;
  plannedDeparture: string;
}

interface Deadline {
  label: string;
  date: Date;
  description: string;
}

function getDeadlines(mode: TransportMode, origin: string, dest: string, departure: Date): Deadline[] {
  const deadlines: Deadline[] = [];

  if (dest === "US" || dest === "United States") {
    if (mode === "sea") {
      deadlines.push(
        { label: "ISF 10+2", date: subDays(departure, 1), description: "24hr before vessel departure" },
        { label: "AES Filing", date: subDays(departure, 2), description: "Before vessel departure" },
      );
    }
    if (mode === "air") {
      deadlines.push(
        { label: "AES Filing", date: subDays(departure, 0), description: "Before aircraft departure" },
      );
    }
    deadlines.push(
      { label: "Customs Entry", date: addDays(departure, mode === "sea" ? 15 : 5), description: "Within 15 days of arrival" },
    );
  }

  if (origin === "CN" || origin === "China") {
    deadlines.push(
      { label: "Export Declaration", date: subDays(departure, 1), description: "Before departure from China" },
    );
  }

  if (dest === "CO" || dest === "Colombia") {
    deadlines.push(
      { label: "DIAN Import Declaration", date: addDays(departure, mode === "sea" ? 20 : 10), description: "Within 15 days of arrival" },
    );
  }

  if ((dest && ["DE", "FR", "IT", "NL", "ES", "BE"].includes(dest)) || dest === "EU") {
    if (mode === "sea") {
      deadlines.push(
        { label: "ENS Entry Summary", date: subDays(departure, 1), description: "24hr before loading at port of departure" },
      );
    }
    deadlines.push(
      { label: "Customs Declaration", date: addDays(departure, mode === "sea" ? 14 : 3), description: "Upon arrival at EU port" },
    );
  }

  return deadlines.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function deadlineColor(date: Date): string {
  const hoursAway = differenceInHours(date, new Date());
  if (hoursAway < 24) return "text-risk-critical bg-risk-critical/10 border-risk-critical/30";
  if (hoursAway < 72) return "text-risk-high bg-risk-high/10 border-risk-high/30";
  return "text-risk-safe bg-risk-safe/10 border-risk-safe/30";
}

export function FilingDeadlineTimeline({ mode, originCountry, destinationCountry, plannedDeparture }: FilingDeadlineTimelineProps) {
  const deadlines = useMemo(() => {
    if (!plannedDeparture || !destinationCountry) return [];
    try {
      return getDeadlines(mode, originCountry, destinationCountry, parseISO(plannedDeparture));
    } catch { return []; }
  }, [mode, originCountry, destinationCountry, plannedDeparture]);

  if (deadlines.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border border-border bg-card/50 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <CalendarClock size={12} className="text-primary" />
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">FILING DEADLINES</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {deadlines.map((d, i) => {
          const hoursAway = differenceInHours(d.date, new Date());
          return (
            <div key={i} className={`rounded-md border px-2.5 py-1.5 ${deadlineColor(d.date)}`}>
              <div className="text-[10px] font-mono font-bold">{d.label}</div>
              <div className="text-[10px] font-mono">{format(d.date, "MMM dd, yyyy")}</div>
              <div className="text-[9px] opacity-80">{d.description}</div>
              {hoursAway < 24 && hoursAway > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  <AlertTriangle size={8} />
                  <span className="text-[9px] font-bold">{Math.round(hoursAway)}h left</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
