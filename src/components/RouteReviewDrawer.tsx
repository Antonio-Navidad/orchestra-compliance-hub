import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Ship, Plane, Truck, Layers, MapPin, Copy, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavedRoute } from "@/hooks/useRouteLibrary";

const MODE_ICONS: Record<string, any> = { sea: Ship, air: Plane, land: Truck, multimodal: Layers };

interface RouteReviewDrawerProps {
  route: SavedRoute;
  onClose: () => void;
  onLoad: (route: SavedRoute) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function RouteReviewDrawer({ route, onClose, onLoad, onDuplicate, onDelete }: RouteReviewDrawerProps) {
  const ModeIcon = MODE_ICONS[route.mode] || Layers;
  const formatDate = (d: string) => new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const nr = route.network_route as any;
  const waypoints = nr?.waypoints?.filter((w: any) => w.type !== "ocean_wp") || [];

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ModeIcon size={14} className="text-primary shrink-0" />
          <span className="text-xs font-mono font-bold truncate">{route.name}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={onClose}>
          <X size={14} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[9px] font-mono", {
              "border-[hsl(var(--risk-safe))]/40 text-[hsl(var(--risk-safe))]": route.status === "saved",
              "border-muted-foreground/30 text-muted-foreground": route.status === "draft",
            })}>
              {route.status.toUpperCase()}
            </Badge>
            {route.is_template && <Badge variant="secondary" className="text-[9px] font-mono">TEMPLATE</Badge>}
            <Badge variant="outline" className="text-[9px] font-mono">{route.mode.toUpperCase()}</Badge>
          </div>

          {/* Origin / Destination */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider">ENDPOINTS</p>
            <div className="flex items-start gap-2 p-2 rounded bg-secondary/50">
              <MapPin size={12} className="text-[hsl(var(--risk-safe))] shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-mono text-muted-foreground">Origin</p>
                <p className="text-xs font-mono">{route.origin_name || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded bg-secondary/50">
              <MapPin size={12} className="text-[hsl(var(--risk-critical))] shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-mono text-muted-foreground">Destination</p>
                <p className="text-xs font-mono">{route.destination_name || "—"}</p>
              </div>
            </div>
          </div>

          {/* Network route info */}
          {nr?.feasible && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono text-muted-foreground tracking-wider">NETWORK ROUTE</p>
              <div className="p-2 rounded bg-[hsl(var(--risk-safe))]/5 border border-[hsl(var(--risk-safe))]/20">
                <p className="text-[10px] font-mono text-[hsl(var(--risk-safe))]">
                  ✓ {waypoints.length} waypoints • ~{(nr.totalDistanceKm || 0).toLocaleString()} km
                </p>
              </div>

              {/* Waypoint list */}
              {waypoints.length > 0 && (
                <div className="space-y-0.5">
                  {waypoints.map((wp: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-1 px-2 rounded bg-secondary/30">
                      <span className="text-[9px] font-mono text-muted-foreground w-4">{i + 1}</span>
                      <span className="text-[10px] font-mono truncate">{wp.name}</span>
                      {wp.isTransfer && (
                        <Badge variant="outline" className="text-[7px] font-mono px-1 py-0 ml-auto border-[hsl(var(--glow-amber))]/30 text-[hsl(var(--glow-amber))]">
                          TRANSFER
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider">DATES</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-1.5 rounded bg-secondary/50">
                <p className="text-[9px] font-mono text-muted-foreground">Created</p>
                <p className="text-[10px] font-mono">{formatDate(route.created_at)}</p>
              </div>
              <div className="p-1.5 rounded bg-secondary/50">
                <p className="text-[9px] font-mono text-muted-foreground">Updated</p>
                <p className="text-[10px] font-mono">{formatDate(route.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {route.notes && (
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-muted-foreground tracking-wider">NOTES</p>
              <p className="text-[11px] font-mono p-2 rounded bg-secondary/50 whitespace-pre-wrap">{route.notes}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer actions */}
      <div className="p-3 border-t border-border space-y-1.5 shrink-0">
        <Button size="sm" className="w-full h-7 text-xs font-mono gap-1" onClick={() => onLoad(route)}>
          <MapPin size={12} /> Load into Planner
        </Button>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs font-mono gap-1" onClick={() => onDuplicate(route.id)}>
            <Copy size={10} /> Duplicate
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs font-mono gap-1 text-[hsl(var(--risk-critical))]" onClick={() => { onDelete(route.id); onClose(); }}>
            <Trash2 size={10} /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
