import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, AlertTriangle, Flag, CheckCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface HsSuggestion {
  code: string;
  description: string;
  confidence: number;
  reason: string;
  dutyRate: string;
  riskLevel: "low" | "medium" | "high";
  riskNotes: string;
}

interface HSCodeAssistProps {
  destinationCountry: string;
  originCountry: string;
  transportMode: string;
  onSelectCode?: (code: string) => void;
  onFlagForReview?: (code: string, reason: string) => void;
}

export function HSCodeAssist({ destinationCountry, originCountry, transportMode, onSelectCode, onFlagForReview }: HSCodeAssistProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<HsSuggestion[]>([]);
  const [flaggedCodes, setFlaggedCodes] = useState<Set<string>>(new Set());

  const lookupHS = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSuggestions([]);

    try {
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

      const results: HsSuggestion[] = (data?.suggestions || data?.classifications || []).map((s: any) => ({
        code: s.hsCode || s.code || s.hs_code || "—",
        description: s.description || s.productDescription || "—",
        confidence: s.confidence || 0.5,
        reason: s.reason || s.explanation || "AI classification based on description",
        dutyRate: s.dutyRate || s.duty_rate || "Check with broker",
        riskLevel: s.riskLevel || (s.confidence > 0.8 ? "low" : s.confidence > 0.6 ? "medium" : "high"),
        riskNotes: s.riskNotes || s.auditRisk || "",
      }));

      // Fallback if edge function returns differently
      if (results.length === 0 && data?.hsCode) {
        results.push({
          code: data.hsCode,
          description: data.description || query,
          confidence: data.confidence || 0.7,
          reason: data.explanation || "AI classification",
          dutyRate: data.dutyRate || "—",
          riskLevel: data.confidence > 0.8 ? "low" : "medium",
          riskNotes: "",
        });
      }

      setSuggestions(results);
      if (results.length === 0) toast.info("No HS code suggestions found");
    } catch (err) {
      console.error("HS lookup error:", err);
      toast.error("HS code lookup failed");
    }
    setLoading(false);
  }, [query, destinationCountry, originCountry, transportMode]);

  const handleFlag = (code: string) => {
    setFlaggedCodes(prev => new Set([...prev, code]));
    onFlagForReview?.(code, `Flagged for broker review: ${query}`);
    toast.success(`HS ${code} flagged for broker review`);
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
          HS Code Assist
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-[10px] font-mono text-muted-foreground">
          Enter a plain-English product description to get suggested HS codes with duty rates and risk assessment.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="e.g., organic coffee beans roasted, lithium-ion battery packs..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && lookupHS()}
            className="h-8 text-xs font-mono flex-1"
          />
          <Button onClick={lookupHS} disabled={loading || !query.trim()} size="sm" className="text-xs font-mono gap-1">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Lookup
          </Button>
        </div>

        {destinationCountry && (
          <p className="text-[9px] font-mono text-muted-foreground">
            Destination: {destinationCountry} · Origin: {originCountry || "—"} · Mode: {transportMode || "—"}
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="border rounded p-3 space-y-2 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-primary">{s.code}</span>
                    <Badge variant="outline" className="text-[9px] font-mono">
                      {Math.round(s.confidence * 100)}% confidence
                    </Badge>
                    <Badge variant="outline" className={cn("text-[9px] font-mono", riskColor(s.riskLevel))}>
                      {s.riskLevel} risk
                    </Badge>
                  </div>
                </div>

                <p className="text-xs font-mono text-muted-foreground">{s.description}</p>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="bg-muted/20 rounded p-1.5">
                    <span className="text-muted-foreground">Duty Rate:</span>{" "}
                    <span className="font-medium">{s.dutyRate}</span>
                  </div>
                  <div className="bg-muted/20 rounded p-1.5">
                    <span className="text-muted-foreground">Reason:</span>{" "}
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
                    <CheckCircle size={10} /> Use This Code
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
      </CardContent>
    </Card>
  );
}
