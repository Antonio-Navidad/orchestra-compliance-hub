import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, AlertTriangle, ListChecks } from "lucide-react";
import type { FilingRequirement } from "@/lib/complianceEngineData";
import { getFilingEducation } from "@/lib/complianceEducationalData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filing: FilingRequirement | null;
  countryName: string;
}

export function ComplianceFilingDrawer({ open, onOpenChange, filing, countryName }: Props) {
  if (!filing) return null;
  const edu = getFilingEducation(filing, countryName);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <SheetTitle className="text-base">{filing.rule}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5">FULL EXPLANATION</h4>
            <p className="text-sm">{edu.fullExplanation}</p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
            <h4 className="text-xs font-mono text-primary mb-1">⏰ DEADLINE — PLAIN ENGLISH</h4>
            <p className="text-sm">{edu.deadlineExplained}</p>
          </div>

          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
            <h4 className="text-xs font-mono text-destructive mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> PENALTY IF LATE OR MISSING
            </h4>
            <p className="text-sm">{edu.penaltyIfLate}</p>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-2 flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" /> STEP-BY-STEP INSTRUCTIONS
            </h4>
            <div className="space-y-2">
              {edu.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-1.5">
            {filing.modes.map(m => (
              <Badge key={m} variant="outline" className="text-[9px] px-1.5 py-0">{m}</Badge>
            ))}
            {filing.directions.map(d => (
              <Badge key={d} variant="secondary" className="text-[9px] px-1.5 py-0">{d}</Badge>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
