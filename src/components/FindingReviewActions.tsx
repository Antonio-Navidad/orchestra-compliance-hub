import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle, ShieldAlert, AlertTriangle, MessageSquare, ArrowUpRight, ChevronDown,
} from "lucide-react";
import type { ReviewAction, ReviewStatus, FindingReview } from "@/hooks/useFindingReviews";
import { ACTION_LABELS } from "@/hooks/useFindingReviews";

interface FindingReviewActionsProps {
  ruleId: string;
  findingKey: string;
  status: ReviewStatus;
  history: FindingReview[];
  disabled?: boolean;
  onSubmit: (ruleId: string, findingKey: string, action: ReviewAction, note: string) => Promise<any>;
}

const STATUS_CONFIG: Record<ReviewStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  open: { label: "OPEN", className: "border-border text-muted-foreground", icon: AlertTriangle },
  resolved: { label: "RESOLVED", className: "border-risk-low/50 text-risk-low bg-risk-low/10", icon: CheckCircle },
  accepted: { label: "ACCEPTED", className: "border-risk-medium/50 text-risk-medium bg-risk-medium/10", icon: ShieldAlert },
  overridden: { label: "OVERRIDDEN", className: "border-primary/50 text-primary bg-primary/10", icon: ShieldAlert },
  escalated: { label: "ESCALATED", className: "border-risk-high/50 text-risk-high bg-risk-high/10", icon: ArrowUpRight },
};

export function FindingReviewActions({
  ruleId, findingKey, status, history, disabled, onSubmit,
}: FindingReviewActionsProps) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<ReviewAction>("resolved");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sc = STATUS_CONFIG[status];
  const StatusIcon = sc.icon;

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(ruleId, findingKey, action, note);
    setNote("");
    setSubmitting(false);
    setOpen(false);
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-[10px] font-mono ${sc.className}`}>
          <StatusIcon size={10} className="mr-1" />
          {sc.label}
        </Badge>

        {!disabled && (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] font-mono gap-1 px-2">
                <MessageSquare size={10} /> Review
                <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 p-3 rounded border border-border bg-card">
              <Select value={action} onValueChange={(v) => setAction(v as ReviewAction)}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ACTION_LABELS) as [ReviewAction, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs font-mono">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Add a note (required for overrides)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="text-xs"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-7 text-[10px] font-mono"
                  disabled={submitting || (action === "override_false_positive" && !note.trim())}
                  onClick={handleSubmit}
                >
                  {submitting ? "Saving..." : "Submit"}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Review history */}
      {history.length > 0 && (
        <div className="mt-1.5 space-y-1 pl-2 border-l-2 border-border ml-1">
          {history.map((r) => (
            <div key={r.id} className="text-[10px] font-mono text-muted-foreground">
              <span className="text-foreground">{ACTION_LABELS[r.action as ReviewAction] || r.action}</span>
              {r.note && <span className="ml-1">— "{r.note}"</span>}
              <span className="ml-1">({r.user_email || "system"}, {new Date(r.created_at).toLocaleString()})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
