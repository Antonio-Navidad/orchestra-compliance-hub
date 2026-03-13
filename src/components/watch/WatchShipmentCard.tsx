import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Pin, PinOff, X, AlertTriangle, Ship, Plane, Truck, Clock } from "lucide-react";
import type { WatchShipment } from "@/lib/watchModeData";

interface Props {
  shipment: WatchShipment;
  isSelected: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onRemove: () => void;
  compact?: boolean;
}

const modeIcon = { sea: Ship, air: Plane, land: Truck };

const statusStyles: Record<string, string> = {
  active: "border-primary/20 text-primary",
  delayed: "border-[hsl(var(--risk-medium))]/30 text-[hsl(var(--risk-medium))]",
  at_risk: "border-[hsl(var(--risk-high))]/30 text-[hsl(var(--risk-high))]",
  blocked: "border-destructive/30 text-destructive",
  completed: "border-[hsl(var(--risk-safe))]/30 text-[hsl(var(--risk-safe))]",
};

export function WatchShipmentCard({ shipment: s, isSelected, onSelect, onTogglePin, onRemove, compact }: Props) {
  const ModeIcon = modeIcon[s.mode];
  const delayStr = s.delay_minutes >= 60 ? `${Math.round(s.delay_minutes / 60)}h` : `${s.delay_minutes}m`;

  return (
    <div
      onClick={onSelect}
      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card/50 hover:bg-card/80"
      }`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
          <span className="text-xs font-mono font-medium truncate">{s.reference}</span>
          <ModeIcon size={11} className="text-muted-foreground shrink-0" />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {s.alert_count > 0 && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
              {s.alert_count}
            </Badge>
          )}
          <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }} className="p-0.5 hover:text-primary">
            {s.pinned ? <Pin size={11} className="text-primary" /> : <PinOff size={11} className="text-muted-foreground" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-0.5 hover:text-destructive">
            <X size={11} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="text-[10px] font-mono text-muted-foreground mb-1.5 truncate">
        {s.origin.name} → {s.destination.name}
      </div>

      <div className="flex items-center gap-2 mb-1.5">
        <Badge variant="outline" className={`text-[9px] font-mono px-1.5 py-0 ${statusStyles[s.status]}`}>
          {s.status.toUpperCase()}
        </Badge>
        {s.delay_minutes > 0 && (
          <span className="text-[10px] font-mono text-[hsl(var(--risk-medium))] flex items-center gap-0.5">
            <Clock size={9} /> +{delayStr}
          </span>
        )}
        {s.risk_score >= 60 && (
          <span className="text-[10px] font-mono text-destructive flex items-center gap-0.5">
            <AlertTriangle size={9} /> {s.risk_score}
          </span>
        )}
      </div>

      <Progress value={s.progress} className="h-1 bg-secondary" />
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] font-mono text-muted-foreground">{Math.round(s.progress)}%</span>
        <span className="text-[9px] font-mono text-muted-foreground">{s.client}</span>
      </div>
    </div>
  );
}
