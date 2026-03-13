import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Ship, Plane, Truck, AlertTriangle, Clock, Shield, MapPin, TrendingUp } from "lucide-react";
import type { WatchShipment } from "@/lib/watchModeData";

interface Props {
  shipment: WatchShipment;
  onClose: () => void;
}

const modeIcon = { sea: Ship, air: Plane, land: Truck };

export function ShipmentDetailPanel({ shipment: s, onClose }: Props) {
  const ModeIcon = modeIcon[s.mode];
  const delayStr = s.delay_minutes >= 60 ? `${Math.round(s.delay_minutes / 60)}h ${s.delay_minutes % 60}m` : `${s.delay_minutes}m`;

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-card/95 backdrop-blur-sm border-l border-border z-20 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="text-xs font-mono font-bold">{s.reference}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Route */}
        <div>
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">ROUTE</p>
          <div className="flex items-center gap-2 text-xs font-mono">
            <MapPin size={11} className="text-primary shrink-0" />
            <span>{s.origin.name}</span>
            <span className="text-muted-foreground">→</span>
            <span>{s.destination.name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <ModeIcon size={11} className="text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground capitalize">{s.mode}</span>
            <span className="text-[10px] font-mono text-muted-foreground">• {s.cargo_summary}</span>
          </div>
        </div>

        {/* Progress */}
        <div>
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">PROGRESS</p>
          <Progress value={s.progress} className="h-2 bg-secondary" />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono text-muted-foreground">{Math.round(s.progress)}%</span>
            <Badge variant="outline" className="text-[9px] font-mono">{s.status.toUpperCase()}</Badge>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "RISK", value: s.risk_score, icon: AlertTriangle, danger: s.risk_score >= 60 },
            { label: "DELAY", value: delayStr, icon: Clock, danger: s.delay_minutes > 360 },
            { label: "CONGESTION", value: s.congestion_score, icon: TrendingUp, danger: s.congestion_score >= 60 },
            { label: "COMPLIANCE", value: s.compliance_score, icon: Shield, danger: s.compliance_score < 70 },
          ].map(m => (
            <div key={m.label} className={`p-2 rounded border ${m.danger ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-secondary/30'}`}>
              <div className="flex items-center gap-1 mb-0.5">
                <m.icon size={10} className={m.danger ? "text-destructive" : "text-muted-foreground"} />
                <span className="text-[9px] font-mono text-muted-foreground">{m.label}</span>
              </div>
              <span className={`text-sm font-mono font-bold ${m.danger ? "text-destructive" : "text-foreground"}`}>
                {m.value}{typeof m.value === 'number' ? '%' : ''}
              </span>
            </div>
          ))}
        </div>

        {/* ETA */}
        <div>
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">ETA</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-muted-foreground">Original</span>
              <span>{new Date(s.eta_original).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-muted-foreground">Current</span>
              <span className={s.delay_minutes > 0 ? "text-[hsl(var(--risk-medium))]" : ""}>
                {new Date(s.eta_current).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {s.alerts.length > 0 && (
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">ALERTS ({s.alerts.length})</p>
            <div className="space-y-1.5">
              {s.alerts.map(a => (
                <div key={a.id} className={`p-2 rounded border text-[10px] font-mono ${
                  a.severity === 'critical' ? 'border-destructive/30 bg-destructive/5 text-destructive' :
                  a.severity === 'warning' ? 'border-[hsl(var(--risk-medium))]/30 bg-[hsl(var(--risk-medium))]/5 text-[hsl(var(--risk-medium))]' :
                  'border-border bg-secondary/30 text-muted-foreground'
                }`}>
                  {a.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client */}
        <div>
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">CLIENT</p>
          <span className="text-xs font-mono">{s.client}</span>
        </div>
      </div>
    </div>
  );
}
