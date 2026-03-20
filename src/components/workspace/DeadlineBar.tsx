import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, ShieldAlert } from "lucide-react";
import type { ShipmentDeadline } from "@/lib/deadlineEngine";
import { formatDeadlineCountdown } from "@/lib/deadlineEngine";

interface Props {
  deadlines: ShipmentDeadline[];
  onClickDeadline: (deadline: ShipmentDeadline) => void;
}

const STATUS_STYLES: Record<string, string> = {
  overdue: 'bg-red-500/10 text-red-600 border-red-500/25 hover:bg-red-500/15',
  urgent: 'bg-red-500/8 text-red-500 border-red-500/20 hover:bg-red-500/12',
  due_soon: 'bg-amber-500/10 text-amber-600 border-amber-500/25 hover:bg-amber-500/15',
  upcoming: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/15',
};

export function DeadlineBar({ deadlines, onClickDeadline }: Props) {
  if (deadlines.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
      <Clock size={11} className="text-muted-foreground shrink-0" />
      {deadlines.map(d => (
        <button
          key={d.id}
          onClick={() => onClickDeadline(d)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
            "border transition-colors active:scale-[0.97] cursor-pointer shrink-0",
            STATUS_STYLES[d.status]
          )}
        >
          {d.status === 'overdue' ? <ShieldAlert size={9} /> : d.status === 'urgent' ? <AlertTriangle size={9} /> : null}
          <span className="font-bold">{d.shortLabel}</span>
          <span className="opacity-80">
            {d.status === 'overdue'
              ? `${Math.abs(d.daysRemaining)}d overdue`
              : d.hoursRemaining < 48
                ? `${d.hoursRemaining}h`
                : `${d.daysRemaining}d`
            }
          </span>
        </button>
      ))}
    </div>
  );
}

// Compact single-line version for sidebar
export function DeadlineTag({ deadline, onClick }: { deadline: ShipmentDeadline; onClick?: () => void }) {
  const isUrgent = deadline.status === 'overdue' || deadline.status === 'urgent';

  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[9px] font-semibold px-1.5 py-0 rounded inline-flex items-center gap-0.5 transition-colors",
        "active:scale-[0.97] cursor-pointer border",
        isUrgent
          ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15"
          : deadline.status === 'due_soon'
            ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/15"
            : "bg-muted text-muted-foreground border-border hover:bg-accent/30"
      )}
    >
      {isUrgent && <AlertTriangle size={8} />}
      {deadline.shortLabel} {deadline.status === 'overdue'
        ? `${Math.abs(deadline.daysRemaining)}d over`
        : deadline.hoursRemaining < 48
          ? `in ${deadline.hoursRemaining}h`
          : `in ${deadline.daysRemaining}d`
      }
    </button>
  );
}
