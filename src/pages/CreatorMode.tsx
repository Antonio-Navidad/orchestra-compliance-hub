import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Eye, EyeOff, Shield, Ship, Plane, Truck, Layers,
  AlertTriangle, Cloud, Zap, Plus, Save, Lock, X, Maximize2, Minimize2,
  ChevronRight, Link2, Route, Eraser, RotateCcw, Clock, Archive,
} from "lucide-react";
import CreatorMap from "@/components/CreatorMap";
import { CheckpointList } from "@/components/handoff/CheckpointList";
import { CheckpointDrawer } from "@/components/handoff/CheckpointDrawer";
import { useHandoffCheckpoints } from "@/hooks/useHandoffCheckpoints";
import { NewRouteBuilder, type NewRouteData } from "@/components/NewRouteBuilder";
import { RouteHistoryPanel } from "@/components/RouteHistoryPanel";
import { RouteReviewDrawer } from "@/components/RouteReviewDrawer";
import { useRouteLibrary, type SavedRoute } from "@/hooks/useRouteLibrary";

interface RouteWaypoint {
  id: string;
  label: string;
  type: "origin" | "transit" | "handoff" | "refuel" | "destination";
  riskLevel: "safe" | "caution" | "high";
  hidden: boolean;
  notes: string;
}

