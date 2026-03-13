import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin, Plus, AlertTriangle, CheckCircle, Clock, User, ArrowDown,
} from "lucide-react";
import {
  type HandoffCheckpoint, CHECKPOINT_TYPE_LABELS, STATUS_CONFIG,
} from "@/lib/handoffData";

interface Props {
  checkpoints: HandoffCheckpoint[];
  selectedId: string | null;
  progress: number;
  completedCount: number;
  currentCustodian: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

const statusIcon = (status: string) => {
  if (status === 'completed' || status === 'verified') return <CheckCircle size={11} className="text-[hsl(var(--risk-safe))]" />;
  if (status === 'issue_flagged') return <AlertTriangle size={11} className="text-destructive" />;
  if (status.startsWith('awaiting')) return <Clock size={11} className="text-[hsl(var(--risk-medium))]" />;
  if (status === 'upcoming') return <MapPin size={11} className="text-primary" />;
  return <MapPin size={11} className="text-muted-foreground" />;
};

export function CheckpointList({ checkpoints, selectedId, progress, completedCount, currentCustodian, onSelect, onAdd }: Props) {
  const sorted = [...checkpoints].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="flex flex-col h-full">
      {/* Summary header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-wider text-muted-foreground">CHAIN OF CUSTODY</span>
          <Badge variant="outline" className="text-[9px] font-mono">
            {completedCount}/{checkpoints.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5 bg-secondary" />
        <div className="flex items-center gap-1.5">
          <User size={10} className="text-primary" />
          <span className="text-[10px] font-mono text-muted-foreground">Current: </span>
          <span className="text-[10px] font-mono font-medium">{currentCustodian}</span>
        </div>
      </div>

      {/* Checkpoint list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0">
          {sorted.map((cp, idx) => {
            const st = STATUS_CONFIG[cp.status];
            const isSelected = selectedId === cp.id;
            return (
              <div key={cp.id}>
                <button
                  onClick={() => onSelect(cp.id)}
                  className={`w-full text-left p-2 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/10'
                      : 'hover:bg-secondary/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center mt-0.5">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ${
                        cp.status === 'completed' ? 'bg-[hsl(var(--risk-safe))]/20 text-[hsl(var(--risk-safe))]' :
                        cp.status === 'issue_flagged' ? 'bg-destructive/20 text-destructive' :
                        cp.status === 'upcoming' || cp.status.startsWith('awaiting') ? 'bg-primary/20 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {cp.sequence}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {statusIcon(cp.status)}
                        <span className="text-xs font-mono font-medium truncate">{cp.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-[8px] font-mono px-1 py-0 ${st.bg} ${st.color}`}>
                          {st.label}
                        </Badge>
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {CHECKPOINT_TYPE_LABELS[cp.type]}
                        </span>
                      </div>
                      <p className="text-[9px] font-mono text-muted-foreground mt-0.5 truncate">
                        {cp.sender.name} → {cp.receiver.name}
                      </p>
                    </div>
                    {cp.incident && (
                      <AlertTriangle size={12} className="text-destructive shrink-0 mt-1" />
                    )}
                  </div>
                </button>
                {idx < sorted.length - 1 && (
                  <div className="flex justify-start pl-4 py-0.5">
                    <ArrowDown size={10} className="text-muted-foreground/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border">
        <Button variant="outline" size="sm" className="w-full text-xs font-mono h-7" onClick={onAdd}>
          <Plus size={12} className="mr-1" /> Add Checkpoint
        </Button>
      </div>
    </div>
  );
}
