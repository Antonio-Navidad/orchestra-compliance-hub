import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Radio, Eye, EyeOff, Plus } from "lucide-react";
import { useWatchMode } from "@/hooks/useWatchMode";
import WatchMap from "@/components/watch/WatchMap";
import { WatchSidebar } from "@/components/watch/WatchSidebar";
import { ShipmentDetailPanel } from "@/components/watch/ShipmentDetailPanel";
import { Link } from "react-router-dom";

export default function WatchMode() {
  const wm = useWatchMode();
  const [privacyMode, setPrivacyMode] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-2.5rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-primary" />
            <span className="text-xs font-mono font-bold tracking-wider text-primary">MULTI-SHIPMENT WATCH</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
            {wm.totalWatched} TRACKED
          </Badge>
          {wm.totalAlerts > 0 && (
            <Badge variant="destructive" className="text-[10px] font-mono">
              {wm.totalAlerts} ALERTS
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/intake">
            <Button variant="outline" size="sm" className="h-7 text-[10px] font-mono gap-1">
              <Plus size={11} /> Add Shipment
            </Button>
          </Link>
          <div className="flex items-center gap-1.5">
            {privacyMode ? <EyeOff size={12} className="text-primary" /> : <Eye size={12} className="text-muted-foreground" />}
            <span className="text-[10px] font-mono text-muted-foreground">Privacy</span>
            <Switch checked={privacyMode} onCheckedChange={setPrivacyMode} className="scale-75" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <WatchSidebar
          shipments={wm.shipments}
          pinned={wm.pinned}
          needsAttention={wm.needsAttention}
          selectedId={wm.selectedId}
          onSelect={wm.setSelectedId}
          sortBy={wm.sortBy}
          onSortChange={wm.setSortBy}
          statusFilter={wm.statusFilter}
          onStatusFilter={wm.setStatusFilter}
          modeFilter={wm.modeFilter}
          onModeFilter={wm.setModeFilter}
          onTogglePin={wm.togglePin}
          onRemove={wm.removeFromWatch}
          totalAlerts={wm.totalAlerts}
          simulationActive={wm.simulationActive}
          onToggleSimulation={() => wm.setSimulationActive(!wm.simulationActive)}
        />

        {/* Map */}
        <div className="flex-1 relative bg-background overflow-hidden">
          <WatchMap
            shipments={wm.shipments}
            selectedId={wm.selectedId}
            onSelect={wm.setSelectedId}
            privacyMode={privacyMode}
          />

          {/* Detail panel */}
          {wm.selected && (
            <ShipmentDetailPanel
              shipment={wm.selected}
              onClose={() => wm.setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
