import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Handshake, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CountryComplianceProfile, TradeAgreement } from "@/lib/complianceEngineData";
import { COMPLIANCE_COUNTRIES } from "@/lib/complianceEngineData";
import { ComplianceAgreementDrawer } from "./ComplianceAgreementDrawer";

export function ComplianceDutiesSection({ profile }: { profile: CountryComplianceProfile }) {
  const navigate = useNavigate();
  const { dutiesTariffs } = profile;
  const [selectedAgreement, setSelectedAgreement] = useState<TradeAgreement | null>(null);
  const [agreementDrawerOpen, setAgreementDrawerOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");

  const resolvePartnerName = (code: string) => {
    const c = COMPLIANCE_COUNTRIES.find(p => p.code === code);
    return c ? `${c.flag} ${c.name}` : code;
  };

  const openAgreement = (ta: TradeAgreement) => {
    setSelectedAgreement(ta);
    setAgreementDrawerOpen(true);
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

      {/* Product duty calculator */}
      <Card className="border-primary/20">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Product Duty Calculator</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">Enter a product description or HS code to look up applicable duty rates for {profile.name}</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., cotton t-shirts or 6109.10"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="text-xs h-8 flex-1"
            />
            <Button size="sm" className="text-xs h-8" onClick={() => navigate("/doc-intel")}>
              Look Up
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Handshake className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground">ACTIVE TRADE AGREEMENTS</span>
            <span className="text-[9px] text-primary font-mono ml-auto">Click for details</span>
          </div>
          <div className="space-y-3">
            {dutiesTariffs.tradeAgreements.map((ta, i) => (
              <div
                key={i}
                className="border border-border rounded-md p-3 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => openAgreement(ta)}
              >
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
            <p className="text-[10px] text-muted-foreground">Use HS Code Assist for {profile.name}-specific duty rate lookup</p>
          </div>
          <Button size="sm" variant="outline" className="text-xs font-mono" onClick={() => navigate("/doc-intel")}>
            HS ASSIST →
          </Button>
        </CardContent>
      </Card>

      <ComplianceAgreementDrawer
        open={agreementDrawerOpen}
        onOpenChange={setAgreementDrawerOpen}
        agreement={selectedAgreement}
      />
    </div>
  );
}
