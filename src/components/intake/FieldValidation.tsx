import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

// HS Code inline validation
interface HSValidationProps {
  hsCode: string;
  description: string;
  destinationCountry: string;
  declaredValue: string;
  currency: string;
}

interface HSResult {
  officialDescription: string;
  matches: boolean;
  confidence: number;
  warning: string;
  suggestedCode?: string;
  estimatedDutyRate: string;
  estimatedDutyAmount?: number;
  tradeAgreementNote?: string;
}

export function HSCodeValidation({ hsCode, description, destinationCountry, declaredValue, currency }: HSValidationProps) {
  const [result, setResult] = useState<HSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const validate = useCallback(async () => {
    if (!hsCode || hsCode.length < 4) { setResult(null); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("intake-validate", {
        body: { action: "validate_hs", hsCode, description, destinationCountry, declaredValue, currency },
      });
      if (!error && data) setResult(data);
    } catch { /* silent */ }
    setLoading(false);
  }, [hsCode, description, destinationCountry, declaredValue, currency]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(validate, 1200);
    return () => clearTimeout(debounceRef.current);
  }, [validate]);

  if (loading) return <div className="flex items-center gap-1.5 mt-1"><Loader2 size={12} className="animate-spin text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Validating HS code...</span></div>;
  if (!result) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex items-start gap-1.5">
        {result.matches ? (
          <CheckCircle2 size={12} className="text-risk-safe shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle size={12} className="text-risk-high shrink-0 mt-0.5" />
        )}
        <span className="text-[11px] text-muted-foreground">
          HS {hsCode} = {result.officialDescription}
        </span>
      </div>
      {result.warning && (
        <div className="flex items-start gap-1.5 text-risk-high">
          <AlertTriangle size={11} className="shrink-0 mt-0.5" />
          <span className="text-[11px]">
            ⚠️ {result.warning}{" "}
            <Link to="/doc-intel?tab=hs-assist" className="text-primary hover:underline inline-flex items-center gap-0.5">
              Check with HS Assist <ExternalLink size={9} />
            </Link>
          </span>
        </div>
      )}
      {result.estimatedDutyRate && declaredValue && (
        <div className="flex items-start gap-1.5">
          <Info size={11} className="text-primary shrink-0 mt-0.5" />
          <span className="text-[11px] text-muted-foreground">
            Estimated duty: {result.estimatedDutyAmount ? `${currency} ${result.estimatedDutyAmount.toLocaleString()}` : result.estimatedDutyRate} based on HS {hsCode} at {result.estimatedDutyRate} for {destinationCountry}.
            {result.tradeAgreementNote && <> {result.tradeAgreementNote}</>}
          </span>
        </div>
      )}
    </div>
  );
}

// Declared Value duty estimate
interface DutyEstimateProps {
  hsCode: string;
  declaredValue: string;
  destinationCountry: string;
  currency: string;
  dutyRate?: string;
}

export function DeclaredValueHint({ hsCode, declaredValue, destinationCountry, currency, dutyRate }: DutyEstimateProps) {
  if (!declaredValue || !hsCode || !dutyRate) return null;
  const val = parseFloat(declaredValue);
  const rate = parseFloat(dutyRate);
  if (isNaN(val) || isNaN(rate)) return null;
  const estimated = (val * rate / 100).toFixed(2);

  return (
    <div className="flex items-start gap-1.5 mt-1">
      <Info size={11} className="text-primary shrink-0 mt-0.5" />
      <span className="text-[11px] text-muted-foreground">
        Estimated duty: {currency} {parseFloat(estimated).toLocaleString()} based on HS {hsCode} at {rate}% for {destinationCountry}. Trade agreement rate may apply if COO is confirmed.
      </span>
    </div>
  );
}

// COO Status warning
export function COOWarning({ cooStatus, destinationCountry }: { cooStatus: string; destinationCountry: string }) {
  if (cooStatus !== "unknown") return null;
  return (
    <div className="flex items-start gap-1.5 mt-1 text-risk-high">
      <AlertTriangle size={11} className="shrink-0 mt-0.5" />
      <span className="text-[11px]">
        ⚠️ Certificate of Origin status unknown. If this shipment qualifies for a trade agreement, you may be overpaying duties. Set COO status to confirm or deny eligibility.
      </span>
    </div>
  );
}

// Incoterm explanation
const INCOTERM_EXPLANATIONS: Record<string, string> = {
  EXW: "Ex Works: Buyer assumes all risk and cost from seller's premises. Customs value = goods only.",
  FCA: "Free Carrier: Seller delivers goods to carrier. Buyer assumes risk from carrier onward.",
  FAS: "Free Alongside Ship: Seller delivers goods alongside vessel. Buyer assumes risk from that point.",
  FOB: "Free On Board: Seller delivers goods to port. Buyer assumes risk and cost from port of loading onward.",
  CFR: "Cost and Freight: Seller pays freight to destination port. Risk transfers at loading.",
  CIF: "Cost, Insurance, Freight: Seller pays freight + insurance to destination. Risk transfers at loading.",
  CPT: "Carriage Paid To: Seller pays carriage to destination. Risk transfers at first carrier.",
  CIP: "Carriage and Insurance Paid: Seller pays carriage + insurance. Risk transfers at first carrier.",
  DAP: "Delivered at Place: Seller bears all risk to named destination, excluding import duties.",
  DPU: "Delivered at Place Unloaded: Seller bears all risk to destination + unloading.",
  DDP: "Delivered Duty Paid: Seller bears all cost and risk including import duties and taxes.",
};

export function IncotermHint({ incoterm }: { incoterm: string }) {
  if (!incoterm || !INCOTERM_EXPLANATIONS[incoterm]) return null;
  return (
    <div className="flex items-start gap-1.5 mt-1">
      <Info size={11} className="text-primary shrink-0 mt-0.5" />
      <span className="text-[11px] text-muted-foreground">{INCOTERM_EXPLANATIONS[incoterm]}</span>
    </div>
  );
}

// Description quality warning
export function DescriptionQualityHint({ description }: { description: string }) {
  if (!description) return null;
  const len = description.length;
  if (len > 30) return null;

  return (
    <div className="space-y-1 mt-1">
      <div className="flex items-start gap-1.5 text-risk-high">
        <AlertTriangle size={11} className="shrink-0 mt-0.5" />
        <span className="text-[11px]">
          ⚠️ Description quality: Low. Customs requires sufficient detail to verify HS classification. Add material composition, intended use, and product specifics.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">{len} chars</span>
        <span className="text-[10px] text-muted-foreground">· Recommended: 50+ chars</span>
      </div>
    </div>
  );
}
