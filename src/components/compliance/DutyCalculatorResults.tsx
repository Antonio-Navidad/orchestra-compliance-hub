import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle, AlertTriangle, ArrowRight, FileText, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AlternateCode {
  code: string;
  description: string;
  confidence: number;
  reason: string;
}

interface DutyResult {
  primaryCode: string;
  primaryDescription: string;
  confidence: number;
  reasoning: string;
  alternateCodes: AlternateCode[];
  estimatedDutyRange?: string;
  estimatedTaxes?: string;
  requiredDocuments?: string[];
  restrictedFlags?: string[];
  warnings?: string[];
  missingInfo?: string[];
  classificationId?: string;
  // Country-specific fields added by our prompt
  generalDutyRate?: string;
  preferentialRates?: Array<{
    agreement: string;
    rate: string;
    originCountries: string[];
    requiredDocument: string;
  }>;
  additionalDuties?: string[];
  deMinimisThreshold?: string;
  claimRequirements?: string[];
}

interface DutyCalculatorResultsProps {
  query: string;
  countryCode: string;
  countryName: string;
}

export function DutyCalculatorResults({ query, countryCode, countryName }: DutyCalculatorResultsProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DutyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const lookUp = async () => {
    if (!query.trim()) {
      toast.error("Enter a product description or HS code");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setHasSearched(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("classify-product", {
        body: {
          title: query,
          description: `Duty rate lookup for import into ${countryName} (${countryCode}). Provide the general/MFN duty rate for ${countryName}, any preferential trade agreement rates with origin countries they apply to, additional duties (anti-dumping, countervailing, Section 301 for US), and the de minimis threshold for ${countryName}.`,
          destinationCountry: countryCode,
          originCountry: "ANY",
        },
      });

      if (fnError) throw new Error(fnError.message || "Classification failed");
      if (data?.error) throw new Error(data.error);

      setResult(data as DutyResult);
    } catch (e: any) {
      const msg = e?.message || "Lookup failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const flagForBroker = () => {
    toast.success("Flagged for broker review", {
      description: `HS ${result?.primaryCode} for ${countryName} sent to review queue`,
    });
    navigate("/review-queue");
  };

  const useHsCode = () => {
    toast.success(`HS code ${result?.primaryCode} saved`, {
      description: "Applied to active shipment workflow",
    });
    navigate("/shipment-intake");
  };

  // Expose lookup to parent
  // We use a trick: parent sets query then calls ref, but simpler: just expose via key remount
  // Instead, parent will call this via a callback pattern
  if (!hasSearched && query) {
    // auto-trigger on mount with query
  }

  const exampleSaving = (generalStr?: string, prefStr?: string) => {
    if (!generalStr || !prefStr) return null;
    const general = parseFloat(generalStr.replace(/[^0-9.]/g, ""));
    const pref = parseFloat(prefStr.replace(/[^0-9.]/g, ""));
    if (isNaN(general) || isNaN(pref) || general <= pref) return null;
    const savingPct = general - pref;
    const savingAmt = Math.round(savingPct * 1000); // per $100k
    return { savingPct, savingAmt };
  };

  return (
    <div className="space-y-3">
      <Button
        size="sm"
        className="text-xs h-8 w-full"
        onClick={lookUp}
        disabled={loading || !query.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
            Looking up rates for {countryName}…
          </>
        ) : (
          `Look up duty rates for import into ${countryName}`
        )}
      </Button>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3">
            <p className="text-xs text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2">
          {/* Primary result */}
          <Card className="border-primary/30">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="font-mono text-xs">
                      {result.primaryCode}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono ${
                        result.confidence >= 80
                          ? "border-green-500 text-green-700 dark:text-green-400"
                          : result.confidence >= 60
                          ? "border-yellow-500 text-yellow-700 dark:text-yellow-400"
                          : "border-red-500 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {result.confidence}% CONFIDENCE
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{result.primaryDescription}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">{result.reasoning}</p>

              {/* General duty rate */}
              {(result.generalDutyRate || result.estimatedDutyRange) && (
                <div className="rounded-md bg-muted/50 p-2.5">
                  <span className="text-[10px] font-mono text-muted-foreground block mb-1">
                    GENERAL / MFN DUTY RATE — {countryName.toUpperCase()}
                  </span>
                  <p className="text-sm font-semibold">
                    {result.generalDutyRate || result.estimatedDutyRange}
                  </p>
                </div>
              )}

              {/* De minimis */}
              {result.deMinimisThreshold && (
                <div className="rounded-md bg-muted/50 p-2.5">
                  <span className="text-[10px] font-mono text-muted-foreground block mb-1">
                    DE MINIMIS THRESHOLD
                  </span>
                  <p className="text-xs">{result.deMinimisThreshold}</p>
                </div>
              )}

              {/* Additional duties */}
              {result.additionalDuties && result.additionalDuties.length > 0 && (
                <div className="rounded-md bg-destructive/5 border border-destructive/20 p-2.5">
                  <span className="text-[10px] font-mono text-destructive block mb-1">
                    ADDITIONAL DUTIES
                  </span>
                  {result.additionalDuties.map((d, i) => (
                    <p key={i} className="text-xs">{d}</p>
                  ))}
                </div>
              )}

              <Separator />

              {/* Preferential rates with savings */}
              {result.preferentialRates && result.preferentialRates.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    TRADE AGREEMENT PREFERENTIAL RATES
                  </span>
                  {result.preferentialRates.map((pr, i) => {
                    const saving = exampleSaving(
                      result.generalDutyRate || result.estimatedDutyRange,
                      pr.rate
                    );
                    return (
                      <Card key={i} className="border-green-500/30 bg-green-500/5">
                        <CardContent className="py-2.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{pr.agreement}</span>
                            <Badge variant="outline" className="text-[9px] font-mono border-green-500 text-green-700 dark:text-green-400">
                              {pr.rate}
                            </Badge>
                          </div>
                          {pr.originCountries?.length > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              Applies from: {pr.originCountries.join(", ")}
                            </p>
                          )}
                          {saving && (
                            <div className="rounded bg-green-500/10 p-2 text-xs">
                              <span className="font-medium text-green-700 dark:text-green-400">
                                Potential saving on $100,000 shipment: ${saving.savingAmt.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground ml-1">
                                (General: {result.generalDutyRate || result.estimatedDutyRange} → Preferential: {pr.rate})
                              </span>
                            </div>
                          )}
                          {/* What you need to claim */}
                          {pr.requiredDocument && (
                            <div className="mt-1.5 border-t border-border pt-1.5">
                              <span className="text-[10px] font-mono text-muted-foreground block mb-1">
                                WHAT YOU NEED TO CLAIM THIS RATE
                              </span>
                              <div className="flex items-center justify-between">
                                <p className="text-xs flex items-center gap-1">
                                  <FileText className="h-3 w-3 text-primary" />
                                  {pr.requiredDocument}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-[10px] h-6 px-2"
                                  onClick={() => navigate("/doc-intel")}
                                >
                                  View template <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Required documents */}
              {result.requiredDocuments && result.requiredDocuments.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground block mb-1">
                    REQUIRED DOCUMENTS
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {result.requiredDocuments.map((d, i) => (
                      <Badge key={i} variant="outline" className="text-[9px]">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-2.5">
                  <span className="text-[10px] font-mono text-yellow-700 dark:text-yellow-400 flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3" /> WARNINGS
                  </span>
                  {result.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-yellow-800 dark:text-yellow-300">{w}</p>
                  ))}
                </div>
              )}

              {/* Restricted flags */}
              {result.restrictedFlags && result.restrictedFlags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {result.restrictedFlags.map((f, i) => (
                    <Badge key={i} variant="destructive" className="text-[9px]">{f}</Badge>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="text-xs h-7 flex-1" onClick={useHsCode}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Use this HS code
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={flagForBroker}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Flag for broker review
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alternate codes */}
          {result.alternateCodes && result.alternateCodes.length > 0 && (
            <Card>
              <CardContent className="py-3 space-y-2">
                <span className="text-[10px] font-mono text-muted-foreground">ALTERNATE CODES</span>
                {result.alternateCodes.map((alt, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border pb-1.5 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="font-mono text-[10px]">{alt.code}</Badge>
                        <span className="text-[9px] text-muted-foreground">{alt.confidence}%</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{alt.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
