import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, Target, Phone, Search } from "lucide-react";
import type { CountryComplianceProfile } from "@/lib/complianceEngineData";
import { ComplianceAuthorityDrawer } from "./ComplianceAuthorityDrawer";

export function ComplianceAuthoritySection({ profile }: { profile: CountryComplianceProfile }) {
  const { authority } = profile;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<"filing" | "processing" | "contact" | "inspection">("filing");

  const openDrawer = (type: "filing" | "processing" | "contact" | "inspection") => {
    setDrawerType(type);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openDrawer("filing")}>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="text-[10px] font-mono">AUTHORITY</span>
            </div>
            <p className="text-sm font-medium">{authority.name}</p>
            <p className="text-[9px] text-primary font-mono">Click for filing system details →</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openDrawer("filing")}>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-[10px] font-mono">FILING SYSTEM</span>
            </div>
            <p className="text-sm font-medium">{authority.filingSystem}</p>
            <p className="text-[9px] text-primary font-mono">Click for access instructions →</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openDrawer("processing")}>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-[10px] font-mono">PROCESSING TIME</span>
            </div>
            <p className="text-sm font-medium">{authority.processingTime}</p>
            <p className="text-[9px] text-primary font-mono">Click for speed tips →</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openDrawer("contact")}>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span className="text-[10px] font-mono">ENFORCEMENT CONTACT</span>
            </div>
            <p className="text-sm font-medium">Contact Authority</p>
            <p className="text-[9px] text-primary font-mono">Click for contact info →</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4">
          <h3 className="text-xs font-mono text-muted-foreground mb-3">KEY ENFORCEMENT PRIORITIES</h3>
          <div className="space-y-2">
            {authority.enforcementPriorities.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge variant="outline" className="text-[9px] font-mono shrink-0 mt-0.5">
                  {i + 1}
                </Badge>
                <span className="text-sm">{p}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What does this authority inspect most? */}
      <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openDrawer("inspection")}>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-mono text-muted-foreground">WHAT DOES THIS AUTHORITY INSPECT MOST?</h3>
          </div>
          <p className="text-xs text-muted-foreground">Click to see the top inspection triggers for {profile.name}</p>
        </CardContent>
      </Card>

      <ComplianceAuthorityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        profile={profile}
        drawerType={drawerType}
      />
    </div>
  );
}
