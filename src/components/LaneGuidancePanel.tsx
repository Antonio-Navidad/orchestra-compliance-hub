import { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Shield, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocInfoDrawer } from "@/components/DocInfoDrawer";
import { normalizeDocKey } from "@/lib/documentInfoRegistry";
import type { ResolvedLaneContext } from "@/lib/laneResolver";

interface LaneGuidancePanelProps {
  lane: ResolvedLaneContext;
  mode: string;
  detectedDocTypes: Set<string>;
}

export function LaneGuidancePanel({ lane, mode, detectedDocTypes }: LaneGuidancePanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDocKey, setActiveDocKey] = useState("");

  const openDocInfo = (docKey: string) => {
    setActiveDocKey(normalizeDocKey(docKey));
    setDrawerOpen(true);
  };

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-xs font-mono text-primary">
              LANE REQUIREMENTS — {lane.laneLabel}
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] font-mono">{mode.toUpperCase()}</Badge>
              <Badge variant="outline" className="text-[9px] font-mono">{lane.stageOverlay.label}</Badge>
              {lane.commodityOverlay.id !== "general" && (
                <Badge variant="secondary" className="text-[9px] font-mono">{lane.commodityOverlay.name}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground flex-wrap">
            <span>Export: <strong className="text-foreground">{lane.origin.pack.name}</strong> via {lane.origin.pack.customsDeclarationSystem.name}</span>
            <span>→</span>
            <span>Import: <strong className="text-foreground">{lane.destination.pack.name}</strong> via {lane.destination.pack.customsDeclarationSystem.name}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Required docs with detection status + info buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground mb-1.5">REQUIRED DOCUMENTS</p>
              {lane.requiredDocs.map((doc) => {
                const normalized = doc.toLowerCase().replace(/[^a-z_]/g, "");
                const present = detectedDocTypes.has(normalized);
                return (
                  <div key={doc} className="flex items-center gap-1.5 py-0.5 group">
                    {present
                      ? <CheckCircle size={11} className="text-risk-low shrink-0" />
                      : <XCircle size={11} className="text-risk-high shrink-0" />}
                    <span className="font-mono text-[10px]">{doc.replace(/_/g, " ")}</span>
                    <button
                      onClick={() => openDocInfo(doc)}
                      className="ml-auto opacity-40 group-hover:opacity-100 hover:text-primary transition-opacity duration-150 shrink-0"
                      aria-label={`Info about ${doc.replace(/_/g, " ")}`}
                    >
                      <Info size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div>
              <p className="text-[10px] font-mono text-muted-foreground mb-1.5">FILING REQUIREMENTS</p>
              {lane.filingRequirements.map((f, i) => (
                <p key={i} className="text-[10px] py-0.5 flex items-start gap-1.5">
                  <Shield size={10} className="text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </p>
              ))}
            </div>
          </div>

          {/* Beginner warnings */}
          {lane.beginnerWarnings.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-mono text-risk-medium mb-1">⚠ BEGINNER WARNINGS</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
                {lane.beginnerWarnings.slice(0, 8).map((w, i) => (
                  <p key={i} className="text-[10px] py-0.5 flex items-start gap-1.5">
                    <AlertTriangle size={10} className="text-risk-medium shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
              {lane.beginnerWarnings.length > 8 && (
                <p className="text-[10px] text-muted-foreground mt-1">+{lane.beginnerWarnings.length - 8} more</p>
              )}
            </div>
          )}

          {/* Fine traps */}
          {lane.fineTraps.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-mono text-risk-high mb-1">FINE & DELAY TRAPS</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
                {lane.fineTraps.map((t, i) => (
                  <p key={i} className="text-[10px] py-0.5 flex items-start gap-1.5">
                    <XCircle size={10} className="text-risk-high shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible: broker checkpoints + license triggers */}
          <div className="pt-2 border-t border-border/50 flex gap-6 flex-wrap">
            {lane.brokerCheckpoints.length > 0 && (
              <details className="group flex-1 min-w-[200px]">
                <summary className="text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-foreground select-none">
                  ▸ BROKER CHECKPOINTS ({lane.brokerCheckpoints.length})
                </summary>
                <div className="mt-1 space-y-0.5">
                  {lane.brokerCheckpoints.map((c, i) => (
                    <p key={i} className="text-[10px] py-0.5 flex items-start gap-1.5">
                      <Info size={10} className="text-primary shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </p>
                  ))}
                </div>
              </details>
            )}

            {lane.licenseTriggers.length > 0 && (
              <details className="group flex-1 min-w-[200px]">
                <summary className="text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-foreground select-none">
                  ▸ LICENSE / PERMIT TRIGGERS ({lane.licenseTriggers.length})
                </summary>
                <div className="mt-1 space-y-0.5">
                  {lane.licenseTriggers.map((l, i) => (
                    <p key={i} className="text-[10px] py-0.5 flex items-start gap-1.5">
                      <Shield size={10} className="text-muted-foreground shrink-0 mt-0.5" />
                      <span>{l}</span>
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Source metadata */}
          <div className="pt-2 border-t border-border/50 flex items-center gap-3 flex-wrap text-[9px] font-mono text-muted-foreground">
            <span>Export: {lane.origin.pack.source.authority}</span>
            <span>Import: {lane.destination.pack.source.authority}</span>
            <span className="ml-auto">rules v{lane.rulesVersion}</span>
          </div>
        </CardContent>
      </Card>

      {/* Doc Info Drawer */}
      <DocInfoDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        docKey={activeDocKey}
        lane={lane}
      />
    </>
  );
}
