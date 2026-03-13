import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Pin, Radio, Filter } from "lucide-react";
import { WatchShipmentCard } from "./WatchShipmentCard";
import type { WatchShipment } from "@/lib/watchModeData";
import type { SortField, StatusFilter, ModeFilter } from "@/hooks/useWatchMode";

interface Props {
  shipments: WatchShipment[];
  pinned: WatchShipment[];
  needsAttention: WatchShipment[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  sortBy: SortField;
  onSortChange: (v: SortField) => void;
  statusFilter: StatusFilter;
  onStatusFilter: (v: StatusFilter) => void;
  modeFilter: ModeFilter;
  onModeFilter: (v: ModeFilter) => void;
  onTogglePin: (id: string) => void;
  onRemove: (id: string) => void;
  totalAlerts: number;
  simulationActive: boolean;
  onToggleSimulation: () => void;
}

export function WatchSidebar({
  shipments, pinned, needsAttention, selectedId, onSelect,
  sortBy, onSortChange, statusFilter, onStatusFilter,
  modeFilter, onModeFilter, onTogglePin, onRemove,
  totalAlerts, simulationActive, onToggleSimulation,
}: Props) {
  return (
    <div className="w-80 border-r border-border bg-card/30 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={14} className={simulationActive ? "text-primary animate-pulse" : "text-muted-foreground"} />
            <span className="text-xs font-mono font-bold tracking-wider text-primary">WATCH MODE</span>
          </div>
          <div className="flex items-center gap-1.5">
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                {totalAlerts} alerts
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] font-mono px-2"
              onClick={onToggleSimulation}
            >
              {simulationActive ? "PAUSE" : "RESUME"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5">
          <Select value={sortBy} onValueChange={v => onSortChange(v as SortField)}>
            <SelectTrigger className="h-6 text-[10px] font-mono flex-1">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risk">Highest Risk</SelectItem>
              <SelectItem value="delay">Greatest Delay</SelectItem>
              <SelectItem value="eta">Nearest ETA</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="mode">Mode</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => onStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-6 text-[10px] font-mono flex-1">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="delayed">Delayed</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={modeFilter} onValueChange={v => onModeFilter(v as ModeFilter)}>
            <SelectTrigger className="h-6 text-[10px] font-mono w-16">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="sea">Sea</SelectItem>
              <SelectItem value="air">Air</SelectItem>
              <SelectItem value="land">Land</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {/* Needs Attention */}
          {needsAttention.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <AlertTriangle size={11} className="text-destructive" />
                <span className="text-[10px] font-mono tracking-wider text-destructive">NEEDS ATTENTION ({needsAttention.length})</span>
              </div>
              {needsAttention.slice(0, 3).map(s => (
                <WatchShipmentCard
                  key={s.id}
                  shipment={s}
                  isSelected={selectedId === s.id}
                  onSelect={() => onSelect(selectedId === s.id ? null : s.id)}
                  onTogglePin={() => onTogglePin(s.id)}
                  onRemove={() => onRemove(s.id)}
                />
              ))}
            </div>
          )}

          {/* Pinned */}
          {pinned.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <Pin size={11} className="text-primary" />
                <span className="text-[10px] font-mono tracking-wider text-primary">PINNED ({pinned.length})</span>
              </div>
              {pinned.filter(s => !needsAttention.find(n => n.id === s.id)).map(s => (
                <WatchShipmentCard
                  key={s.id}
                  shipment={s}
                  isSelected={selectedId === s.id}
                  onSelect={() => onSelect(selectedId === s.id ? null : s.id)}
                  onTogglePin={() => onTogglePin(s.id)}
                  onRemove={() => onRemove(s.id)}
                />
              ))}
            </div>
          )}

          {/* All watched */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1">
              <Filter size={11} className="text-muted-foreground" />
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground">ALL WATCHED ({shipments.length})</span>
            </div>
            {shipments.map(s => (
              <WatchShipmentCard
                key={s.id}
                shipment={s}
                isSelected={selectedId === s.id}
                onSelect={() => onSelect(selectedId === s.id ? null : s.id)}
                onTogglePin={() => onTogglePin(s.id)}
                onRemove={() => onRemove(s.id)}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
