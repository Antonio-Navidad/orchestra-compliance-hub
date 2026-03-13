import { useState } from "react";
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
  Eye, EyeOff, Shield, Ship, Plane, Truck, Layers,
  AlertTriangle, Cloud, Zap, Plus, Save, Lock, X, Maximize2, Minimize2,
  ChevronRight, Link2,
} from "lucide-react";
import CreatorMap from "@/components/CreatorMap";
import { CheckpointList } from "@/components/handoff/CheckpointList";
import { CheckpointDrawer } from "@/components/handoff/CheckpointDrawer";
import { useHandoffCheckpoints } from "@/hooks/useHandoffCheckpoints";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [privateLabel, setPrivateLabel] = useState("Operation Condor");
  const [routeNotes, setRouteNotes] = useState("");
  const [savedProfiles, setSavedProfiles] = useState<RouteProfile[]>([]);
  const [activeTab, setActiveTab] = useState("map");

  const handoff = useHandoffCheckpoints('SH-2026-CONDOR');

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

  const riskBg = (level: string) => {
    if (level === "high") return "bg-destructive/20 border-destructive/40";
    if (level === "caution") return "bg-[hsl(var(--risk-medium))]/10 border-[hsl(var(--risk-medium))]/30";
    return "bg-[hsl(var(--risk-safe))]/10 border-[hsl(var(--risk-safe))]/30";
  };

  const handleAddCheckpoint = () => {
    handoff.addCheckpoint({
      name: `Checkpoint ${handoff.checkpoints.length + 1}`,
      type: 'warehouse_transfer',
      lat: 20 + Math.random() * 20,
      lng: -50 + Math.random() * 80,
      address: 'New checkpoint location',
      sender: { name: 'TBD', team: 'TBD', contact: '' },
      receiver: { name: 'TBD', team: 'TBD', contact: '' },
      quantity_expected: 100,
    });
    toast.success("Checkpoint added");
  };

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-[100] bg-background' : 'h-[calc(100vh-2.5rem)]'}`}>
      {/* Top Bar — hidden in fullscreen */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-primary" />
              <span className="text-xs font-mono font-bold tracking-wider text-primary">CREATOR MODE</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
              PRIVACY-CENTRIC
            </Badge>
            {handoff.checkpoints.length > 0 && (
              <Badge variant="outline" className="text-[10px] font-mono border-[hsl(var(--risk-medium))]/30 text-[hsl(var(--risk-medium))]">
                <Link2 size={10} className="mr-1" />
                {handoff.completedCount}/{handoff.checkpoints.length} CUSTODY
              </Badge>
            )}
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
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setIsFullscreen(true)} title="Fullscreen map">
              <Maximize2 size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Body: left control panel + right map region */}
      <div className="flex flex-1 min-h-0">
        {/* Left control panel — hidden in fullscreen */}
        {!isFullscreen && (
          <div className="w-72 border-r border-border bg-card/30 overflow-y-auto shrink-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="w-full rounded-none border-b border-border bg-transparent h-9">
                <TabsTrigger value="map" className="text-[10px] font-mono flex-1">LAYERS</TabsTrigger>
                <TabsTrigger value="route" className="text-[10px] font-mono flex-1">ROUTE</TabsTrigger>
                <TabsTrigger value="custody" className="text-[10px] font-mono flex-1 relative">
                  CUSTODY
                  {handoff.checkpoints.some(c => c.status.startsWith('awaiting')) && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[hsl(var(--risk-medium))]" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="privacy" className="text-[10px] font-mono flex-1">PRIV</TabsTrigger>
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

              <TabsContent value="custody" className="flex-1 overflow-hidden mt-0">
                <CheckpointList
                  checkpoints={handoff.checkpoints}
                  selectedId={handoff.selectedId}
                  progress={handoff.progress}
                  completedCount={handoff.completedCount}
                  currentCustodian={handoff.currentCustodian}
                  onSelect={handoff.openCheckpoint}
                  onAdd={handleAddCheckpoint}
                />
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
        )}

        {/* ═══════════════════════════════════════════════════
            RIGHT MAP REGION — flex-1, min-h-0, relative
            Map fills via absolute inset-0. Bottom dock overlaid.
            ═══════════════════════════════════════════════════ */}
        <div className="flex-1 min-h-0 relative overflow-hidden bg-[#06111f]">
          {/* Absolute map layer */}
          <div className="absolute inset-0">
            <CreatorMap
              layers={layers}
              overlays={overlays}
              sensitivity={sensitivity}
              hideCounterparties={hideCounterparties}
              checkpoints={handoff.checkpoints}
              onCheckpointClick={handoff.openCheckpoint}
              showDebug={true}
            />
          </div>

          {/* Checkpoint Drawer — overlaid */}
          {handoff.drawerOpen && handoff.selected && (
            <div className="absolute top-0 right-0 bottom-0 z-30">
              <CheckpointDrawer
                checkpoint={handoff.selected}
                onClose={handoff.closeDrawer}
                onSenderVerify={handoff.submitSenderVerification}
                onReceiverVerify={handoff.submitReceiverVerification}
              />
            </div>
          )}

          {/* Fullscreen exit button — overlaid */}
          {isFullscreen && (
            <Button
              size="sm"
              variant="outline"
              className="absolute top-3 right-3 z-20 h-8 gap-1.5 text-xs font-mono bg-card/80 backdrop-blur-sm border-border"
              onClick={() => setIsFullscreen(false)}
            >
              <Minimize2 size={14} /> Exit Fullscreen
            </Button>
          )}

          {/* Bottom dock — overlaid on top of map, NOT in flow */}
          {!isFullscreen && (
            <div className="absolute left-0 right-0 bottom-0 z-20 pointer-events-none">
              <div className="mx-0 pointer-events-auto bg-card/90 backdrop-blur border-t border-border p-3">
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
                      <p className="text-[10px] font-mono text-muted-foreground">CUSTODY</p>
                      <p className="text-xs font-mono">{handoff.completedCount}/{handoff.checkpoints.length} verified</p>
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
          )}
        </div>
      </div>
    </div>
  );
}
