import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Handshake, FileText, Scale } from "lucide-react";
import type { TradeAgreement } from "@/lib/complianceEngineData";
import { getTradeAgreementEducation } from "@/lib/complianceEducationalData";
import { COMPLIANCE_COUNTRIES } from "@/lib/complianceEngineData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreement: TradeAgreement | null;
}

export function ComplianceAgreementDrawer({ open, onOpenChange, agreement }: Props) {
  if (!agreement) return null;
  const edu = getTradeAgreementEducation(agreement.name);

  const resolvePartner = (code: string) => {
    const c = COMPLIANCE_COUNTRIES.find(p => p.code === code);
    return c ? `${c.flag} ${c.name}` : code;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            <SheetTitle className="text-base">{agreement.name}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {agreement.partners.length > 0 && (
            <div>
              <h4 className="text-xs font-mono text-muted-foreground mb-2">PARTNER COUNTRIES</h4>
              <div className="flex flex-wrap gap-1.5">
                {agreement.partners.map(p => (
                  <Badge key={p} variant="outline" className="text-xs">{resolvePartner(p)}</Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" /> PREFERENTIAL TARIFF RATES
            </h4>
            <p className="text-sm">{edu.preferentialRates}</p>
          </div>

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> CERTIFICATE OF ORIGIN REQUIRED
            </h4>
            <p className="text-sm">{edu.originCertificate}</p>
          </div>

          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-1.5">RULES OF ORIGIN</h4>
            <p className="text-sm">{edu.rulesOfOrigin}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
