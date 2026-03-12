import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getRiskLevel, getRiskLabel } from "@/lib/compliance";
import { AlertTriangle, FileText, Globe, BarChart3, Shield, ArrowRight } from "lucide-react";

interface ExplainabilityDrawerProps {
  riskScore: number;
  riskNotes: string | null;
  hsCode: string;
  mode: string;
  status: string;
  jurisdictionCode?: string;
  children: React.ReactNode;
}

interface RiskDriver {
  rule: string;
  source: string;
  jurisdiction: string;
  confidence: number;
  severity: "critical" | "high" | "medium" | "low";
  recommendation: string;
}

function generateRiskDrivers(
  riskScore: number,
  hsCode: string,
  mode: string,
  riskNotes: string | null,
  jurisdictionCode: string
): RiskDriver[] {
  const drivers: RiskDriver[] = [];

  if (riskScore >= 85) {
    drivers.push({
      rule: "Critical risk threshold exceeded",
      source: "Risk Scoring Engine",
      jurisdiction: jurisdictionCode,
      confidence: 94,
      severity: "critical",
      recommendation: "Immediate compliance review required. Escalate to legal team.",
    });
  }

  if (riskNotes?.toLowerCase().includes("hs") || riskNotes?.toLowerCase().includes("code")) {
    drivers.push({
      rule: `HS Code ${hsCode} classification conflict`,
      source: "Document Comparison Engine",
      jurisdiction: jurisdictionCode,
      confidence: 87,
      severity: "critical",
      recommendation: `Verify HS classification against product description. Consider reclassification.`,
    });
  }

  if (riskNotes?.toLowerCase().includes("weight") || riskNotes?.toLowerCase().includes("discrepan")) {
    drivers.push({
      rule: "Weight discrepancy between invoice and manifest",
      source: "Document Comparison Engine",
      jurisdiction: jurisdictionCode,
      confidence: 91,
      severity: "high",
      recommendation: "Request updated packing list. Verify net/gross weights.",
    });
  }

  if (riskNotes?.toLowerCase().includes("value") || riskNotes?.toLowerCase().includes("under")) {
    drivers.push({
      rule: "Possible value under-declaration",
      source: "Customs Valuation Engine",
      jurisdiction: jurisdictionCode,
      confidence: 78,
      severity: "high",
      recommendation: "Compare declared value with market rates and prior shipments.",
    });
  }

  if (mode === "air") {
    drivers.push({
      rule: "Air cargo IATA compliance check",
      source: "Mode-Specific Logic",
      jurisdiction: jurisdictionCode,
      confidence: 82,
      severity: "medium",
      recommendation: "Verify AWB matches commercial invoice. Check DG declarations.",
    });
  } else if (mode === "sea") {
    drivers.push({
      rule: "Maritime D&D risk assessment",
      source: "Mode-Specific Logic",
      jurisdiction: jurisdictionCode,
      confidence: 79,
      severity: "medium",
      recommendation: "Monitor demurrage countdown. Confirm B/L release.",
    });
  } else {
    drivers.push({
      rule: "Land border documentation review",
      source: "Mode-Specific Logic",
      jurisdiction: jurisdictionCode,
      confidence: 85,
      severity: "medium",
      recommendation: "Verify USMCA/FTA certificates. Confirm border crossing docs.",
    });
  }

  if (riskScore >= 40) {
    drivers.push({
      rule: "Hold probability exceeds operational threshold",
      source: "Exposure Calculator",
      jurisdiction: jurisdictionCode,
      confidence: Math.min(riskScore, 95),
      severity: riskScore >= 85 ? "critical" : riskScore >= 60 ? "high" : "medium",
      recommendation: "Review all attached documents before filing. Consider pre-clearance.",
    });
  }

  return drivers;
}

const severityColors: Record<string, string> = {
  critical: "border-risk-critical/30 bg-risk-critical/5 text-risk-critical",
  high: "border-risk-high/30 bg-risk-high/5 text-risk-high",
  medium: "border-risk-medium/30 bg-risk-medium/5 text-risk-medium",
  low: "border-risk-safe/30 bg-risk-safe/5 text-risk-safe",
};

export function ExplainabilityDrawer({
  riskScore, riskNotes, hsCode, mode, status, jurisdictionCode = "US", children
}: ExplainabilityDrawerProps) {
  const drivers = generateRiskDrivers(riskScore, hsCode, mode, riskNotes, jurisdictionCode);
  const level = getRiskLevel(riskScore);
  const label = getRiskLabel(riskScore);

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
        <SheetHeader>
          <SheetTitle className="font-mono text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-risk-critical" />
            WHY WAS THIS FLAGGED?
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-muted-foreground">RISK ASSESSMENT</span>
              <Badge variant="outline" className={`font-mono text-xs ${
                level === "critical" ? "border-risk-critical/50 text-risk-critical" :
                level === "high" ? "border-risk-high/50 text-risk-high" :
                "border-risk-medium/50 text-risk-medium"
              }`}>
                {riskScore} — {label}
              </Badge>
            </div>
            <Progress value={riskScore} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">{riskNotes || "No additional notes."}</p>
          </div>

          {/* Risk Drivers */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs text-muted-foreground">TRIGGERING RULES ({drivers.length})</h3>
            {drivers.map((driver, i) => (
              <div key={i} className={`rounded-lg border p-3 space-y-2 ${severityColors[driver.severity]}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{driver.rule}</p>
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                    {driver.confidence}%
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1"><FileText size={10} />{driver.source}</span>
                  <span className="flex items-center gap-1"><Globe size={10} />{driver.jurisdiction}</span>
                  <span className="flex items-center gap-1"><BarChart3 size={10} />{driver.severity.toUpperCase()}</span>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground border-t border-border/50 pt-2 mt-1">
                  <ArrowRight size={10} className="mt-0.5 text-primary shrink-0" />
                  <span>{driver.recommendation}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between"><span>HS Code</span><span className="font-mono">{hsCode}</span></div>
            <div className="flex justify-between"><span>Transport Mode</span><span className="font-mono uppercase">{mode}</span></div>
            <div className="flex justify-between"><span>Current Status</span><span className="font-mono uppercase">{status.replace(/_/g, " ")}</span></div>
            <div className="flex justify-between"><span>Jurisdiction</span><span className="font-mono">{jurisdictionCode}</span></div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
