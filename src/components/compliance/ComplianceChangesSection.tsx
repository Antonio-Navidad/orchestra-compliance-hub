import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CalendarDays } from "lucide-react";
import type { CountryComplianceProfile } from "@/lib/complianceEngineData";

const impactColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-amber-500 text-white",
  low: "bg-muted text-muted-foreground",
};

export function ComplianceChangesSection({ profile }: { profile: CountryComplianceProfile }) {
  if (profile.regulatoryChanges.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-mono">No recent regulatory changes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-muted-foreground">
        REGULATORY UPDATES — LAST 90 DAYS
      </p>
      {profile.regulatoryChanges.map((change, i) => (
        <Card key={i}>
          <CardContent className="py-3 flex items-start gap-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium">{change.title}</p>
                <Badge className={`text-[9px] ${impactColors[change.impact]}`}>
                  {change.impact} impact
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{change.description}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{change.date}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
