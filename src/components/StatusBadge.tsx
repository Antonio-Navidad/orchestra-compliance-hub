import { Badge } from "@/components/ui/badge";
import { getStatusBadgeClass } from "@/lib/compliance";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  new: 'NEW',
  in_transit: 'IN TRANSIT',
  in_review: 'IN REVIEW',
  waiting_docs: 'WAITING ON DOCS',
  sent_to_broker: 'SENT TO BROKER',
  customs_hold: 'CUSTOMS HOLD',
  flagged: 'FLAGGED',
  escalated: 'ESCALATED',
  corrected: 'CORRECTED',
  filed: 'FILED',
  cleared: 'CLEARED',
  closed_avoided: 'CLOSED — LOSS AVOIDED',
  closed_incident: 'CLOSED — INCIDENT',
  draft: 'DRAFT',
  pending: 'PENDING',
  blocked: 'BLOCKED',
  delayed: 'DELAYED',
  delivered: 'DELIVERED',
  exception: 'EXCEPTION',
  at_checkpoint: 'AT CHECKPOINT',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  incomplete: 'INCOMPLETE',
  inconsistent: 'INCONSISTENT',
  ready: 'READY',
  stale: 'STALE',
  caution: 'CAUTION',
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function StatusBadge({ status, size = 'sm', className, onClick }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] || status.replace(/_/g, ' ').toUpperCase();

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
