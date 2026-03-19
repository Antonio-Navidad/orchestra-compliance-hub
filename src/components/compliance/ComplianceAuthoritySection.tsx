import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, Target } from "lucide-react";
import type { CountryComplianceProfile } from "@/lib/complianceEngineData";

export function ComplianceAuthoritySection({ profile }: { profile: CountryComplianceProfile }) {
  const { authority } = profile;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="text-[10px] font-mono">AUTHORITY</span>
            </div>
            <p className="text-sm font-medium">{authority.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-[10px] font-mono">FILING SYSTEM</span>
            </div>
            <p className="text-sm font-medium">{authority.filingSystem}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-[10px] font-mono">PROCESSING TIME</span>
            </div>
            <p className="text-sm font-medium">{authority.processingTime}</p>
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
    </div>
  );
}
