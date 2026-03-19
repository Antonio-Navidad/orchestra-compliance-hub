import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Lock, Award } from "lucide-react";
import type { CountryComplianceProfile } from "@/lib/complianceEngineData";

export function ComplianceRestrictedSection({ profile }: { profile: CountryComplianceProfile }) {
  const { restrictedGoods } = profile;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] font-mono text-muted-foreground">LICENSED / PERMIT-REQUIRED CATEGORIES</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {restrictedGoods.licensedCategories.map((c, i) => (
              <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-destructive" />
            <span className="text-[10px] font-mono text-muted-foreground">PROHIBITED GOODS</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {restrictedGoods.prohibitedCategories.map((c, i) => (
              <Badge key={i} variant="destructive" className="text-xs">{c}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-mono text-muted-foreground">SPECIAL CERTIFICATIONS REQUIRED</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {restrictedGoods.specialCertifications.map((c, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
