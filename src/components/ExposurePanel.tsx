import { useState } from "react";
import { calculateExposure, jurisdictionAdapters, memberStateOverlays, getEffectiveAdapter } from "@/lib/jurisdictions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingDown, AlertTriangle, Clock, Scale, ShieldAlert, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ExposurePanelProps {
  riskScore: number;
  declaredValue: number;
  jurisdictionCode?: string;
}

export function ExposurePanel({ riskScore, declaredValue, jurisdictionCode = "US" }: ExposurePanelProps) {
  const [memberState, setMemberState] = useState<string>("");
  const isEU = jurisdictionCode === "EU";
  const effectiveMemberState = isEU && memberState ? memberState : undefined;

  const exposure = calculateExposure(riskScore, declaredValue, jurisdictionCode, effectiveMemberState);
  const effective = getEffectiveAdapter(jurisdictionCode, effectiveMemberState);
  const overlay = effective.appliedOverlay;

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
      {/* EU Member State Selector */}
      {isEU && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Info size={14} className="text-primary" />
              <span className="text-xs font-mono text-muted-foreground">EU MEMBER STATE OVERLAY</span>
              <Select value={memberState} onValueChange={setMemberState}>
                <SelectTrigger className="w-[180px] bg-secondary/50 text-xs font-mono h-8">
                  <SelectValue placeholder="EU General" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">EU General (baseline)</SelectItem>
                  {Object.values(memberStateOverlays).map((ms) => (
                    <SelectItem key={ms.code} value={ms.code}>{ms.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-[9px] font-mono">
                {exposure.logicLabel}
              </Badge>
            </div>
            {overlay && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                <div><span className="text-muted-foreground">Authority:</span> <span className="font-mono">{overlay.customs_authority_name}</span></div>
                <div><span className="text-muted-foreground">Penalty ×:</span> <span className="font-mono">{overlay.penalty_severity_multiplier}</span></div>
                <div><span className="text-muted-foreground">Hold Risk ×:</span> <span className="font-mono">{overlay.member_state_hold_risk_multiplier}</span></div>
                <div><span className="text-muted-foreground">Clearance:</span> <span className="font-mono">{overlay.local_clearance_time_baseline}d baseline</span></div>
                <div><span className="text-muted-foreground">Enforcement:</span> <span className="font-mono">{overlay.member_state_enforcement_intensity_score}/100</span></div>
                <div><span className="text-muted-foreground">Inspection ×:</span> <span className="font-mono">{overlay.inspection_probability_modifier}</span></div>
                <div><span className="text-muted-foreground">SLA:</span> <span className="font-mono">{overlay.local_sla_baseline}h</span></div>
                <div><span className="text-muted-foreground">Settlement:</span> <span className="font-mono">{(overlay.settlement_likelihood_factor * 100).toFixed(0)}%</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              {exposure.logicLabel} · {exposure.expectedDelayDays} day expected delay
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
              85% correction rate · Net: ${(exposure.totalExpectedLoss - exposure.avoidedExposure).toLocaleString()}
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
