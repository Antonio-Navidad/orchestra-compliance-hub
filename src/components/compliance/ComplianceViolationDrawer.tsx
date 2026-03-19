import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Lightbulb, DollarSign, BarChart3, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CommonViolation } from "@/lib/complianceEngineData";
import { getViolationEducation, type ViolationEducation } from "@/lib/complianceEducationalData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violation: CommonViolation | null;
  index: number;
  countryName: string;
}

const severityColors = { critical: "bg-destructive text-destructive-foreground", high: "bg-amber-500 text-white", medium: "bg-yellow-500 text-white" };
const frequencyLabels = { very_common: "Very Common", common: "Common", occasional: "Occasional" };

export function ComplianceViolationDrawer({ open, onOpenChange, violation, index, countryName }: Props) {
  const navigate = useNavigate();
  if (!violation) return null;
  const edu = getViolationEducation(violation, index, countryName);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <SheetTitle className="text-base">{violation.title}</SheetTitle>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge className={`text-[9px] ${severityColors[edu.severity]}`}>{edu.severity.toUpperCase()}</Badge>
            <Badge variant="outline" className="text-[9px]">
              <DollarSign className="h-3 w-3 mr-0.5" /> Avg fine: {edu.avgFine}
            </Badge>
            <Badge variant="secondary" className="text-[9px]">
              <BarChart3 className="h-3 w-3 mr-0.5" /> {frequencyLabels[edu.frequency]}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5">EXPLANATION</h4>
            <p className="text-sm">{edu.explanation}</p>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-3">
            <h4 className="text-xs font-mono text-amber-600 mb-1 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" /> REAL-WORLD EXAMPLE
            </h4>
            <p className="text-sm">{edu.realExample}</p>
          </div>

          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
            <h4 className="text-xs font-mono text-destructive mb-1">PENALTY STRUCTURE</h4>
            <p className="text-sm">{edu.penaltyStructure}</p>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" /> HOW ORCHESTRA PREVENTS THIS
            </h4>
            <p className="text-sm">{edu.howOrchestraHelps}</p>
          </div>

          <Button size="sm" className="w-full text-xs" onClick={() => { onOpenChange(false); navigate(edu.orchestraFeatureLink); }}>
            Run a check on my shipments
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
