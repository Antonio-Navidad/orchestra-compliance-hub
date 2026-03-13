import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Map, Eye, EyeOff, Shield, Ship, Plane, Truck, Layers,
  AlertTriangle, Cloud, Zap, Plus, Save, Navigation, Lock, X,
  ChevronRight, Globe, Anchor, MapPin
} from "lucide-react";

interface RouteWaypoint {
  id: string;
  label: string;
  type: "origin" | "transit" | "handoff" | "refuel" | "destination";
  riskLevel: "safe" | "caution" | "high";
  hidden: boolean;
  notes: string;
}

interface RouteProfile {
  id: string;
  name: string;
  waypoints: RouteWaypoint[];
  mode: string;
  sensitivity: string;
}

const MOCK_WAYPOINTS: RouteWaypoint[] = [
  { id: "1", label: "Warehouse Alpha", type: "origin", riskLevel: "safe", hidden: false, notes: "" },
  { id: "2", label: "Port Transit X", type: "transit", riskLevel: "caution", hidden: true, notes: "High traffic zone" },
  { id: "3", label: "Relay Point R7", type: "handoff", riskLevel: "safe", hidden: true, notes: "" },
  { id: "4", label: "Destination Hub", type: "destination", riskLevel: "safe", hidden: false, notes: "" },
];

