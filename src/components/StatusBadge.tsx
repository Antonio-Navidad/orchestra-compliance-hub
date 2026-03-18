import { Badge } from "@/components/ui/badge";
import { getStatusBadgeClass } from "@/lib/compliance";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function StatusBadge({ status, size = 'sm', className, onClick }: StatusBadgeProps) {
  const { t } = useLanguage();

  // Try i18n key first, fallback to formatted status string
  const translationKey = `status.${status}`;
  const translated = t(translationKey);
  const label = translated !== translationKey
    ? translated
    : status.replace(/_/g, ' ').toUpperCase();

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-mono',
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        getStatusBadgeClass(status),
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className,
      )}
      onClick={onClick}
    >
      {label}
    </Badge>
  );
}
