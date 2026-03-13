import { Badge } from "@/components/ui/badge";
import { getRiskLevel, getRiskLabel, getRiskBadgeClass } from "@/lib/compliance";
import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  score: number;
  showScore?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function RiskBadge({ score, showScore = true, size = 'md', className }: RiskBadgeProps) {
  const level = getRiskLevel(score);
  const label = getRiskLabel(score);

  return (
    <Badge
      variant="outline"
      className={cn(
        getRiskBadgeClass(level),
        'font-mono',
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className,
      )}
    >
      {showScore && <span className="mr-1 font-bold">{score}</span>}
      {label}
    </Badge>
  );
}
