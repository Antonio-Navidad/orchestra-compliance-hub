import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, ShieldCheck, Zap, Search } from "lucide-react";
import type { CountryComplianceProfile } from "@/lib/complianceEngineData";
import { getAuthorityEducation } from "@/lib/complianceEducationalData";

type DrawerType = "filing" | "processing" | "contact" | "inspection";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: CountryComplianceProfile;
  drawerType: DrawerType;
}

export function ComplianceAuthorityDrawer({ open, onOpenChange, profile, drawerType }: Props) {
  const edu = getAuthorityEducation(profile.code, profile);

  const renderContent = () => {
    switch (drawerType) {
      case "filing":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-mono text-muted-foreground mb-1.5">WHAT IS {profile.authority.filingSystem.split(' ')[0]}?</h4>
              <p className="text-sm">{edu.filingSystemExplanation}</p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-muted-foreground mb-1.5">HOW TO ACCESS</h4>
              <p className="text-sm">{edu.howToAccess}</p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-muted-foreground mb-1.5">CREDENTIALS NEEDED</h4>
              <p className="text-sm">{edu.credentialsNeeded}</p>
            </div>
            {edu.portalUrl !== "#" && (
              <Button size="sm" variant="outline" className="text-xs w-full" asChild>
                <a href={edu.portalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Official Portal
                </a>
              </Button>
            )}
          </div>
        );
      case "processing":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-mono text-muted-foreground mb-1.5">CURRENT PROCESSING TIME</h4>
              <p className="text-sm font-medium">{profile.authority.processingTime}</p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-muted-foreground mb-2">FACTORS AFFECTING SPEED</h4>
              <ul className="space-y-1.5">
                {edu.processingFactors.map((f, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="text-xs font-mono text-muted-foreground mb-1.5">AEO / TRUSTED TRADER STATUS</h4>
              <p className="text-sm">{edu.aeoExplanation}</p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-muted-foreground mb-2">HOW TO REDUCE CLEARANCE TIME</h4>
              <ul className="space-y-1.5">
                {edu.howToReduceClearanceTime.map((tip, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      case "contact":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-mono text-muted-foreground mb-1.5">ENFORCEMENT CONTACT</h4>
              <p className="text-sm">{edu.enforcementContact}</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
              <p className="text-xs text-muted-foreground">Use this contact for disputes, inquiries about held cargo, or classification rulings.</p>
            </div>
          </div>
        );
      case "inspection":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-mono text-muted-foreground mb-2">TOP INSPECTION TRIGGERS</h4>
              <div className="space-y-2">
                {edu.topInspectionTriggers.map((trigger, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Search className="h-3 w-3 text-amber-600" />
                    </div>
                    <p className="text-sm">{trigger}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  const titles: Record<DrawerType, string> = {
    filing: `${profile.authority.filingSystem.split('(')[0].trim()} — Filing System`,
    processing: "Processing Time & Speed Factors",
    contact: "Enforcement Contact Information",
    inspection: "What Triggers an Inspection?",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{titles[drawerType]}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  );
}
