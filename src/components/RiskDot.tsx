import { getRiskLevel, getStatusSeverity, getRiskBgClass, type RiskSeverity } from "@/lib/compliance";
import { cn } from "@/lib/utils";

interface RiskDotProps {
  /** Provide score OR status — score takes precedence */
  score?: number;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const SIZE_MAP = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-2.5 h-2.5' };

export function RiskDot({ score, status, size = 'md', pulse, className }: RiskDotProps) {
  const severity: RiskSeverity = score != null ? getRiskLevel(score) : getStatusSeverity(status || '');
  const shouldPulse = pulse ?? severity === 'critical';

  return (
    <span
      className={cn(
        'inline-block rounded-full shrink-0',
        SIZE_MAP[size],
        getRiskBgClass(severity),
        shouldPulse && 'animate-pulse',
        className,
      )}
    />
  );
}
