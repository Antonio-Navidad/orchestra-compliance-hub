import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, FileText, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { RequiredDocument } from "@/lib/complianceEngineData";
import { getDocumentEducation } from "@/lib/complianceEducationalData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: RequiredDocument | null;
  countryName: string;
}

const modeLabels: Record<string, string> = { air: "✈️ Air Freight", sea: "🚢 Sea Freight", land: "🚛 Land/Road Freight" };
const dirLabels: Record<string, string> = { inbound: "📥 Importing into country", outbound: "📤 Exporting from country" };

export function ComplianceDocumentDrawer({ open, onOpenChange, document, countryName }: Props) {
  const navigate = useNavigate();
  if (!document) return null;
  const edu = getDocumentEducation(document.name, countryName);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <SheetTitle className="text-base">{document.name}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Description */}
          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5">WHAT IS THIS DOCUMENT?</h4>
            <p className="text-sm">{edu.description}</p>
          </div>

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5">WHO CREATES IT?</h4>
            <p className="text-sm">{edu.whoCreatesIt}</p>
          </div>

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5">WHY {countryName.toUpperCase()} REQUIRES IT</h4>
            <p className="text-sm">{edu.whyRequired}</p>
          </div>

          <Separator />

          {/* Modes and directions */}
          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-2">REQUIRED FOR</h4>
            <div className="space-y-1">
              {document.modes.map(m => (
                <div key={m} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>{modeLabels[m]}</span>
                </div>
              ))}
              {document.directions.map(d => (
                <div key={d} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>{dirLabels[d]}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Required fields */}
          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-2">REQUIRED INFORMATION</h4>
            <ul className="space-y-1">
              {edu.requiredFields.map((f, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground text-[10px] font-mono mt-0.5">{i + 1}.</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Top mistakes */}
          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              TOP 3 MISTAKES
            </h4>
            <div className="space-y-2">
              {edu.topMistakes.map((m, i) => (
                <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-md p-2.5">
                  <p className="text-sm">{m}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Penalty */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
            <h4 className="text-xs font-mono text-destructive mb-1">PENALTY IF MISSING OR INCORRECT</h4>
            <p className="text-sm">{edu.penalty}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {edu.templateAvailable && (
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => { onOpenChange(false); navigate("/doc-intel"); }}>
                <FileText className="h-3.5 w-3.5 mr-1.5" /> View Template
              </Button>
            )}
            <Button size="sm" className="text-xs flex-1" onClick={() => { onOpenChange(false); navigate("/doc-intel"); }}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Check My Documents
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
