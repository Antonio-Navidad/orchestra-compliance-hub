import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Trash2, GripVertical, Ship, Plane, Truck, Layers,
  Save, MapPin, ArrowDown, ChevronUp, ChevronDown, Flag,
  CircleDot, Bookmark, Route,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SegmentMode = "land" | "sea" | "air" | "multimodal";

export interface RouteSegmentPoint {
  id: string;
  name: string;
  type: "origin" | "waypoint" | "destination";
  lat?: number;
  lng?: number;
}

export interface RouteSegment {
  id: string;
  from: RouteSegmentPoint;
  to: RouteSegmentPoint;
  mode: SegmentMode;
}

export interface NewRouteData {
  id: string;
  name: string;
  isTemplate: boolean;
  segments: RouteSegment[];
  status: "draft" | "saved";
}

const MODE_CONFIG: Record<SegmentMode, { icon: any; label: string; color: string }> = {
  land: { icon: Truck, label: "Land", color: "text-[hsl(var(--risk-low))]" },
  sea: { icon: Ship, label: "Sea", color: "text-primary" },
  air: { icon: Plane, label: "Air", color: "text-[hsl(var(--risk-medium))]" },
  multimodal: { icon: Layers, label: "Multi", color: "text-[hsl(var(--glow-amber))]" },
};

function createPoint(type: RouteSegmentPoint["type"], name = ""): RouteSegmentPoint {
  return { id: crypto.randomUUID(), name, type };
}

function createSegment(from: RouteSegmentPoint, to: RouteSegmentPoint, mode: SegmentMode = "land"): RouteSegment {
  return { id: crypto.randomUUID(), from, to, mode };
}

interface NewRouteBuilderProps {
  onRouteChange?: (route: NewRouteData | null) => void;
  onClose?: () => void;
}