export default function CreatorMode() {
  const [layers, setLayers] = useState({ sea: true, air: false, land: true, combined: false });
  const [overlays, setOverlays] = useState({ weather: true, military: false, congestion: true, warnings: true });
  const [sensitivity, setSensitivity] = useState("medium");
  const [hideCounterparties, setHideCounterparties] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [privateLabel, setPrivateLabel] = useState("Operation Condor");
  const [routeNotes, setRouteNotes] = useState("");
  const [activeTab, setActiveTab] = useState("new-route");
  const [newRouteData, setNewRouteData] = useState<NewRouteData | null>(null);
  const [routeBuilderKey, setRouteBuilderKey] = useState(0); // force remount on reset

  // Route lifecycle
  const library = useRouteLibrary();
  const [reviewRoute, setReviewRoute] = useState<SavedRoute | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "clear" | "reset" | "delete";
    routeId?: string;
  } | null>(null);

  const handoff = useHandoffCheckpoints('SH-2026-CONDOR');

  const toggleLayer = (key: keyof typeof layers) => setLayers(p => ({ ...p, [key]: !p[key] }));
  const toggleOverlay = (key: keyof typeof overlays) => setOverlays(p => ({ ...p, [key]: !p[key] }));

  // ── Route lifecycle actions ───────────────────────────────
  const handleClearRoute = useCallback(() => {
    if (newRouteData?.routeState === "rendered" || newRouteData?.routeState === "ready") {
      setConfirmAction({ type: "clear" });
    } else {
      doClearRoute();
    }
  }, [newRouteData]);

  const doClearRoute = useCallback(() => {
    setNewRouteData(null);
    setConfirmAction(null);
    toast.success("Route cleared from map");
  }, []);

  const handleResetPlanner = useCallback(() => {
    if (newRouteData && (newRouteData.routeState !== "draft" || newRouteData.name)) {
      setConfirmAction({ type: "reset" });
    } else {
      doResetPlanner();
    }
  }, [newRouteData]);

  const doResetPlanner = useCallback(() => {
    setNewRouteData(null);
    setRouteBuilderKey(k => k + 1);
    setPrivateLabel("");
    setRouteNotes("");
    setConfirmAction(null);
    toast.success("Route planner reset");
  }, []);

  const handleSaveBeforeAction = useCallback(async () => {
    if (newRouteData) {
      await library.saveRoute(newRouteData, routeNotes, sensitivity);
    }
    if (confirmAction?.type === "clear") doClearRoute();
    else if (confirmAction?.type === "reset") doResetPlanner();
    setConfirmAction(null);
  }, [newRouteData, confirmAction, routeNotes, sensitivity, library, doClearRoute, doResetPlanner]);

  const handleSaveRoute = useCallback(async () => {
    if (!newRouteData) {
      toast.error("No route to save");
      return;
    }
    await library.saveRoute(newRouteData, routeNotes, sensitivity);
  }, [newRouteData, routeNotes, sensitivity, library]);

  const handleLoadRoute = useCallback((route: SavedRoute) => {
    // Reconstruct NewRouteData from saved route
    const loaded: NewRouteData = {
      id: route.id,
      name: route.name,
      isTemplate: route.is_template,
      segments: Array.isArray(route.segments) ? route.segments : [],
      status: "draft",
      routeState: route.network_route ? "rendered" : "draft",
      networkRoute: route.network_route || undefined,
    };
    setNewRouteData(loaded);
    setPrivateLabel(route.name);
    setRouteNotes(route.notes || "");
    setSensitivity(route.sensitivity || "medium");
    setActiveTab("new-route");
    setReviewRoute(null);
    toast.success(`Loaded "${route.name}" into planner`);
  }, []);

  const handleDeleteRoute = useCallback((id: string) => {
    setConfirmAction({ type: "delete", routeId: id });
  }, []);

  const doDeleteRoute = useCallback(() => {
    if (confirmAction?.routeId) {
      library.softDelete(confirmAction.routeId);
    }
    setConfirmAction(null);
  }, [confirmAction, library]);

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

  const riskBg = (level: string) => {
    if (level === "high") return "bg-destructive/20 border-destructive/40";
    if (level === "caution") return "bg-[hsl(var(--risk-medium))]/10 border-[hsl(var(--risk-medium))]/30";
    return "bg-[hsl(var(--risk-safe))]/10 border-[hsl(var(--risk-safe))]/30";
  };

  const hasUnsavedRoute = newRouteData && newRouteData.routeState !== "draft";

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-[100] bg-background' : 'h-[calc(100vh-2.5rem)]'}`}>
      {/* Top Bar */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-primary" />
              <span className="text-xs font-mono font-bold tracking-wider text-primary">CREATOR MODE</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
              STRATEGIC ROUTE LAB
            </Badge>
            {handoff.checkpoints.length > 0 && (
              <Badge variant="outline" className="text-[10px] font-mono border-[hsl(var(--risk-medium))]/30 text-[hsl(var(--risk-medium))]">
                <Link2 size={10} className="mr-1" />
                {handoff.completedCount}/{handoff.checkpoints.length} CUSTODY
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Clear route */}
            {newRouteData && (
              <Button size="sm" variant="ghost" className="h-7 text-xs font-mono gap-1 text-muted-foreground" onClick={handleClearRoute}>
                <Eraser size={12} /> Clear
              </Button>
            )}
            {/* Reset planner */}
            <Button size="sm" variant="ghost" className="h-7 text-xs font-mono gap-1 text-muted-foreground" onClick={handleResetPlanner}>
              <RotateCcw size={12} /> Reset
            </Button>
            {/* New route */}
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs font-mono gap-1"
              onClick={() => { setActiveTab("new-route"); }}
            >
              <Route size={12} /> New Route
            </Button>
            {/* Save */}
            <Button size="sm" variant="outline" className="h-7 text-xs font-mono gap-1" onClick={handleSaveRoute} disabled={!newRouteData}>
              <Save size={12} /> Save
            </Button>
            {/* History */}
            <Button
              size="sm"
              variant={activeTab === "history" ? "default" : "outline"}
              className="h-7 text-xs font-mono gap-1"
              onClick={() => setActiveTab("history")}
            >
              <Clock size={12} /> Library
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setIsFullscreen(true)} title="Fullscreen map">
              <Maximize2 size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left control panel */}
        {!isFullscreen && (
          <div className="w-72 border-r border-border bg-card/30 overflow-hidden shrink-0 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="w-full rounded-none border-b border-border bg-transparent h-9 shrink-0">
                <TabsTrigger value="new-route" className="text-[10px] font-mono flex-1">
                  <Route size={10} className="mr-0.5" /> ROUTE
                </TabsTrigger>
                <TabsTrigger value="history" className="text-[10px] font-mono flex-1 relative">
                  <Clock size={10} className="mr-0.5" /> LIBRARY
                  {library.routes.length > 0 && (
                    <span className="ml-0.5 text-[8px]">({library.routes.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="map" className="text-[10px] font-mono flex-1">LAYERS</TabsTrigger>
                <TabsTrigger value="custody" className="text-[10px] font-mono flex-1 relative">
                  CUSTODY
                  {handoff.checkpoints.some(c => c.status.startsWith('awaiting')) && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[hsl(var(--risk-medium))]" />
                  )}
                </TabsTrigger>
              </TabsList>

              {/* NEW ROUTE TAB */}
              <TabsContent value="new-route" className="flex-1 overflow-hidden mt-0">
                <NewRouteBuilder
                  key={routeBuilderKey}
                  onRouteChange={setNewRouteData}
                  onRouteGenerate={setNewRouteData}
                  onClose={() => setActiveTab("map")}
                />
              </TabsContent>

              {/* ROUTE LIBRARY TAB */}
              <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
                <RouteHistoryPanel
                  routes={library.routes}
                  deletedRoutes={library.deletedRoutes}
                  loading={library.loading}
                  onReview={setReviewRoute}
                  onLoad={handleLoadRoute}
                  onDuplicate={library.duplicateRoute}
                  onDelete={handleDeleteRoute}
                  onRestore={library.restoreRoute}
                  onPermanentDelete={library.permanentDelete}
                />
              </TabsContent>

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

                {/* Privacy controls inline */}
                <div className="space-y-3">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-wider">PRIVACY</p>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/50">
                    <Label className="text-xs font-mono">Hide Counterparties</Label>
                    <Switch checked={hideCounterparties} onCheckedChange={setHideCounterparties} className="scale-75" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-mono text-muted-foreground">ROUTE NOTES (PRIVATE)</Label>
                    <Textarea
                      value={routeNotes}
                      onChange={e => setRouteNotes(e.target.value)}
                      className="text-xs font-mono min-h-[60px] resize-none"
                      placeholder="Private notes…"
                    />
                  </div>
                </div>
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
            </Tabs>
          </div>
        )}

        {/* RIGHT MAP REGION */}
        <div className="flex-1 min-h-0 relative overflow-hidden bg-[#06111f]">
          <div className="absolute inset-0">
            <CreatorMap
              layers={layers}
              overlays={overlays}
              sensitivity={sensitivity}
              hideCounterparties={hideCounterparties}
              checkpoints={handoff.checkpoints}
              onCheckpointClick={handoff.openCheckpoint}
              showDebug={false}
              userRoute={newRouteData}
            />
          </div>

          {/* Route Review Drawer */}
          {reviewRoute && (
            <div className="absolute top-0 right-0 bottom-0 z-30">
              <RouteReviewDrawer
                route={reviewRoute}
                onClose={() => setReviewRoute(null)}
                onLoad={handleLoadRoute}
                onDuplicate={library.duplicateRoute}
                onDelete={handleDeleteRoute}
              />
            </div>
          )}

          {/* Checkpoint Drawer */}
          {handoff.drawerOpen && handoff.selected && !reviewRoute && (
            <div className="absolute top-0 right-0 bottom-0 z-30">
              <CheckpointDrawer
                checkpoint={handoff.selected}
                onClose={handoff.closeDrawer}
                onSenderVerify={handoff.submitSenderVerification}
                onReceiverVerify={handoff.submitReceiverVerification}
              />
            </div>
          )}

          {/* Fullscreen exit */}
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

          {/* Bottom dock */}
          {!isFullscreen && (
            <div className="absolute left-0 right-0 bottom-0 z-20 pointer-events-none">
              <div className="mx-0 pointer-events-auto bg-card/90 backdrop-blur border-t border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground">ROUTE</p>
                      <p className="text-xs font-mono font-medium">{newRouteData?.name || privateLabel || "No active route"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground">STATE</p>
                      <Badge variant="outline" className={`text-[9px] font-mono ${
                        newRouteData?.routeState === "rendered" ? "border-[hsl(var(--risk-safe))]/40 text-[hsl(var(--risk-safe))]" :
                        newRouteData?.routeState === "generating" ? "border-primary/40 text-primary" :
                        "border-muted-foreground/30 text-muted-foreground"
                      }`}>
                        {newRouteData?.routeState?.toUpperCase() || "EMPTY"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground">CUSTODY</p>
                      <p className="text-xs font-mono">{handoff.completedCount}/{handoff.checkpoints.length} verified</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground">LIBRARY</p>
                      <p className="text-xs font-mono">{library.routes.length} saved</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {newRouteData && (
                      <Button variant="ghost" size="sm" className="text-xs font-mono h-7 gap-1 text-muted-foreground" onClick={handleClearRoute}>
                        <Eraser size={12} /> Clear
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs font-mono h-7 gap-1" onClick={() => toast.info("AI route analysis coming soon")}>
                      <Zap size={12} /> AI Recommend
                    </Button>
                    <Button size="sm" className="text-xs font-mono h-7 gap-1" onClick={handleSaveRoute} disabled={!newRouteData}>
                      <Save size={12} /> Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">
              {confirmAction?.type === "clear" && "Clear Current Route?"}
              {confirmAction?.type === "reset" && "Reset Route Planner?"}
              {confirmAction?.type === "delete" && "Delete Saved Route?"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {confirmAction?.type === "clear" && "This will remove the rendered route from the map. Your inputs will remain."}
              {confirmAction?.type === "reset" && "This will clear all inputs and return to an empty planning state."}
              {confirmAction?.type === "delete" && "This route will be moved to Recently Deleted and can be restored later."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" size="sm" className="text-xs font-mono" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            {(confirmAction?.type === "clear" || confirmAction?.type === "reset") && hasUnsavedRoute && (
              <Button variant="secondary" size="sm" className="text-xs font-mono gap-1" onClick={handleSaveBeforeAction}>
                <Save size={10} /> Save First
              </Button>
            )}
            <Button
              variant="destructive" size="sm" className="text-xs font-mono"
              onClick={() => {
                if (confirmAction?.type === "clear") doClearRoute();
                else if (confirmAction?.type === "reset") doResetPlanner();
                else if (confirmAction?.type === "delete") doDeleteRoute();
              }}
            >
              {confirmAction?.type === "delete" ? "Delete" : confirmAction?.type === "reset" ? "Reset" : "Clear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
