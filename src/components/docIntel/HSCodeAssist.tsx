import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Search, AlertTriangle, Flag, CheckCircle, RotateCcw, BookOpen, ShieldAlert, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface HsSuggestion {
  code: string;
  description: string;
  confidence: number;
  reason: string;
  dutyRate: string;
  riskLevel: "low" | "medium" | "high";
  riskNotes: string;
}

interface ReverseResult {
  code: string;
  officialDescription: string;
  coveredProducts: string[];
  notCoveredProducts: string[];
  dutyRateRange: string;
  auditRiskFlags: string[];
  tradeRestrictions: string[];
  adjacentCodes: { code: string; description: string; commonConfusion: string }[];
}

interface HSCodeAssistProps {
  destinationCountry: string;
  originCountry: string;
  transportMode: string;
  onSelectCode?: (code: string) => void;
  onFlagForReview?: (code: string, reason: string) => void;
}

// Simple autocomplete suggestions based on common product categories
const PRODUCT_SUGGESTIONS = [
  "coffee beans roasted", "coffee beans green unroasted",
  "cotton t-shirts women", "cotton t-shirts men", "cotton fabric woven",
  "lithium-ion battery packs", "lithium-ion batteries for vehicles",
  "olive oil extra virgin", "olive oil refined",
  "steel pipes seamless", "steel bars hot-rolled",
  "leather handbags", "leather shoes",
  "ceramic tiles glazed", "ceramic tableware",
  "plastic packaging containers", "plastic bottles",
  "electronic circuit boards", "electronic components resistors",
  "organic fertilizer", "chemical fertilizer nitrogen",
  "fresh apples", "fresh bananas", "frozen shrimp",
  "wooden furniture", "wooden pallets",
  "automobile parts engine", "automobile tires rubber",
  "pharmaceutical tablets", "pharmaceutical capsules",
  "wine red bottled", "beer malt bottled",
  "solar panels photovoltaic", "LED lighting fixtures",
];

