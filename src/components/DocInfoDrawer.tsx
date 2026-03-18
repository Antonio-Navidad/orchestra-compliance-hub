import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertTriangle, BookOpen, CheckCircle, FileText, HelpCircle,
  Info, XCircle, ChevronRight, Lightbulb, Shield,
} from "lucide-react";
import { getDocInfo, type DocInfo } from "@/lib/documentInfoRegistry";
import type { ResolvedLaneContext } from "@/lib/laneResolver";
import { useState } from "react";

interface DocInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docKey: string;
  lane: ResolvedLaneContext;
}

export function DocInfoDrawer({ open, onOpenChange, docKey, lane }: DocInfoDrawerProps) {
  const [showTemplate, setShowTemplate] = useState(false);

  const info = getDocInfo(
    docKey,
    lane.originLabel,
    lane.destinationLabel,
    lane.modeOverlay.mode,
  );

  if (!info) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg border-border/50">
          <SheetHeader>
            <SheetTitle className="font-mono text-sm">Document Info</SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            No guidance available for this document type.
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setShowTemplate(false); }}>
      <SheetContent className="w-full sm:max-w-lg border-border/50 p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-5">
            {/* Header */}
            <SheetHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <SheetTitle className="font-mono text-sm">{info.name}</SheetTitle>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[9px] font-mono">{lane.originLabel}</Badge>
                <span className="text-[9px] text-muted-foreground">→</span>
                <Badge variant="outline" className="text-[9px] font-mono">{lane.destinationLabel}</Badge>
                <Badge variant="secondary" className="text-[9px] font-mono">{lane.modeOverlay.mode.toUpperCase()}</Badge>
              </div>
            </SheetHeader>

            {!showTemplate ? (
              <>
                {/* What it is */}
                <section>
                  <h4 className="text-[10px] font-mono text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Info size={10} /> WHAT IT IS
                  </h4>
                  <p className="text-xs leading-relaxed text-foreground/90">{info.whatItIs}</p>
                </section>

                {/* Why required */}
                <section>
                  <h4 className="text-[10px] font-mono text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Shield size={10} /> WHY IT'S REQUIRED
                  </h4>
                  <p className="text-xs leading-relaxed text-foreground/90">{info.whyRequired}</p>
                </section>

                {/* Must include */}
                <section>
                  <h4 className="text-[10px] font-mono text-muted-foreground mb-1.5 flex items-center gap-1">
                    <CheckCircle size={10} /> WHAT MUST BE INCLUDED
                  </h4>
                  <ul className="space-y-1">
                    {info.mustInclude.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <ChevronRight size={10} className="text-primary shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Common mistakes */}
                <section>
                  <h4 className="text-[10px] font-mono text-risk-medium mb-1.5 flex items-center gap-1">
                    <AlertTriangle size={10} /> COMMON MISTAKES
                  </h4>
                  <div className="space-y-1.5">
                    {info.commonMistakes.map((mistake, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs bg-risk-medium/5 border border-risk-medium/20 rounded px-2 py-1.5">
                        <XCircle size={10} className="text-risk-medium shrink-0 mt-0.5" />
                        <span>{mistake}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* CTA */}
                <Button
                  className="w-full mt-2"
                  onClick={() => setShowTemplate(true)}
                >
                  <BookOpen size={14} />
                  View Template & Instructions
                </Button>
              </>
            ) : (
              /* Template & Instructions view */
              <TemplateView info={info} lane={lane} onBack={() => setShowTemplate(false)} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ── Template & Instructions sub-view ──────────────────────────────────

function TemplateView({ info, lane, onBack }: { info: DocInfo; lane: ResolvedLaneContext; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-xs -ml-2">
        ← Back to overview
      </Button>

      {/* Lane delay warnings */}
      {info.laneDelayWarnings.length > 0 && (
        <Card className="border-risk-high/30 bg-risk-high/5">
          <CardContent className="py-3 px-4 space-y-1.5">
            <h4 className="text-[10px] font-mono text-risk-high flex items-center gap-1">
              <AlertTriangle size={10} /> COMMON CAUSES OF DELAY ON THIS LANE
            </h4>
            {info.laneDelayWarnings.map((w, i) => (
              <p key={i} className="text-[11px] leading-relaxed flex items-start gap-1.5">
                <XCircle size={10} className="text-risk-high shrink-0 mt-0.5" />
                <span>{w}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Annotated template fields */}
      <section>
        <h4 className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <FileText size={10} /> ANNOTATED TEMPLATE
        </h4>
        <div className="space-y-2">
          {info.templateFields.map((tf, i) => (
            <div key={i} className="border border-border/50 rounded-md p-3 space-y-1 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{tf.field}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={12} className="text-muted-foreground hover:text-primary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[250px] text-xs">
                    <p className="font-semibold mb-0.5">Where to find it:</p>
                    <p>{tf.whereToFind}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-[11px] text-muted-foreground">{tf.description}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="outline" className="text-[8px] font-mono px-1.5 py-0">FORMAT</Badge>
                <span className="text-[10px] font-mono text-foreground/70">{tf.format}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step-by-step walkthrough */}
      <section>
        <h4 className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <Lightbulb size={10} /> STEP-BY-STEP WALKTHROUGH
        </h4>
        <div className="space-y-2">
          {info.walkthrough.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-xs leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
