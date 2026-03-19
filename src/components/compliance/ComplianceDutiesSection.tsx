import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Handshake, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { CountryComplianceProfile } from "@/lib/complianceEngineData";
import { COMPLIANCE_COUNTRIES } from "@/lib/complianceEngineData";

export function ComplianceDutiesSection({ profile }: { profile: CountryComplianceProfile }) {
  const navigate = useNavigate();
  const { dutiesTariffs } = profile;

  const resolvePartnerName = (code: string) => {
    const c = COMPLIANCE_COUNTRIES.find(p => p.code === code);
    return c ? `${c.flag} ${c.name}` : code;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground">TARIFF OVERVIEW</span>
          </div>
          <p className="text-sm">{dutiesTariffs.overview}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Handshake className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground">ACTIVE TRADE AGREEMENTS</span>
          </div>
          <div className="space-y-3">
            {dutiesTariffs.tradeAgreements.map((ta, i) => (
              <div key={i} className="border border-border rounded-md p-3">
                <p className="text-sm font-medium mb-1.5">{ta.name}</p>
                {ta.partners.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {ta.partners.map(p => (
                      <Badge key={p} variant="outline" className="text-[9px]">
                        {resolvePartnerName(p)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground font-mono">Regional bloc agreement</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardContent className="py-3 flex items-center gap-3">
          <Search className="h-4 w-4 text-primary" />
          <div className="flex-1">
            <p className="text-xs font-medium">Look up duty rates by product</p>
            <p className="text-[10px] text-muted-foreground">Use HS Code Assist for country-specific duty rate lookup</p>
          </div>
          <Button size="sm" variant="outline" className="text-xs font-mono" onClick={() => navigate("/doc-intel")}>
            HS ASSIST →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