export function NewRouteBuilder({ onRouteChange, onClose }: NewRouteBuilderProps) {
  const [route, setRoute] = useState<NewRouteData>(() => {
    const origin = createPoint("origin", "");
    const dest = createPoint("destination", "");
    return {
      id: crypto.randomUUID(),
      name: "",
      isTemplate: false,
      segments: [createSegment(origin, dest, "land")],
      status: "draft",
    };
  });

  const updateRoute = useCallback((updater: (prev: NewRouteData) => NewRouteData) => {
    setRoute(prev => {
      const next = updater(prev);
      onRouteChange?.(next);
      return next;
    });
  }, [onRouteChange]);

  const updateSegmentMode = (segId: string, mode: SegmentMode) => {
    updateRoute(prev => ({
      ...prev,
      segments: prev.segments.map(s => s.id === segId ? { ...s, mode } : s),
    }));
  };

  const updatePointName = (segId: string, which: "from" | "to", name: string) => {
    updateRoute(prev => ({
      ...prev,
      segments: prev.segments.map(s =>
        s.id === segId ? { ...s, [which]: { ...s[which], name } } : s
      ),
    }));
  };

  const addSegmentAfter = (index: number) => {
    updateRoute(prev => {
      const segs = [...prev.segments];
      const prevSeg = segs[index];
      const newWaypoint = createPoint("waypoint", "");
      // Split: current segment ends at new waypoint, new segment goes from waypoint to old destination
      const newSeg = createSegment(newWaypoint, prevSeg.to, "land");
      segs[index] = { ...prevSeg, to: newWaypoint };
      segs.splice(index + 1, 0, newSeg);
      return { ...prev, segments: segs };
    });
  };

  const removeSegment = (index: number) => {
    updateRoute(prev => {
      if (prev.segments.length <= 1) return prev;
      const segs = [...prev.segments];
      if (index === 0) {
        // Remove first: next segment's from becomes origin
        segs[1] = { ...segs[1], from: { ...segs[1].from, type: "origin" } };
        segs.splice(0, 1);
      } else {
        // Connect previous segment to this segment's destination
        segs[index - 1] = { ...segs[index - 1], to: segs[index].to };
        segs.splice(index, 1);
      }
      return { ...prev, segments: segs };
    });
  };

  const moveSegment = (index: number, dir: -1 | 1) => {
    updateRoute(prev => {
      const segs = [...prev.segments];
      const newIdx = index + dir;
      if (newIdx < 0 || newIdx >= segs.length) return prev;
      [segs[index], segs[newIdx]] = [segs[newIdx], segs[index]];
      return { ...prev, segments: segs };
    });
  };

  const handleSave = () => {
    if (!route.name.trim()) {
      toast.error("Please name your route");
      return;
    }
    if (!route.segments[0]?.from.name || !route.segments[route.segments.length - 1]?.to.name) {
      toast.error("Please set origin and destination");
      return;
    }
    updateRoute(prev => ({ ...prev, status: "saved" }));
    toast.success(`Route "${route.name}" saved as ${route.isTemplate ? "template" : "draft"}`);
  };

  const allPoints = route.segments.reduce<RouteSegmentPoint[]>((acc, seg, i) => {
    if (i === 0) acc.push(seg.from);
    acc.push(seg.to);
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route size={14} className="text-primary" />
            <span className="text-xs font-mono font-bold tracking-wider text-primary">NEW ROUTE</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] font-mono text-muted-foreground" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
        <Input
          value={route.name}
          onChange={e => updateRoute(prev => ({ ...prev, name: e.target.value }))}
          className="h-7 text-xs font-mono bg-secondary border-border"
          placeholder="Route name (e.g. Shanghai → Bogotá Express)"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark size={10} className="text-muted-foreground" />
            <Label className="text-[10px] font-mono text-muted-foreground">Save as template</Label>
          </div>
          <Switch
            checked={route.isTemplate}
            onCheckedChange={v => updateRoute(prev => ({ ...prev, isTemplate: v }))}
            className="scale-75"
          />
        </div>
      </div>

      {/* Segments */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-2">ROUTE SEGMENTS</p>

        {route.segments.map((seg, idx) => {
          const ModeIcon = MODE_CONFIG[seg.mode].icon;
          const modeColor = MODE_CONFIG[seg.mode].color;
          const isFirst = idx === 0;
          const isLast = idx === route.segments.length - 1;

          return (
            <div key={seg.id} className="space-y-1">
              {/* FROM point (only show for first segment) */}
              {isFirst && (
                <div className="flex items-center gap-2 pl-1">
                  <CircleDot size={12} className="text-[hsl(var(--risk-low))] shrink-0" />
                  <Input
                    value={seg.from.name}
                    onChange={e => updatePointName(seg.id, "from", e.target.value)}
                    className="h-6 text-[11px] font-mono bg-secondary/50 border-border flex-1"
                    placeholder="Origin (city, port, warehouse...)"
                  />
                </div>
              )}

              {/* Segment connector + mode selector */}
              <div className="flex items-center gap-2 ml-[5px]">
                <div className="flex flex-col items-center">
                  <div className={cn("w-0.5 h-3", modeColor, "opacity-50")} style={{ backgroundColor: "currentColor" }} />
                  <ModeIcon size={14} className={cn(modeColor)} />
                  <div className={cn("w-0.5 h-3", modeColor, "opacity-50")} style={{ backgroundColor: "currentColor" }} />
                </div>
                <div className="flex-1 flex items-center gap-1 p-1.5 rounded bg-secondary/30 border border-border/50">
                  <Select value={seg.mode} onValueChange={(v: SegmentMode) => updateSegmentMode(seg.id, v)}>
                    <SelectTrigger className="h-5 text-[10px] font-mono border-none bg-transparent w-24 px-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODE_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          <span className="flex items-center gap-1">
                            <v.icon size={10} /> {v.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-0.5 ml-auto">
                    <Button
                      variant="ghost" size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => moveSegment(idx, -1)}
                      disabled={isFirst}
                    >
                      <ChevronUp size={10} />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => moveSegment(idx, 1)}
                      disabled={isLast}
                    >
                      <ChevronDown size={10} />
                    </Button>
                    {route.segments.length > 1 && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSegment(idx)}
                      >
                        <Trash2 size={10} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* TO point */}
              <div className="flex items-center gap-2 pl-1">
                {isLast ? (
                  <Flag size={12} className="text-primary shrink-0" />
                ) : (
                  <MapPin size={12} className="text-muted-foreground shrink-0" />
                )}
                <Input
                  value={seg.to.name}
                  onChange={e => updatePointName(seg.id, "to", e.target.value)}
                  className="h-6 text-[11px] font-mono bg-secondary/50 border-border flex-1"
                  placeholder={isLast ? "Final destination..." : "Waypoint (port, hub, border...)"}
                />
              </div>

              {/* Add waypoint between segments */}
              {!isLast && (
                <div className="flex justify-center py-0.5">
                  <div className="w-0.5 h-2 bg-muted-foreground/20" />
                </div>
              )}

              {/* Add segment button */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[9px] font-mono text-muted-foreground/60 hover:text-primary"
                  onClick={() => addSegmentAfter(idx)}
                >
                  <Plus size={10} className="mr-0.5" /> Add Stop
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary + Save */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {route.segments.map((seg) => {
            const cfg = MODE_CONFIG[seg.mode];
            const Icon = cfg.icon;
            return (
              <Badge key={seg.id} variant="outline" className={cn("text-[9px] font-mono gap-1", cfg.color)}>
                <Icon size={8} /> {cfg.label}
              </Badge>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span>{allPoints.length} stops</span>
          <span>•</span>
          <span>{route.segments.length} segments</span>
          <span>•</span>
          <span>{route.isTemplate ? "Template" : "One-time"}</span>
        </div>
        <Button className="w-full h-8 text-xs font-mono gap-1" onClick={handleSave}>
          <Save size={12} /> Save Route
        </Button>
      </div>
    </div>
  );
}
