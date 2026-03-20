import { SHIPMENT_MODES, SHIPMENT_MODE_GROUPS, type ShipmentModeId, type ShipmentModeGroup } from "@/lib/shipmentModes";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Props {
  selected: ShipmentModeId;
  onSelect: (mode: ShipmentModeId) => void;
}

export function ShipmentModeSelector({ selected, onSelect }: Props) {
  const modesByGroup = (group: ShipmentModeGroup) =>
    SHIPMENT_MODES.filter((m) => m.group === group && m.id !== 'us_export');

  return (
    <div className="space-y-4">
      {SHIPMENT_MODE_GROUPS.map((group) => {
        const modes = modesByGroup(group.key);
        if (modes.length === 0) return null;
        return (
          <div key={group.key}>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
              {group.label}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((mode) => {
                const active = selected === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => onSelect(mode.id)}
                    className={cn(
                      "relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                      "hover:border-primary/40 hover:shadow-sm",
                      "active:scale-[0.98]",
                      active
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{mode.icon}</span>
                      <span
                        className={cn(
                          "text-sm font-semibold leading-tight",
                          active ? "text-primary" : "text-foreground"
                        )}
                      >
                        {mode.label}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {mode.description}
                    </p>
                    {active && (
                      <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