export default function CreatorMode() {
  const [layers, setLayers] = useState({ sea: true, air: false, land: true, combined: false });
  const [overlays, setOverlays] = useState({ weather: true, military: false, congestion: true, warnings: true });
  const [sensitivity, setSensitivity] = useState("medium");
  const [hideCounterparties, setHideCounterparties] = useState(true);
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>(MOCK_WAYPOINTS);
  const [privateLabel, setPrivateLabel] = useState("Operation Condor");
  const [routeNotes, setRouteNotes] = useState("");
  const [savedProfiles, setSavedProfiles] = useState<RouteProfile[]>([]);
  const [activeTab, setActiveTab] = useState("map");

  const toggleLayer = (key: keyof typeof layers) => setLayers(p => ({ ...p, [key]: !p[key] }));
  const toggleOverlay = (key: keyof typeof overlays) => setOverlays(p => ({ ...p, [key]: !p[key] }));

  const updateWaypoint = (id: string, field: keyof RouteWaypoint, value: any) => {
    setWaypoints(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const addWaypoint = () => {
    setWaypoints(prev => [...prev, {
      id: crypto.randomUUID(),
      label: `Waypoint ${prev.length + 1}`,
      type: "transit",
      riskLevel: "safe",
      hidden: true,
      notes: "",
    }]);
  };

  const removeWaypoint = (id: string) => setWaypoints(prev => prev.filter(w => w.id !== id));

  const saveProfile = () => {
    const profile: RouteProfile = {
      id: crypto.randomUUID(),
      name: privateLabel || "Unnamed Route",
      waypoints,
      mode: Object.entries(layers).filter(([, v]) => v).map(([k]) => k).join("+"),
      sensitivity,
    };
    setSavedProfiles(prev => [...prev, profile]);
    toast.success("Route profile saved privately");
  };

  const riskColor = (level: string) => {
    if (level === "high") return "text-destructive";
    if (level === "caution") return "text-[hsl(var(--risk-medium))]";
    return "text-[hsl(var(--risk-safe))]";
  };

  const riskBg = (level: string) => {
    if (level === "high") return "bg-destructive/20 border-destructive/40";
    if (level === "caution") return "bg-[hsl(var(--risk-medium))]/10 border-[hsl(var(--risk-medium))]/30";
    return "bg-[hsl(var(--risk-safe))]/10 border-[hsl(var(--risk-safe))]/30";
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2.5rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-primary" />
            <span className="text-xs font-mono font-bold tracking-wider text-primary">CREATOR MODE</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
            PRIVACY-CENTRIC
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={privateLabel}
            onChange={e => setPrivateLabel(e.target.value)}
            className="h-7 w-48 text-xs font-mono bg-secondary border-border"
            placeholder="Private route label…"
          />
          <Button size="sm" variant="outline" className="h-7 text-xs font-mono" onClick={saveProfile}>
            <Save size={12} className="mr-1" /> Save Profile
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel — Controls */}
        <div className="w-72 border-r border-border bg-card/30 overflow-y-auto flex-shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full rounded-none border-b border-border bg-transparent h-9">
              <TabsTrigger value="map" className="text-[10px] font-mono flex-1">LAYERS</TabsTrigger>
              <TabsTrigger value="route" className="text-[10px] font-mono flex-1">ROUTE</TabsTrigger>
              <TabsTrigger value="privacy" className="text-[10px] font-mono flex-1">PRIVACY</TabsTrigger>
            </TabsList>

            <TabsContent value="map" className="flex-1 overflow-y-auto p-3 space-y-4 mt-0">
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">TRANSPORT LAYERS</p>
                {([
                  { key: "sea" as const, icon: Ship, label: "Sea Routes" },
                  { key: "air" as const, icon: Plane, label: "Air Routes" },
                  { key: "land" as const, icon: Truck, label: "Land Routes" },
                  { key: "combined" as const, icon: Layers, label: "Combined" },
                ]).map(({ key, icon: Icon, label }) => (
                  <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Icon size={12} className={layers[key] ? "text-primary" : "text-muted-foreground"} />
                      <span className="text-xs font-mono">{label}</span>
                    </div>
                    <Switch checked={layers[key]} onCheckedChange={() => toggleLayer(key)} className="scale-75" />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">OVERLAYS</p>
                {([
                  { key: "weather" as const, icon: Cloud, label: "Weather" },
                  { key: "military" as const, icon: Shield, label: "Military / Surveillance" },
                  { key: "congestion" as const, icon: AlertTriangle, label: "Congestion" },
                  { key: "warnings" as const, icon: Zap, label: "Warning Zones" },
                ]).map(({ key, icon: Icon, label }) => (
                  <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Icon size={12} className={overlays[key] ? "text-primary" : "text-muted-foreground"} />
                      <span className="text-xs font-mono">{label}</span>
                    </div>
                    <Switch checked={overlays[key]} onCheckedChange={() => toggleOverlay(key)} className="scale-75" />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">SENSITIVITY</p>
                <Select value={sensitivity} onValueChange={setSensitivity}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low — Show More</SelectItem>
                    <SelectItem value="medium">Medium — Balanced</SelectItem>
                    <SelectItem value="high">High — Maximum Privacy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="route" className="flex-1 overflow-y-auto p-3 space-y-3 mt-0">
              <p className="text-[10px] font-mono text-muted-foreground tracking-wider">WAYPOINTS</p>
              {waypoints.map((wp, idx) => (
                <div key={wp.id} className={`p-2 rounded border ${riskBg(wp.riskLevel)} space-y-1.5`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground w-4">{idx + 1}</span>
                      <Input
                        value={wp.label}
                        onChange={e => updateWaypoint(wp.id, "label", e.target.value)}
                        className="h-6 text-xs font-mono bg-transparent border-none p-0 w-32"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateWaypoint(wp.id, "hidden", !wp.hidden)} className="p-0.5">
                        {wp.hidden ? <EyeOff size={11} className="text-muted-foreground" /> : <Eye size={11} className="text-primary" />}
                      </button>
                      {wp.type !== "origin" && wp.type !== "destination" && (
                        <button onClick={() => removeWaypoint(wp.id)} className="p-0.5">
                          <X size={11} className="text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={wp.type} onValueChange={v => updateWaypoint(wp.id, "type", v)}>
                      <SelectTrigger className="h-5 text-[10px] font-mono border-none bg-background/50 w-24 px-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="origin">Origin</SelectItem>
                        <SelectItem value="transit">Transit</SelectItem>
                        <SelectItem value="handoff">Handoff</SelectItem>
                        <SelectItem value="refuel">Refuel</SelectItem>
                        <SelectItem value="destination">Destination</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={wp.riskLevel} onValueChange={v => updateWaypoint(wp.id, "riskLevel", v)}>
                      <SelectTrigger className="h-5 text-[10px] font-mono border-none bg-background/50 w-20 px-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="safe">Safe</SelectItem>
                        <SelectItem value="caution">Caution</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full text-xs font-mono h-7" onClick={addWaypoint}>
                <Plus size={12} className="mr-1" /> Add Waypoint
              </Button>
            </TabsContent>

            <TabsContent value="privacy" className="flex-1 overflow-y-auto p-3 space-y-4 mt-0">
              <div className="space-y-3">
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">PRIVACY CONTROLS</p>

                <div className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/50">
                  <Label className="text-xs font-mono">Hide Counterparties</Label>
                  <Switch checked={hideCounterparties} onCheckedChange={setHideCounterparties} className="scale-75" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground">PRIVATE ROUTE LABEL</Label>
                  <Input
                    value={privateLabel}
                    onChange={e => setPrivateLabel(e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="Internal codename…"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground">ROUTE NOTES (PRIVATE)</Label>
                  <Textarea
                    value={routeNotes}
                    onChange={e => setRouteNotes(e.target.value)}
                    className="text-xs font-mono min-h-[60px] resize-none"
                    placeholder="Private notes about this route…"
                  />
                </div>

                <div className="p-2 rounded bg-primary/5 border border-primary/20">
                  <p className="text-[10px] font-mono text-primary mb-1">🔒 Privacy Status</p>
                  <ul className="space-y-0.5">
                    <li className="text-[10px] text-muted-foreground font-mono">
                      • {hideCounterparties ? "Counterparties hidden" : "Counterparties visible"}
                    </li>
                    <li className="text-[10px] text-muted-foreground font-mono">
                      • {waypoints.filter(w => w.hidden).length}/{waypoints.length} waypoints masked
                    </li>
                    <li className="text-[10px] text-muted-foreground font-mono">
                      • Sensitivity: {sensitivity}
                    </li>
                  </ul>
                </div>
              </div>

              {savedProfiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-wider">SAVED PROFILES</p>
                  {savedProfiles.map(p => (
                    <div key={p.id} className="p-2 rounded bg-secondary/50 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono font-medium">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{p.mode} • {p.waypoints.length} pts</p>
                      </div>
                      <ChevronRight size={12} className="text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Map Area */}
        <div className="flex-1 relative bg-background overflow-hidden">
          {/* Simulated Map */}
          <div className="absolute inset-0 bg-[hsl(222,47%,4%)]">
            {/* Grid overlay */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(hsl(var(--border) / 0.15) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--border) / 0.15) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }} />

            {/* Continents placeholder shapes */}
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
              {/* Americas */}
              <path d="M200 100 Q220 80 240 110 Q260 130 250 180 Q240 220 230 260 Q220 300 210 350 Q200 400 190 420 Q180 380 170 350 Q160 300 170 250 Q180 200 190 150 Z" fill="hsl(var(--primary) / 0.3)" />
              <path d="M210 350 Q230 360 240 400 Q250 450 240 500 Q220 530 200 500 Q190 460 195 420 Z" fill="hsl(var(--primary) / 0.3)" />
              {/* Europe/Africa */}
              <path d="M450 100 Q480 90 510 110 Q530 130 520 170 Q510 200 500 230 Q490 260 480 290 Q470 320 460 280 Q450 240 445 200 Q440 160 445 130 Z" fill="hsl(var(--primary) / 0.3)" />
              <path d="M470 290 Q490 300 500 350 Q510 400 500 450 Q490 480 470 460 Q460 420 465 370 Q468 330 470 290 Z" fill="hsl(var(--primary) / 0.3)" />
              {/* Asia */}
              <path d="M580 80 Q650 70 720 90 Q780 110 820 140 Q840 170 830 200 Q800 230 760 250 Q720 260 680 250 Q640 240 610 220 Q580 200 570 160 Q565 120 580 80 Z" fill="hsl(var(--primary) / 0.3)" />
              {/* Australia */}
              <path d="M750 380 Q790 370 820 390 Q840 410 830 440 Q810 460 780 460 Q760 450 750 430 Q745 410 750 380 Z" fill="hsl(var(--primary) / 0.3)" />
            </svg>

            {/* Route lines */}
            {layers.sea && (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600">
                <path d="M220 280 Q350 200 470 250" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" strokeDasharray="6 4" opacity="0.6" />
                <path d="M470 250 Q600 180 720 200" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" strokeDasharray="6 4" opacity="0.6" />
              </svg>
            )}
            {layers.air && (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600">
                <path d="M230 250 Q400 120 500 160" stroke="hsl(var(--glow-amber))" strokeWidth="1.5" fill="none" strokeDasharray="4 6" opacity="0.5" />
                <path d="M500 160 Q650 100 750 170" stroke="hsl(var(--glow-amber))" strokeWidth="1.5" fill="none" strokeDasharray="4 6" opacity="0.5" />
              </svg>
            )}

            {/* Warning zones */}
            {overlays.warnings && (
              <>
                <div className="absolute rounded-full border-2 border-[hsl(var(--risk-medium))]/40 bg-[hsl(var(--risk-medium))]/10 animate-pulse" style={{ left: '38%', top: '35%', width: 60, height: 60, transform: 'translate(-50%,-50%)' }} />
                <div className="absolute rounded-full border-2 border-destructive/40 bg-destructive/10 animate-pulse" style={{ left: '62%', top: '25%', width: 45, height: 45, transform: 'translate(-50%,-50%)' }} />
              </>
            )}

            {/* Congestion indicators */}
            {overlays.congestion && (
              <>
                <div className="absolute" style={{ left: '46%', top: '40%' }}>
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--risk-medium))] animate-pulse" />
                </div>
                <div className="absolute" style={{ left: '72%', top: '32%' }}>
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--risk-high))] animate-pulse" />
                </div>
              </>
            )}

            {/* Waypoint markers */}
            {waypoints.map((wp, idx) => {
              const positions = [
                { left: '21%', top: '45%' },
                { left: '40%', top: '38%' },
                { left: '58%', top: '32%' },
                { left: '75%', top: '35%' },
                { left: '30%', top: '55%' },
                { left: '50%', top: '50%' },
              ];
              const pos = positions[idx % positions.length];
              return (
                <div key={wp.id} className="absolute group" style={{ ...pos, transform: 'translate(-50%,-50%)' }}>
                  <div className={`relative flex items-center justify-center w-7 h-7 rounded-full border-2 ${
                    wp.riskLevel === "high" ? "border-destructive bg-destructive/20" :
                    wp.riskLevel === "caution" ? "border-[hsl(var(--risk-medium))] bg-[hsl(var(--risk-medium))]/20" :
                    "border-primary bg-primary/20"
                  }`}>
                    {wp.type === "origin" ? <MapPin size={12} /> :
                     wp.type === "destination" ? <Navigation size={12} /> :
                     wp.type === "handoff" ? <Globe size={12} /> :
                     <Anchor size={12} />}
                    {wp.hidden && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-muted flex items-center justify-center">
                        <EyeOff size={7} />
                      </div>
                    )}
                  </div>
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-card/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono border border-border opacity-0 group-hover:opacity-100 transition-opacity">
                    {hideCounterparties && wp.hidden ? "••••••" : wp.label}
                  </div>
                </div>
              );
            })}

            {/* Weather overlay indicator */}
            {overlays.weather && (
              <div className="absolute top-3 right-3 bg-card/80 backdrop-blur rounded px-2 py-1 border border-border flex items-center gap-1.5">
                <Cloud size={12} className="text-primary" />
                <span className="text-[10px] font-mono text-muted-foreground">Weather: Clear</span>
              </div>
            )}

            {/* Military overlay indicator */}
            {overlays.military && (
              <div className="absolute top-10 right-3 bg-card/80 backdrop-blur rounded px-2 py-1 border border-border flex items-center gap-1.5">
                <Shield size={12} className="text-[hsl(var(--risk-medium))]" />
                <span className="text-[10px] font-mono text-muted-foreground">2 surveillance zones</span>
              </div>
            )}
          </div>

          {/* Bottom route summary */}
          <div className="absolute bottom-0 left-0 right-0 bg-card/90 backdrop-blur border-t border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground">ROUTE</p>
                  <p className="text-xs font-mono font-medium">{privateLabel || "Unnamed Route"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground">WAYPOINTS</p>
                  <p className="text-xs font-mono">{waypoints.length} ({waypoints.filter(w => w.hidden).length} masked)</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground">LAYERS</p>
                  <p className="text-xs font-mono">{Object.entries(layers).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground">SENSITIVITY</p>
                  <Badge variant="outline" className={`text-[10px] font-mono ${
                    sensitivity === "high" ? "border-primary text-primary" :
                    sensitivity === "medium" ? "border-[hsl(var(--risk-medium))] text-[hsl(var(--risk-medium))]" :
                    "border-muted-foreground"
                  }`}>{sensitivity.toUpperCase()}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs font-mono h-7" onClick={() => toast.info("AI route analysis coming soon")}>
                  <Zap size={12} className="mr-1" /> AI Recommend
                </Button>
                <Button size="sm" className="text-xs font-mono h-7" onClick={saveProfile}>
                  <Save size={12} className="mr-1" /> Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
