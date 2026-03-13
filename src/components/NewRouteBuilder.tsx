import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Trash2, Ship, Plane, Truck, Layers,
  Save, MapPin, ChevronUp, ChevronDown, Flag,
  CircleDot, Bookmark, Route, Loader2, Check, AlertTriangle, Zap, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HUBS, type LogisticsHub } from "@/lib/creatorMapData";

export type SegmentMode = "land" | "sea" | "air" | "multimodal";

export type PointStatus = "draft" | "searching" | "confirmed" | "error";

export interface RouteSegmentPoint {
  id: string;
  name: string;
  type: "origin" | "waypoint" | "destination";
  lat?: number;
  lng?: number;
  status: PointStatus;
  resolvedName?: string;
}

export interface RouteSegment {
  id: string;
  from: RouteSegmentPoint;
  to: RouteSegmentPoint;
  mode: SegmentMode;
}

export type RouteState = "draft" | "ready" | "generating" | "rendered" | "invalid";

export interface NewRouteData {
  id: string;
  name: string;
  isTemplate: boolean;
  segments: RouteSegment[];
  status: "draft" | "saved";
  routeState: RouteState;
  feasibilityMessage?: string;
}

const MODE_CONFIG: Record<SegmentMode, { icon: any; label: string; color: string }> = {
  land: { icon: Truck, label: "Land", color: "text-[hsl(var(--risk-low))]" },
  sea: { icon: Ship, label: "Sea", color: "text-primary" },
  air: { icon: Plane, label: "Air", color: "text-[hsl(var(--risk-medium))]" },
  multimodal: { icon: Layers, label: "Multi", color: "text-[hsl(var(--glow-amber))]" },
};

function createPoint(type: RouteSegmentPoint["type"], name = ""): RouteSegmentPoint {
  return { id: crypto.randomUUID(), name, type, status: "draft" };
}

function createSegment(from: RouteSegmentPoint, to: RouteSegmentPoint, mode: SegmentMode = "sea"): RouteSegment {
  return { id: crypto.randomUUID(), from, to, mode };
}

// Local geocoder: fuzzy match against known hubs
function searchLocalHubs(query: string): (LogisticsHub & { matchScore: number })[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return HUBS
    .map(h => {
      const name = h.name.toLowerCase();
      const country = h.country.toLowerCase();
      const region = h.region.toLowerCase();
      let score = 0;
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 80;
      else if (name.includes(q)) score = 60;
      else if (country.includes(q) || region.includes(q)) score = 30;
      return { ...h, matchScore: score };
    })
    .filter(h => h.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);
}

// External geocoder via Nominatim (free, no key)
async function geocodeExternal(query: string): Promise<{ name: string; lat: number; lng: number }[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((r: any) => ({
      name: r.display_name.split(",").slice(0, 2).join(", "),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));
  } catch {
    return [];
  }
}

interface Suggestion {
  name: string;
  lat: number;
  lng: number;
  source: "local" | "external";
  type?: string;
}

// Check if two points likely require ocean crossing
function requiresOceanCrossing(from: RouteSegmentPoint, to: RouteSegmentPoint): boolean {
  if (!from.lng || !to.lng || !from.lat || !to.lat) return false;
  // Simple heuristic: if longitude difference > 30° AND latitudes suggest different continents
  const lngDiff = Math.abs(from.lng - to.lng);
  // Or if one is in Americas and the other in Europe/Asia/Africa
  const fromAmericas = from.lng < -30;
  const toAmericas = to.lng < -30;
  if (fromAmericas !== toAmericas) return true;
  if (lngDiff > 60) return true;
  return false;
}

function checkFeasibility(segments: RouteSegment[]): { feasible: boolean; message?: string; suggestedMode?: SegmentMode } {
  for (const seg of segments) {
    if (seg.from.status !== "confirmed" || seg.to.status !== "confirmed") continue;
    const ocean = requiresOceanCrossing(seg.from, seg.to);
    if (ocean && seg.mode === "land") {
      return {
        feasible: false,
        message: `${seg.from.resolvedName || seg.from.name} → ${seg.to.resolvedName || seg.to.name} crosses an ocean. Land transport is not feasible. Switch to Sea or Multimodal.`,
        suggestedMode: "sea",
      };
    }
  }
  return { feasible: true };
}

interface NewRouteBuilderProps {
  onRouteChange?: (route: NewRouteData | null) => void;
  onRouteGenerate?: (route: NewRouteData) => void;
  onClose?: () => void;
}

