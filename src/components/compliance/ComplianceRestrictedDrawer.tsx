import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldAlert, Lock, Award, AlertTriangle, Clock } from "lucide-react";
import { getRestrictedGoodEducation } from "@/lib/complianceEducationalData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string | null;
  type: "licensed" | "prohibited" | "certification";
  countryName: string;
}

const typeIcons = { licensed: ShieldAlert, prohibited: Lock, certification: Award };
const typeLabels = { licensed: "Licensed / Permit Required", prohibited: "Prohibited Good", certification: "Special Certification" };

export function ComplianceRestrictedDrawer({ open, onOpenChange, category, type, countryName }: Props) {
  if (!category) return null;
  const edu = getRestrictedGoodEducation(category, type, countryName);
  const Icon = typeIcons[type];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <SheetTitle className="text-base">{category}</SheetTitle>
          </div>
          <Badge variant={type === "prohibited" ? "destructive" : "outline"} className="text-[9px] w-fit mt-1">
            {typeLabels[type]}
          </Badge>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5">DEFINITION</h4>
            <p className="text-sm">{edu.definition}</p>
          </div>

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5">LICENSE / PERMIT REQUIRED</h4>
            <p className="text-sm">{edu.licenseRequired}</p>
          </div>

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5">HOW TO OBTAIN</h4>
            <p className="text-sm">{edu.howToObtain}</p>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <h4 className="text-[10px] font-mono text-muted-foreground">PROCESSING TIME</h4>
              <p className="text-sm">{edu.processingTime}</p>
            </div>
          </div>

          <Separator />

          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
            <h4 className="text-xs font-mono text-destructive mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> CONSEQUENCES
            </h4>
            <p className="text-sm">{edu.consequences}</p>
          </div>

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5">REGULATORY REFERENCE</h4>
            <p className="text-sm text-muted-foreground">{edu.regulatoryRef}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
