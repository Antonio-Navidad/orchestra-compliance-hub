import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, Ship, Plane, Truck, Layers, Trash2, Copy,
  RotateCcw, Eye, Clock, MapPin, ChevronRight, Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavedRoute } from "@/hooks/useRouteLibrary";

const MODE_ICONS: Record<string, any> = { sea: Ship, air: Plane, land: Truck, multimodal: Layers };
const STATUS_STYLES: Record<string, string> = {
  draft: "border-muted-foreground/30 text-muted-foreground",
  saved: "border-[hsl(var(--risk-safe))]/40 text-[hsl(var(--risk-safe))]",
  archived: "border-primary/40 text-primary",
  deleted: "border-[hsl(var(--risk-critical))]/40 text-[hsl(var(--risk-critical))]",
};

interface RouteHistoryPanelProps {
  routes: SavedRoute[];
  deletedRoutes: SavedRoute[];
  loading: boolean;
  onReview: (route: SavedRoute) => void;
  onLoad: (route: SavedRoute) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export function RouteHistoryPanel({
  routes, deletedRoutes, loading, onReview, onLoad, onDuplicate, onDelete, onRestore, onPermanentDelete,
}: RouteHistoryPanelProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"saved" | "deleted">("saved");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = (tab === "saved" ? routes : deletedRoutes).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.origin_name?.toLowerCase().includes(q) ||
      r.destination_name?.toLowerCase().includes(q) ||
      r.mode.toLowerCase().includes(q)
    );
  });

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-primary" />
          <span className="text-xs font-mono font-bold tracking-wider text-primary">ROUTE LIBRARY</span>
          <Badge variant="outline" className="text-[9px] font-mono ml-auto">{routes.length} saved</Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          <Button
            size="sm" variant={tab === "saved" ? "default" : "ghost"}
            className="h-6 text-[10px] font-mono flex-1"
            onClick={() => setTab("saved")}
          >
            Saved Routes
          </Button>
          <Button
            size="sm" variant={tab === "deleted" ? "default" : "ghost"}
            className={cn("h-6 text-[10px] font-mono flex-1", deletedRoutes.length > 0 && tab !== "deleted" && "text-[hsl(var(--risk-medium))]")}
            onClick={() => setTab("deleted")}
          >
            <Trash2 size={9} className="mr-0.5" />
            Deleted ({deletedRoutes.length})
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search routes..."
            className="h-7 text-[11px] font-mono pl-7 bg-secondary border-border"
          />
        </div>
      </div>

      {/* Route list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading && (
            <p className="text-[10px] font-mono text-muted-foreground text-center py-4">Loading routes...</p>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <Archive size={24} className="mx-auto text-muted-foreground/30" />
              <p className="text-[11px] font-mono text-muted-foreground">
                {tab === "saved" ? "No saved routes yet" : "No deleted routes"}
              </p>
              {tab === "saved" && (
                <p className="text-[10px] font-mono text-muted-foreground/60">
                  Create and save routes from the Route tab
                </p>
              )}
            </div>
          )}

          {filtered.map(route => {
            const ModeIcon = MODE_ICONS[route.mode] || Layers;
            return (
              <div
                key={route.id}
                className="p-2.5 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-colors space-y-1.5 group"
              >
                {/* Row 1: Name + status */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-medium truncate">{route.name || "Unnamed"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ModeIcon size={10} className="text-muted-foreground shrink-0" />
                      <span className="text-[9px] font-mono text-muted-foreground truncate">
                        {route.origin_name || "—"} → {route.destination_name || "—"}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[8px] font-mono shrink-0 ml-1", STATUS_STYLES[route.status] || "")}>
                    {route.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Row 2: Meta */}
                <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground/60">
                  <span>{formatDate(route.updated_at)}</span>
                  {route.is_template && <Badge variant="secondary" className="text-[7px] px-1 py-0">TPL</Badge>}
                  {route.network_route && <Badge variant="secondary" className="text-[7px] px-1 py-0">ROUTED</Badge>}
                </div>

                {/* Row 3: Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {tab === "saved" ? (
                    <>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] font-mono px-2" onClick={() => onReview(route)}>
                        <Eye size={10} className="mr-0.5" /> Review
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] font-mono px-2" onClick={() => onLoad(route)}>
                        <MapPin size={10} className="mr-0.5" /> Load
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] font-mono px-2" onClick={() => onDuplicate(route.id)}>
                        <Copy size={10} className="mr-0.5" /> Dup
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] font-mono px-2 text-[hsl(var(--risk-critical))]" onClick={() => onDelete(route.id)}>
                        <Trash2 size={10} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] font-mono px-2 text-[hsl(var(--risk-safe))]" onClick={() => onRestore(route.id)}>
                        <RotateCcw size={10} className="mr-0.5" /> Restore
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] font-mono px-2" onClick={() => onDuplicate(route.id)}>
                        <Copy size={10} className="mr-0.5" /> Dup
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 text-[10px] font-mono px-2 text-[hsl(var(--risk-critical))]"
                        onClick={() => setConfirmDelete(route.id)}
                      >
                        <Trash2 size={10} className="mr-0.5" /> Perm
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Permanent delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">Permanently Delete Route?</DialogTitle>
            <DialogDescription className="text-xs">
              This cannot be undone. The route will be permanently removed from your library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs font-mono" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" className="text-xs font-mono" onClick={() => {
              if (confirmDelete) onPermanentDelete(confirmDelete);
              setConfirmDelete(null);
            }}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
