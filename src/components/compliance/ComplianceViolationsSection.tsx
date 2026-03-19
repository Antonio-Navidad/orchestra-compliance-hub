import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, BarChart3 } from "lucide-react";
import type { CountryComplianceProfile, CommonViolation } from "@/lib/complianceEngineData";
import { ComplianceViolationDrawer } from "./ComplianceViolationDrawer";
import { getViolationEducation } from "@/lib/complianceEducationalData";

const severityColors = { critical: "bg-destructive text-destructive-foreground", high: "bg-amber-500 text-white", medium: "bg-yellow-500 text-white" };
const frequencyLabels = { very_common: "Very Common", common: "Common", occasional: "Occasional" };

export function ComplianceViolationsSection({ profile }: { profile: CountryComplianceProfile }) {
  const [selectedViolation, setSelectedViolation] = useState<CommonViolation | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openViolation = (v: CommonViolation, i: number) => {
    setSelectedViolation(v);
    setSelectedIndex(i);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-muted-foreground">
        TOP {profile.commonViolations.length} COMPLIANCE RISKS — {profile.name.toUpperCase()}
        <span className="ml-2 text-primary">Click each for details, examples, and penalties</span>
      </p>
      {profile.commonViolations.map((v, i) => {
        const edu = getViolationEducation(v, i, profile.name);
        return (
          <Card key={i} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openViolation(v, i)}>
            <CardContent className="py-3 flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-amber-600">{i + 1}</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{v.title}</p>
                  <Badge className={`text-[8px] px-1.5 py-0 ${severityColors[edu.severity]}`}>
                    {edu.severity.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{v.detail}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                    <DollarSign className="h-3 w-3" /> {edu.avgFine}
                  </span>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                    <BarChart3 className="h-3 w-3" /> {frequencyLabels[edu.frequency]}
                  </span>
                </div>
              </div>
              <span className="text-[9px] text-primary font-mono shrink-0 mt-1">Details →</span>
            </CardContent>
          </Card>
        );
      })}

      <ComplianceViolationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        violation={selectedViolation}
        index={selectedIndex}
        countryName={profile.name}
      />
    </div>
  );
}
