import { PacketScoreResult } from "@/lib/packetScore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

interface PacketScoreGaugeProps {
  result: PacketScoreResult;
  onResolveIssues: () => void;
}

function gaugeColor(score: number) {
  if (score >= 80) return "stroke-risk-safe";
  if (score >= 50) return "stroke-risk-medium";
  return "stroke-risk-critical";
}

function readinessLabel(r: PacketScoreResult["filingReadiness"]) {
  switch (r) {
    case "ready": return { label: "READY", className: "text-risk-safe" };
    case "needs_review": return { label: "AT RISK", className: "text-risk-medium" };
    case "not_ready": return { label: "NOT READY", className: "text-risk-critical" };
  }
}

export function PacketScoreGauge({ result, onResolveIssues }: PacketScoreGaugeProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (result.overallScore / 100) * circumference;
  const { label, className } = readinessLabel(result.filingReadiness);
  const issueCount = result.topMissing.length + result.topInconsistencies.length;

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <h3 className="font-mono text-[10px] text-muted-foreground tracking-wider">COMPLIANCE READINESS</h3>

      {/* Circular gauge */}
      <div className="flex justify-center">
        <div className="relative w-[140px] h-[140px]">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radius} fill="none" className="stroke-secondary" strokeWidth="8" />
            <circle
              cx="60" cy="60" r={radius} fill="none"
              className={gaugeColor(result.overallScore)}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold font-mono ${result.overallScore >= 80 ? "text-risk-safe" : result.overallScore >= 50 ? "text-risk-medium" : "text-risk-critical"}`}>
              {result.overallScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Status lines */}
      <div className="space-y-2 text-xs font-mono">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">OVERALL</span>
          <span className={`font-bold ${result.overallScore >= 80 ? "text-risk-safe" : result.overallScore >= 50 ? "text-risk-medium" : "text-risk-critical"}`}>
            {result.overallScore}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">DOCUMENTS</span>
          <span className="font-bold">
            {result.layers.flatMap(l => l.items).filter(i => i.status === "present").length} of{" "}
            {result.layers.flatMap(l => l.items).filter(i => i.status !== "not_applicable").length} present
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">FILING</span>
          <span className={`font-bold ${className}`}>{label}</span>
        </div>
      </div>

      {/* Resolve issues CTA */}
      {issueCount > 0 && (
        <Button
          onClick={onResolveIssues}
          className="w-full font-mono text-xs gap-1.5"
          variant={result.overallScore < 50 ? "default" : "outline"}
        >
          <AlertTriangle size={12} />
          Resolve {issueCount} issue{issueCount !== 1 ? "s" : ""}
          <ChevronRight size={12} />
        </Button>
      )}

      {issueCount === 0 && (
        <div className="flex items-center justify-center gap-1.5 text-risk-safe text-xs font-mono">
          <CheckCircle2 size={14} />
          All requirements met
        </div>
      )}
    </div>
  );
}
