import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertTriangle, ArrowRight, Clock, User, Camera } from "lucide-react";
import { type HandoffCheckpoint, STATUS_CONFIG, CHECKPOINT_TYPE_LABELS, CONDITION_LABELS } from "@/lib/handoffData";

interface Props {
  checkpoints: HandoffCheckpoint[];
  currentCustodian: string;
}

export function CustodyTimeline({ checkpoints, currentCustodian }: Props) {
  const sorted = [...checkpoints].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono tracking-wider text-muted-foreground">CHAIN OF CUSTODY TIMELINE</p>
        <div className="flex items-center gap-1.5">
          <User size={10} className="text-primary" />
          <span className="text-[10px] font-mono text-muted-foreground">Custodian: </span>
          <span className="text-[10px] font-mono font-medium">{currentCustodian}</span>
        </div>
      </div>

      <ScrollArea className="max-h-[500px]">
        <div className="relative pl-6 space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />

          {sorted.map((cp, idx) => {
            const st = STATUS_CONFIG[cp.status];
            const isComplete = cp.status === 'completed' || cp.status === 'verified';
            const isFlagged = cp.status === 'issue_flagged';

            return (
              <div key={cp.id} className="relative pb-4">
                {/* Node */}
                <div className={`absolute left-[-13px] top-1 h-5 w-5 rounded-full flex items-center justify-center z-10 ${
                  isComplete ? 'bg-[hsl(var(--risk-safe))]/20' :
                  isFlagged ? 'bg-destructive/20' :
                  cp.status === 'upcoming' || cp.status.startsWith('awaiting') ? 'bg-primary/20' :
                  'bg-muted'
                }`}>
                  {isComplete ? <CheckCircle size={11} className="text-[hsl(var(--risk-safe))]" /> :
                   isFlagged ? <AlertTriangle size={11} className="text-destructive" /> :
                   <Clock size={11} className={cp.status === 'pending' ? "text-muted-foreground" : "text-primary"} />}
                </div>

                {/* Card */}
                <div className={`ml-4 p-2.5 rounded-lg border ${st.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-muted-foreground">#{cp.sequence}</span>
                      <span className="text-xs font-mono font-medium">{cp.name}</span>
                    </div>
                    <Badge variant="outline" className={`text-[8px] font-mono px-1 py-0 ${st.color}`}>
                      {st.label}
                    </Badge>
                  </div>

                  <p className="text-[9px] font-mono text-muted-foreground mb-1.5">
                    {CHECKPOINT_TYPE_LABELS[cp.type]} • {cp.address}
                  </p>

                  {/* Custody transfer */}
                  <div className="flex items-center gap-1.5 text-[10px] font-mono mb-1.5">
                    <span className="text-muted-foreground">{cp.sender.name}</span>
                    <ArrowRight size={9} className="text-primary" />
                    <span className="text-foreground">{cp.receiver.name}</span>
                  </div>

                  {/* Verification entries */}
                  {cp.verifications.length > 0 && (
                    <div className="space-y-1 mt-2 pt-2 border-t border-border/50">
                      {cp.verifications.map(v => (
                        <div key={v.id} className="flex items-start gap-1.5 text-[9px] font-mono">
                          {v.accepted ?
                            <CheckCircle size={9} className="text-[hsl(var(--risk-safe))] mt-0.5 shrink-0" /> :
                            <AlertTriangle size={9} className="text-destructive mt-0.5 shrink-0" />
                          }
                          <div>
                            <span className="capitalize font-medium">{v.role}</span>
                            <span className="text-muted-foreground"> — {v.verified_by} — </span>
                            <span>{CONDITION_LABELS[v.condition]}</span>
                            <span className="text-muted-foreground"> — Qty {v.quantity_confirmed}</span>
                            {v.photo_urls.length > 0 && (
                              <span className="text-primary ml-1"><Camera size={8} className="inline" /> {v.photo_urls.length}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
