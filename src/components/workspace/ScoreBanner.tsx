import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface ScoreBannerProps {
  score: number;
  totalRequired: number;
  verified: number;
  issuesFlagged: number;
  missing: number;
  shipmentSubtitle: string;
  statusPills: Array<{ label: string; type: 'green' | 'amber' | 'red'; onClick?: () => void }>;
  onViewAIAnalysis?: () => void;
}

function ProgressRing({ score, size = 52 }: { score: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? 'hsl(142, 71%, 45%)' : score >= 50 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={cn(
        "absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums",
        score >= 90 ? "text-green-600" : score >= 50 ? "text-amber-500" : "text-red-500"
      )}>
        {score}%
      </span>
    </div>
  );
}

export function ScoreBanner({
  score, totalRequired, verified, issuesFlagged, missing,
  shipmentSubtitle, statusPills, onViewAIAnalysis,
}: ScoreBannerProps) {
  const readinessLabel = score >= 90 ? 'Ready to file' : score >= 50 ? 'Issues to resolve' : 'Not ready';

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Top row: ring + label + button */}
      <div className="flex items-center gap-4">
        <ProgressRing score={score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">Filing Readiness Score</h2>
            <span className="text-[11px] text-muted-foreground">—</span>
            <span className={cn(
              "text-xs font-semibold",
              score >= 90 ? "text-green-600" : score >= 50 ? "text-amber-500" : "text-red-500"
            )}>
              {readinessLabel}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{shipmentSubtitle}</p>
          {/* Status pills */}
          {statusPills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {statusPills.map((pill, i) => (
                <button
                  key={i}
                  onClick={pill.onClick}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors",
                    "hover:opacity-80 active:scale-[0.97] cursor-pointer",
                    pill.type === 'green' && "bg-green-500/10 text-green-600 border border-green-500/20",
                    pill.type === 'amber' && "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                    pill.type === 'red' && "bg-red-500/10 text-red-600 border border-red-500/20",
                  )}
                >
                  {pill.type === 'green' ? '✓' : pill.type === 'amber' ? '⚠' : '✕'} {pill.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {onViewAIAnalysis && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAIAnalysis}
            className="text-[11px] gap-1.5 shrink-0"
          >
            <BarChart3 size={12} /> View AI Analysis
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total required', value: totalRequired, color: '' },
          { label: 'Verified ✓', value: verified, color: 'text-green-600' },
          { label: 'Issues flagged', value: issuesFlagged, color: 'text-amber-500' },
          { label: 'Missing', value: missing, color: 'text-red-500' },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-border bg-secondary/20 p-2.5 text-center">
            <p className={cn("text-lg font-bold tabular-nums", stat.color)}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