export function HSCodeAssist({ destinationCountry, originCountry, transportMode, onSelectCode, onFlagForReview }: HSCodeAssistProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<HsSuggestion[]>([]);
  const [reverseResult, setReverseResult] = useState<ReverseResult | null>(null);
  const [flaggedCodes, setFlaggedCodes] = useState<Set<string>>(new Set());
  const [isReverseMode, setIsReverseMode] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Autocomplete logic for forward lookup
  useEffect(() => {
    if (isReverseMode || query.length < 3) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }
    const q = query.toLowerCase();
    const matches = PRODUCT_SUGGESTIONS.filter(s => s.includes(q)).slice(0, 5);
    setAutocompleteSuggestions(matches);
    setShowAutocomplete(matches.length > 0);
  }, [query, isReverseMode]);

  // Close autocomplete on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const lookupHS = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSuggestions([]);
    setReverseResult(null);
    setShowAutocomplete(false);

    try {
      if (isReverseMode) {
        // Reverse lookup — use classify-product with a specific HS code query
        const { data, error } = await supabase.functions.invoke("classify-product", {
          body: {
            title: `Reverse lookup for HS code: ${query.trim()}`,
            description: `Please provide detailed information about HS code ${query.trim()}, including what products it covers, what it does NOT cover (common misclassifications), duty rates, audit risks, trade restrictions, and similar/adjacent codes that are commonly confused with it.`,
            destinationCountry: destinationCountry || "US",
            originCountry: originCountry || "",
            transportMode: transportMode || "sea",
          },
        });

        if (error) throw error;

        // Parse the response — the edge function returns classify_product tool output
        const result: ReverseResult = {
          code: data?.primaryCode || query.trim(),
          officialDescription: data?.primaryDescription || "—",
          coveredProducts: (data?.requiredDocuments || []).length > 0
            ? [data?.primaryDescription || "See official description"]
            : [data?.primaryDescription || "See official description"],
          notCoveredProducts: data?.warnings || [],
          dutyRateRange: data?.estimatedDutyRange || "Varies by country",
          auditRiskFlags: data?.restrictedFlags || [],
          tradeRestrictions: data?.restrictedFlags || [],
          adjacentCodes: (data?.alternateCodes || []).map((alt: any) => ({
            code: alt.code,
            description: alt.description,
            commonConfusion: alt.reason || "Similar classification category",
          })),
        };

        // Parse the reasoning for richer data
        if (data?.reasoning) {
          const reasoning = data.reasoning as string;
          // Extract covered products from reasoning
          if (result.coveredProducts.length <= 1) {
            result.coveredProducts = [data.primaryDescription, ...(data.missingInfo || [])].filter(Boolean);
          }
          if (result.notCoveredProducts.length === 0 && data.warnings) {
            result.notCoveredProducts = data.warnings;
          }
        }

        setReverseResult(result);
        if (!result.officialDescription || result.officialDescription === "—") {
          toast.info("Limited information found for this HS code");
        }
      } else {
        // Forward lookup — classify by product description
        const { data, error } = await supabase.functions.invoke("classify-product", {
          body: {
            title: query,
            description: query,
            destinationCountry: destinationCountry || "US",
            originCountry: originCountry || "",
            transportMode: transportMode || "sea",
            returnDutyInfo: true,
          },
        });

        if (error) throw error;

        // Map the classify-product edge function response correctly
        // The edge function returns: { primaryCode, primaryDescription, confidence, reasoning, alternateCodes, estimatedDutyRange, restrictedFlags, ... }
        const results: HsSuggestion[] = [];

        // Primary result
        if (data?.primaryCode) {
          results.push({
            code: data.primaryCode,
            description: data.primaryDescription || "—",
            confidence: (data.confidence || 0) / 100, // edge fn returns 0-100
            reason: data.reasoning || "AI classification based on description",
            dutyRate: data.estimatedDutyRange || "Check with broker",
            riskLevel: getRiskLevel(data.confidence, data.restrictedFlags),
            riskNotes: (data.restrictedFlags || []).join("; ") || (data.warnings || []).join("; ") || "",
          });
        }

        // Alternate codes
        if (Array.isArray(data?.alternateCodes)) {
          for (const alt of data.alternateCodes) {
            results.push({
              code: alt.code || "—",
              description: alt.description || "—",
              confidence: (alt.confidence || 0) / 100,
              reason: alt.reason || "Alternative classification",
              dutyRate: data.estimatedDutyRange || "Check with broker",
              riskLevel: getRiskLevel(alt.confidence, []),
              riskNotes: "",
            });
          }
        }

        // Ensure we have 3-6 results
        const finalResults = results.slice(0, 6);
        setSuggestions(finalResults);
        if (finalResults.length === 0) toast.info("No HS code suggestions found");
      }
    } catch (err) {
      console.error("HS lookup error:", err);
      toast.error("HS code lookup failed");
    }
    setLoading(false);
  }, [query, destinationCountry, originCountry, transportMode, isReverseMode]);

  const handleFlag = (code: string) => {
    setFlaggedCodes(prev => new Set([...prev, code]));
    onFlagForReview?.(code, `Flagged for broker review: ${query}`);
    toast.success(`HS ${code} flagged for broker review`);
  };

  const selectAutocomplete = (suggestion: string) => {
    setQuery(suggestion);
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

  const riskColor = (level: string) => {
    switch (level) {
      case "high": return "bg-destructive/20 text-destructive border-destructive/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-mono flex items-center gap-2">
          <Search size={14} className="text-primary" />
          {t("hsAssist.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Mode toggle */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-mono text-muted-foreground">
            {isReverseMode
              ? t("hsAssist.reverseHint")
              : t("hsAssist.forwardHint")}
          </p>
          <div className="flex items-center gap-2">
            <Label htmlFor="reverse-mode" className="text-[10px] font-mono text-muted-foreground cursor-pointer">
              {isReverseMode ? t("hsAssist.lookupByHs") : t("hsAssist.lookupByDesc")}
            </Label>
            <Switch
              id="reverse-mode"
              checked={isReverseMode}
              onCheckedChange={(checked) => {
                setIsReverseMode(checked);
                setQuery("");
                setSuggestions([]);
                setReverseResult(null);
              }}
            />
          </div>
        </div>

        <div className="relative">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder={isReverseMode
                ? "e.g., 6109.10.00, 8471.30, 0901.21..."
                : "e.g., organic coffee beans roasted, lithium-ion battery packs..."
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && lookupHS()}
              onFocus={() => {
                if (!isReverseMode && autocompleteSuggestions.length > 0) setShowAutocomplete(true);
              }}
              className="h-8 text-xs font-mono flex-1"
            />
            <Button onClick={lookupHS} disabled={loading || !query.trim()} size="sm" className="text-xs font-mono gap-1">
              {loading ? <Loader2 size={12} className="animate-spin" /> : isReverseMode ? <RotateCcw size={12} /> : <Search size={12} />}
              {isReverseMode ? t("hsAssist.reverseLookup") : t("hsAssist.lookup")}
            </Button>
          </div>

          {/* Autocomplete dropdown */}
          {showAutocomplete && autocompleteSuggestions.length > 0 && (
            <div
              ref={autocompleteRef}
              className="absolute z-50 top-9 left-0 right-12 bg-popover border border-border rounded-md shadow-lg overflow-hidden"
            >
              {autocompleteSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => selectAutocomplete(s)}
                  className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {destinationCountry && (
          <p className="text-[9px] font-mono text-muted-foreground">
            {t("hsAssist.destination")}: {destinationCountry} · {t("hsAssist.origin")}: {originCountry || "—"} · {t("hsAssist.mode")}: {transportMode || "—"}
          </p>
        )}

        {/* Forward lookup results */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="border rounded p-3 space-y-2 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-primary">{s.code}</span>
                    {i === 0 && (
                      <Badge variant="outline" className="text-[9px] font-mono bg-primary/10 text-primary border-primary/30">
                        {t("hsAssist.bestMatch")}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[9px] font-mono">
                      {Math.round(s.confidence * 100)}% {t("hsAssist.confidence")}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[9px] font-mono", riskColor(s.riskLevel))}>
                      {s.riskLevel === "high" && <ShieldAlert size={8} className="mr-0.5" />}
                      {s.riskLevel} {t("hsAssist.risk")}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs font-mono text-muted-foreground">{s.description}</p>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="bg-muted/20 rounded p-1.5">
                    <span className="text-muted-foreground">{t("hsAssist.dutyRate")}:</span>{" "}
                    <span className="font-medium">{s.dutyRate}</span>
                  </div>
                  <div className="bg-muted/20 rounded p-1.5">
                    <span className="text-muted-foreground">{t("hsAssist.reason")}:</span>{" "}
                    <span className="font-medium">{s.reason}</span>
                  </div>
                </div>

                {s.riskNotes && (
                  <p className="text-[9px] font-mono text-amber-400/80 flex items-center gap-1">
                    <AlertTriangle size={10} /> {s.riskNotes}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectCode?.(s.code)}
                    className="text-[10px] font-mono h-6 gap-1"
                  >
                    <CheckCircle size={10} /> {t("hsAssist.useThisCode")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFlag(s.code)}
                    disabled={flaggedCodes.has(s.code)}
                    className="text-[10px] font-mono h-6 gap-1 text-amber-400"
                  >
                    <Flag size={10} />
                    {flaggedCodes.has(s.code) ? "Flagged" : "Flag for Broker Review"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reverse lookup result */}
        {reverseResult && (
          <div className="space-y-3">
            <div className="border rounded p-3 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-primary" />
                <span className="text-sm font-mono font-bold text-primary">{reverseResult.code}</span>
                <Badge variant="outline" className="text-[9px] font-mono bg-primary/10 text-primary border-primary/30">
                  Reverse Lookup
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="bg-muted/20 rounded p-2">
                  <p className="text-[10px] font-mono text-muted-foreground mb-1">Official Description</p>
                  <p className="text-xs font-mono font-medium">{reverseResult.officialDescription}</p>
                </div>

                {reverseResult.coveredProducts.length > 0 && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2">
                    <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                      <CheckCircle size={10} /> Products Covered
                    </p>
                    <ul className="text-[10px] font-mono space-y-0.5">
                      {reverseResult.coveredProducts.map((p, i) => (
                        <li key={i} className="text-muted-foreground">• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {reverseResult.notCoveredProducts.length > 0 && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded p-2">
                    <p className="text-[10px] font-mono text-destructive mb-1 flex items-center gap-1">
                      <AlertTriangle size={10} /> Common Misclassifications / Warnings
                    </p>
                    <ul className="text-[10px] font-mono space-y-0.5">
                      {reverseResult.notCoveredProducts.map((p, i) => (
                        <li key={i} className="text-muted-foreground">• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="bg-muted/20 rounded p-1.5">
                    <span className="text-muted-foreground">Duty Rate Range:</span>{" "}
                    <span className="font-medium">{reverseResult.dutyRateRange}</span>
                  </div>
                  <div className="bg-muted/20 rounded p-1.5">
                    <span className="text-muted-foreground">Audit Risk Flags:</span>{" "}
                    <span className="font-medium">
                      {reverseResult.auditRiskFlags.length > 0 ? reverseResult.auditRiskFlags.join(", ") : "None"}
                    </span>
                  </div>
                </div>

                {reverseResult.tradeRestrictions.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2">
                    <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                      <ShieldAlert size={10} /> Trade Restriction Flags
                    </p>
                    <ul className="text-[10px] font-mono space-y-0.5">
                      {reverseResult.tradeRestrictions.map((r, i) => (
                        <li key={i} className="text-muted-foreground">• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Adjacent/confused codes */}
            {reverseResult.adjacentCodes.length > 0 && (
              <div className="border rounded p-3 space-y-2">
                <p className="text-[10px] font-mono font-medium flex items-center gap-1">
                  <Info size={10} className="text-primary" />
                  Similar / Commonly Confused Codes
                </p>
                {reverseResult.adjacentCodes.map((adj, i) => (
                  <div key={i} className="bg-muted/20 rounded p-2 flex items-start gap-2">
                    <span className="text-xs font-mono font-bold text-primary shrink-0">{adj.code}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-foreground">{adj.description}</p>
                      <p className="text-[9px] font-mono text-muted-foreground italic">{adj.commonConfusion}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setQuery(adj.code);
                        lookupHS();
                      }}
                      className="text-[9px] font-mono h-5 shrink-0"
                    >
                      Lookup
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to determine risk level from confidence and flags
function getRiskLevel(confidence: number, restrictedFlags: string[] | undefined): "low" | "medium" | "high" {
  if (restrictedFlags && restrictedFlags.length > 0) return "high";
  if (confidence > 80) return "low";
  if (confidence > 60) return "medium";
  return "high";
}
