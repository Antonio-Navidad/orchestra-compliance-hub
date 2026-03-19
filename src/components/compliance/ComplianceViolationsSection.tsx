import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { CountryComplianceProfile } from "@/lib/complianceEngineData";

export function ComplianceViolationsSection({ profile }: { profile: CountryComplianceProfile }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-muted-foreground">
        TOP {profile.commonViolations.length} COMPLIANCE RISKS — {profile.name.toUpperCase()}
      </p>
      {profile.commonViolations.map((v, i) => (
        <Card key={i}>
          <CardContent className="py-3 flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-amber-600">{i + 1}</span>
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium">{v.title}</p>
              <p className="text-xs text-muted-foreground">{v.detail}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
