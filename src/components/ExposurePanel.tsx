import { calculateExposure, jurisdictionAdapters } from "@/lib/jurisdictions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, AlertTriangle, Clock, Scale, ShieldAlert } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ExposurePanelProps {
  riskScore: number;
  declaredValue: number;
  jurisdictionCode?: string;
}

export function ExposurePanel({ riskScore, declaredValue, jurisdictionCode = "US" }: ExposurePanelProps) {
  const exposure = calculateExposure(riskScore, declaredValue, jurisdictionCode);
  const adapter = jurisdictionAdapters[jurisdictionCode] || jurisdictionAdapters.US;

  const probabilities = [
    { label: "Hold Probability", value: exposure.holdProbability, icon: Clock },
    { label: "Penalty Probability", value: exposure.penaltyProbability, icon: DollarSign },
    { label: "Legal Escalation", value: exposure.legalEscalationProbability, icon: Scale },
    { label: "Rework / Audit", value: exposure.reworkProbability, icon: ShieldAlert },
  ];

  const costs = [
    { label: "Hold & Storage Cost", value: exposure.holdCost },
    { label: "Penalty Estimate", value: exposure.penaltyCost },
    { label: "Legal / Compliance Cost", value: exposure.legalCost },
    { label: "Internal Correction Cost", value: exposure.reworkCost },
  ];

  return (
    <div className="space-y-4">
      {/* Expected Loss & Avoided Exposure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-risk-critical/30 risk-gradient-critical">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs text-muted-foreground flex items-center gap-2">
              <AlertTriangle size={14} className="text-risk-critical" />
              EXPECTED LOSS (BEFORE CORRECTION)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-risk-critical">
              ${exposure.totalExpectedLoss.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Jurisdiction: {adapter.name} · {exposure.expectedDelayDays} day expected delay
            </p>
          </CardContent>
        </Card>

        <Card className="border-risk-safe/30 risk-gradient-safe">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs text-muted-foreground flex items-center gap-2">
              <TrendingDown size={14} className="text-risk-safe" />
              AVOIDED EXPOSURE (ORCHESTRA SAVINGS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-risk-safe">
              ${exposure.avoidedExposure.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              85% correction rate applied · Net risk: ${(exposure.totalExpectedLoss - exposure.avoidedExposure).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Probability Gauges */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-xs text-muted-foreground">RISK PROBABILITIES</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {probabilities.map((p) => (
            <div key={p.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <p.icon size={12} /> {p.label}
                </span>
                <Badge variant="outline" className={`font-mono text-[10px] ${
                  p.value >= 70 ? 'border-risk-critical/50 text-risk-critical' :
                  p.value >= 40 ? 'border-risk-medium/50 text-risk-medium' :
                  'border-risk-safe/50 text-risk-safe'
                }`}>
                  {p.value}%
                </Badge>
              </div>
              <Progress value={p.value} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-xs text-muted-foreground">COST BREAKDOWN</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {costs.map((c) => (
              <div key={c.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-mono font-semibold">${c.value.toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-bold">
              <span>Total Expected Loss</span>
              <span className="font-mono text-risk-critical">${exposure.totalExpectedLoss.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
