import { Badge } from "@/components/ui/badge";
import { getRiskLevel, getRiskLabel } from "@/lib/compliance";

interface RiskBadgeProps {
  score: number;
  showScore?: boolean;
  size?: 'sm' | 'md';
}

export function RiskBadge({ score, showScore = true, size = 'md' }: RiskBadgeProps) {
  const level = getRiskLevel(score);
  const label = getRiskLabel(score);

  const colorMap: Record<string, string> = {
    critical: 'bg-risk-critical/20 text-risk-critical border-risk-critical/30',
    high: 'bg-risk-high/20 text-risk-high border-risk-high/30',
    medium: 'bg-risk-medium/20 text-risk-medium border-risk-medium/30',
    low: 'bg-risk-safe/20 text-risk-safe border-risk-safe/30',
    safe: 'bg-risk-safe/20 text-risk-safe border-risk-safe/30',
  };

  return (
    <Badge
      variant="outline"
      className={`${colorMap[level]} font-mono ${size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}`}
    >
      {showScore && <span className="mr-1 font-bold">{score}</span>}
      {label}
    </Badge>
  );
}