export function NewRouteBuilder({ onRouteChange, onRouteGenerate, onClose }: NewRouteBuilderProps) {
  const [route, setRoute] = useState<NewRouteData>(() => {
    const origin = createPoint("origin", "");
    const dest = createPoint("destination", "");
    return {
      id: crypto.randomUUID(),
      name: "",
      isTemplate: false,
      segments: [createSegment(origin, dest, "sea")],
      status: "draft",
      routeState: "draft",
    };
  });

  const [activeSuggestions, setActiveSuggestions] = useState<{ segId: string; which: "from" | "to"; suggestions: Suggestion[] } | null>(null);
  const [searchingFor, setSearchingFor] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const updateRoute = useCallback((updater: (prev: NewRouteData) => NewRouteData) => {
    setRoute(prev => {
      const next = updater(prev);
      onRouteChange?.(next);
      return next;
    });
  }, [onRouteChange]);

  // Check if route is ready to generate
  const allPointsConfirmed = route.segments.every(
    s => s.from.status === "confirmed" && s.to.status === "confirmed"
  );
  const feasibility = checkFeasibility(route.segments);
  const canGenerate = allPointsConfirmed && feasibility.feasible;

  const updateSegmentMode = (segId: string, mode: SegmentMode) => {
    updateRoute(prev => ({
      ...prev,
      segments: prev.segments.map(s => s.id === segId ? { ...s, mode } : s),
      routeState: "draft",
    }));
  };

  const updatePointName = (segId: string, which: "from" | "to", name: string) => {
    updateRoute(prev => ({
      ...prev,
      segments: prev.segments.map(s =>
        s.id === segId ? { ...s, [which]: { ...s[which], name, status: "draft", resolvedName: undefined, lat: undefined, lng: undefined } } : s
      ),
      routeState: "draft",
    }));

    // Debounce autocomplete
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (name.length >= 2) {
        searchLocations(name, segId, which);
      } else {
        setActiveSuggestions(null);
      }
    }, 300);
  };

  const searchLocations = async (query: string, segId: string, which: "from" | "to") => {
    setSearchingFor(`${segId}-${which}`);
    const localResults = searchLocalHubs(query);
    const localSuggestions: Suggestion[] = localResults.map(h => ({
      name: `${h.name}, ${h.country}`,
      lat: h.coordinates[1],
      lng: h.coordinates[0],
      source: "local" as const,
      type: h.type,
    }));

    // Show local results immediately
    if (localSuggestions.length > 0) {
      setActiveSuggestions({ segId, which, suggestions: localSuggestions });
    }

    // Also fetch external
    const extResults = await geocodeExternal(query);
    const extSuggestions: Suggestion[] = extResults.map(r => ({
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      source: "external" as const,
    }));

    const all = [...localSuggestions, ...extSuggestions.filter(e =>
      !localSuggestions.some(l => Math.abs(l.lat - e.lat) < 0.5 && Math.abs(l.lng - e.lng) < 0.5)
    )].slice(0, 8);

    setActiveSuggestions({ segId, which, suggestions: all });
    setSearchingFor(null);
  };

  const selectSuggestion = (segId: string, which: "from" | "to", suggestion: Suggestion) => {
    updateRoute(prev => ({
      ...prev,
      segments: prev.segments.map(s =>
        s.id === segId ? {
          ...s,
          [which]: {
            ...s[which],
            name: suggestion.name,
            resolvedName: suggestion.name,
            lat: suggestion.lat,
            lng: suggestion.lng,
            status: "confirmed" as PointStatus,
          },
        } : s
      ),
      routeState: "draft",
    }));
    setActiveSuggestions(null);
  };

  const confirmTypedLocation = async (segId: string, which: "from" | "to") => {
    const seg = route.segments.find(s => s.id === segId);
    if (!seg) return;
    const point = seg[which];
    if (point.status === "confirmed") return;
    if (!point.name.trim()) return;

    // Try local first
    const local = searchLocalHubs(point.name);
    if (local.length > 0) {
      selectSuggestion(segId, which, {
        name: `${local[0].name}, ${local[0].country}`,
        lat: local[0].coordinates[1],
        lng: local[0].coordinates[0],
        source: "local",
        type: local[0].type,
      });
      return;
    }

    // Try external geocode
    updateRoute(prev => ({
      ...prev,
      segments: prev.segments.map(s =>
        s.id === segId ? { ...s, [which]: { ...s[which], status: "searching" as PointStatus } } : s
      ),
    }));

    const results = await geocodeExternal(point.name);
    if (results.length > 0) {
      selectSuggestion(segId, which, {
        name: results[0].name,
        lat: results[0].lat,
        lng: results[0].lng,
        source: "external",
      });
    } else {
      updateRoute(prev => ({
        ...prev,
        segments: prev.segments.map(s =>
          s.id === segId ? { ...s, [which]: { ...s[which], status: "error" as PointStatus } } : s
        ),
      }));
      toast.error(`Could not find "${point.name}". Try a more specific location.`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, segId: string, which: "from" | "to") => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If suggestions are shown, pick the first
      if (activeSuggestions?.segId === segId && activeSuggestions?.which === which && activeSuggestions.suggestions.length > 0) {
        selectSuggestion(segId, which, activeSuggestions.suggestions[0]);
      } else {
        confirmTypedLocation(segId, which);
      }
    }
    if (e.key === "Escape") {
      setActiveSuggestions(null);
    }
  };

  const handleGenerateRoute = () => {
    if (!canGenerate) return;
    updateRoute(prev => ({ ...prev, routeState: "generating" }));

    // Simulate brief generation delay then mark rendered
    setTimeout(() => {
      updateRoute(prev => {
        const updated = { ...prev, routeState: "rendered" as RouteState };
        onRouteGenerate?.(updated);
        return updated;
      });
      toast.success("Route generated and rendered on map");
    }, 800);
  };

  const handleFixFeasibility = (segId: string, mode: SegmentMode) => {
    updateSegmentMode(segId, mode);
    toast.info(`Switched to ${MODE_CONFIG[mode].label} mode`);
  };

  const addSegmentAfter = (index: number) => {
    updateRoute(prev => {
      const segs = [...prev.segments];
      const prevSeg = segs[index];
      const newWaypoint = createPoint("waypoint", "");
      const newSeg = createSegment(newWaypoint, prevSeg.to, "sea");
      segs[index] = { ...prevSeg, to: newWaypoint };
      segs.splice(index + 1, 0, newSeg);
      return { ...prev, segments: segs, routeState: "draft" };
    });
  };

  const removeSegment = (index: number) => {
    updateRoute(prev => {
      if (prev.segments.length <= 1) return prev;
      const segs = [...prev.segments];
      if (index === 0) {
        segs[1] = { ...segs[1], from: { ...segs[1].from, type: "origin" } };
        segs.splice(0, 1);
      } else {
        segs[index - 1] = { ...segs[index - 1], to: segs[index].to };
        segs.splice(index, 1);
      }
      return { ...prev, segments: segs, routeState: "draft" };
    });
  };

  const handleSave = () => {
    if (!route.name.trim()) {
      toast.error("Please name your route");
      return;
    }
    if (!allPointsConfirmed) {
      toast.error("Please confirm all locations first");
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

  const statusIcon = (status: PointStatus) => {
    switch (status) {
      case "confirmed": return <Check size={10} className="text-[hsl(var(--risk-safe))]" />;
      case "searching": return <Loader2 size={10} className="text-primary animate-spin" />;
      case "error": return <AlertTriangle size={10} className="text-[hsl(var(--risk-critical))]" />;
      default: return null;
    }
  };

  const statusBorder = (status: PointStatus) => {
    switch (status) {
      case "confirmed": return "border-[hsl(var(--risk-safe))]/50 bg-[hsl(var(--risk-safe))]/5";
      case "searching": return "border-primary/50";
      case "error": return "border-[hsl(var(--risk-critical))]/50 bg-[hsl(var(--risk-critical))]/5";
      default: return "border-border";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route size={14} className="text-primary" />
            <span className="text-xs font-mono font-bold tracking-wider text-primary">NEW ROUTE</span>
          </div>
          {route.routeState !== "draft" && (
            <Badge
              variant="outline"
              className={cn("text-[9px] font-mono", {
                "border-[hsl(var(--risk-medium))]/50 text-[hsl(var(--risk-medium))]": route.routeState === "ready",
                "border-primary/50 text-primary": route.routeState === "generating",
                "border-[hsl(var(--risk-safe))]/50 text-[hsl(var(--risk-safe))]": route.routeState === "rendered",
                "border-[hsl(var(--risk-critical))]/50 text-[hsl(var(--risk-critical))]": route.routeState === "invalid",
              })}
            >
              {route.routeState.toUpperCase()}
            </Badge>
          )}
        </div>
        <Input
          value={route.name}
          onChange={e => updateRoute(prev => ({ ...prev, name: e.target.value }))}
          className="h-7 text-xs font-mono bg-secondary border-border"
          placeholder="Route name (e.g. Buenaventura → Rotterdam)"
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
          const segFeasibility = seg.from.status === "confirmed" && seg.to.status === "confirmed"
            ? checkFeasibility([seg])
            : { feasible: true };

          return (
            <div key={seg.id} className="space-y-1">
              {/* FROM point (only show for first segment) */}
              {isFirst && (
                <PointInput
                  point={seg.from}
                  icon={<CircleDot size={12} className="text-[hsl(var(--risk-low))] shrink-0" />}
                  placeholder="Origin (city, port, warehouse...)"
                  onChange={(name) => updatePointName(seg.id, "from", name)}
                  onKeyDown={(e) => handleKeyDown(e, seg.id, "from")}
                  onFocus={() => { if (seg.from.name.length >= 2) searchLocations(seg.from.name, seg.id, "from"); }}
                  onBlur={() => setTimeout(() => setActiveSuggestions(null), 200)}
                  statusIcon={statusIcon(seg.from.status)}
                  statusBorder={statusBorder(seg.from.status)}
                  suggestions={activeSuggestions?.segId === seg.id && activeSuggestions?.which === "from" ? activeSuggestions.suggestions : null}
                  onSelectSuggestion={(s) => selectSuggestion(seg.id, "from", s)}
                  isSearching={searchingFor === `${seg.id}-from`}
                />
              )}

              {/* Segment connector + mode selector */}
              <div className="flex items-center gap-2 ml-[5px]">
                <div className="flex flex-col items-center">
                  <div className={cn("w-0.5 h-3", modeColor, "opacity-50")} style={{ backgroundColor: "currentColor" }} />
                  <ModeIcon size={14} className={cn(modeColor)} />
                  <div className={cn("w-0.5 h-3", modeColor, "opacity-50")} style={{ backgroundColor: "currentColor" }} />
                </div>
                <div className={cn("flex-1 flex items-center gap-1 p-1.5 rounded border", segFeasibility.feasible ? "bg-secondary/30 border-border/50" : "bg-[hsl(var(--risk-critical))]/5 border-[hsl(var(--risk-critical))]/30")}>
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

              {/* Feasibility warning */}
              {!segFeasibility.feasible && (
                <div className="ml-7 p-2 rounded bg-[hsl(var(--risk-critical))]/5 border border-[hsl(var(--risk-critical))]/20">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle size={11} className="text-[hsl(var(--risk-critical))] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-[hsl(var(--risk-critical))] font-mono font-medium">ROUTE NOT FEASIBLE</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{segFeasibility.message}</p>
                      {segFeasibility.suggestedMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-5 text-[9px] font-mono mt-1.5 gap-1 border-[hsl(var(--risk-medium))]/30 text-[hsl(var(--risk-medium))]"
                          onClick={() => handleFixFeasibility(seg.id, segFeasibility.suggestedMode!)}
                        >
                          <Zap size={9} /> Switch to {MODE_CONFIG[segFeasibility.suggestedMode].label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TO point */}
              <PointInput
                point={seg.to}
                icon={isLast
                  ? <Flag size={12} className="text-primary shrink-0" />
                  : <MapPin size={12} className="text-muted-foreground shrink-0" />
                }
                placeholder={isLast ? "Final destination..." : "Waypoint (port, hub, border...)"}
                onChange={(name) => updatePointName(seg.id, "to", name)}
                onKeyDown={(e) => handleKeyDown(e, seg.id, "to")}
                onFocus={() => { if (seg.to.name.length >= 2) searchLocations(seg.to.name, seg.id, "to"); }}
                onBlur={() => setTimeout(() => setActiveSuggestions(null), 200)}
                statusIcon={statusIcon(seg.to.status)}
                statusBorder={statusBorder(seg.to.status)}
                suggestions={activeSuggestions?.segId === seg.id && activeSuggestions?.which === "to" ? activeSuggestions.suggestions : null}
                onSelectSuggestion={(s) => selectSuggestion(seg.id, "to", s)}
                isSearching={searchingFor === `${seg.id}-to`}
              />

              {/* Add segment button */}
              <div className="flex justify-center">
                <Button
                  variant="ghost" size="sm"
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

      {/* Summary + Actions */}
      <div className="p-3 border-t border-border space-y-2">
        {/* Mode badges */}
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

        {/* Stats */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span>{allPoints.length} stops</span>
          <span>•</span>
          <span>{route.segments.length} segments</span>
          <span>•</span>
          <span>{allPoints.filter(p => p.status === "confirmed").length}/{allPoints.length} confirmed</span>
        </div>

        {/* Feasibility warning */}
        {!feasibility.feasible && allPointsConfirmed && (
          <div className="p-1.5 rounded bg-[hsl(var(--risk-critical))]/5 border border-[hsl(var(--risk-critical))]/20">
            <p className="text-[9px] text-[hsl(var(--risk-critical))] font-mono">⚠ {feasibility.message}</p>
          </div>
        )}

        {/* Generate Route CTA */}
        <Button
          className={cn("w-full h-9 text-xs font-mono gap-1.5 transition-all", {
            "bg-primary hover:bg-primary/90": canGenerate,
            "bg-muted text-muted-foreground": !canGenerate && !allPointsConfirmed,
          })}
          onClick={handleGenerateRoute}
          disabled={!canGenerate || route.routeState === "generating"}
        >
          {route.routeState === "generating" ? (
            <><Loader2 size={14} className="animate-spin" /> Generating Route...</>
          ) : route.routeState === "rendered" ? (
            <><Check size={14} /> Route Rendered — Regenerate</>
          ) : (
            <><Zap size={14} /> Generate Route</>
          )}
        </Button>

        {!allPointsConfirmed && (
          <p className="text-[9px] text-muted-foreground font-mono text-center">
            Confirm all locations to enable route generation. Press Enter or select from suggestions.
          </p>
        )}

        {/* Save */}
        {route.routeState === "rendered" && (
          <Button variant="outline" className="w-full h-7 text-xs font-mono gap-1" onClick={handleSave}>
            <Save size={12} /> Save Route
          </Button>
        )}
      </div>
    </div>
  );
}

// Sub-component: location input with autocomplete
function PointInput({
  point,
  icon,
  placeholder,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  statusIcon,
  statusBorder,
  suggestions,
  onSelectSuggestion,
  isSearching,
}: {
  point: RouteSegmentPoint;
  icon: React.ReactNode;
  placeholder: string;
  onChange: (name: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  statusIcon: React.ReactNode;
  statusBorder: string;
  suggestions: Suggestion[] | null;
  onSelectSuggestion: (s: Suggestion) => void;
  isSearching: boolean;
}) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 pl-1">
        {icon}
        <div className={cn("flex items-center gap-1 flex-1 rounded border", statusBorder)}>
          <Input
            value={point.name}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            className={cn("h-6 text-[11px] font-mono bg-transparent border-none flex-1 px-2")}
            placeholder={placeholder}
          />
          <div className="pr-1.5 shrink-0">
            {isSearching ? <Loader2 size={10} className="text-primary animate-spin" /> : statusIcon}
          </div>
        </div>
      </div>

      {/* Autocomplete dropdown */}
      {suggestions && suggestions.length > 0 && (
        <div className="absolute left-7 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              className="w-full px-3 py-1.5 text-left hover:bg-accent/50 transition-colors flex items-center gap-2 border-b border-border/50 last:border-0"
              onMouseDown={(e) => { e.preventDefault(); onSelectSuggestion(s); }}
            >
              <MapPin size={10} className={s.source === "local" ? "text-primary" : "text-muted-foreground"} />
              <div className="min-w-0">
                <p className="text-[11px] font-mono truncate">{s.name}</p>
                {s.type && (
                  <p className="text-[9px] text-muted-foreground font-mono">{s.type} • known hub</p>
                )}
              </div>
              {s.source === "local" && (
                <Badge variant="secondary" className="text-[8px] font-mono px-1 py-0 ml-auto shrink-0">HUB</Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Confirmed location info */}
      {point.status === "confirmed" && point.resolvedName && point.resolvedName !== point.name && (
        <p className="text-[9px] text-[hsl(var(--risk-safe))] font-mono pl-7 mt-0.5">
          ✓ {point.resolvedName}
        </p>
      )}
    </div>
  );
}
