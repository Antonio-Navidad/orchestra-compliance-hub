import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X, MapPin, User, Clock, Camera, CheckCircle, AlertTriangle,
  ArrowRight, Package, Send, Shield,
} from "lucide-react";
import {
  type HandoffCheckpoint, type ConditionStatus,
  CHECKPOINT_TYPE_LABELS, STATUS_CONFIG, CONDITION_LABELS,
} from "@/lib/handoffData";

interface Props {
  checkpoint: HandoffCheckpoint;
  onClose: () => void;
  onSenderVerify: (id: string, data: { quantity: number; condition: ConditionStatus; notes: string }) => void;
  onReceiverVerify: (id: string, data: { quantity: number; condition: ConditionStatus; notes: string; accepted: boolean }) => void;
}

export function CheckpointDrawer({ checkpoint: cp, onClose, onSenderVerify, onReceiverVerify }: Props) {
  const st = STATUS_CONFIG[cp.status];
  const [verifyRole, setVerifyRole] = useState<'sender' | 'receiver' | null>(null);
  const [vQuantity, setVQuantity] = useState(cp.quantity_expected);
  const [vCondition, setVCondition] = useState<ConditionStatus>('intact');
  const [vNotes, setVNotes] = useState('');
  const [vAccepted, setVAccepted] = useState(true);

  const handleSubmit = () => {
    if (verifyRole === 'sender') {
      onSenderVerify(cp.id, { quantity: vQuantity, condition: vCondition, notes: vNotes });
    } else if (verifyRole === 'receiver') {
      onReceiverVerify(cp.id, { quantity: vQuantity, condition: vCondition, notes: vNotes, accepted: vAccepted });
    }
    setVerifyRole(null);
    setVNotes('');
  };

  return (
    <div className="absolute top-0 right-0 w-96 h-full bg-card/95 backdrop-blur-sm border-l border-border z-30 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-mono font-bold text-primary shrink-0">
            {cp.sequence}
          </div>
          <span className="text-xs font-mono font-bold truncate">{cp.name}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={onClose}>
          <X size={14} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Status + Type */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[9px] font-mono ${st.bg} ${st.color}`}>
              {st.label.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-[9px] font-mono">
              {CHECKPOINT_TYPE_LABELS[cp.type]}
            </Badge>
            {cp.incident && (
              <Badge variant="destructive" className="text-[9px] font-mono">INCIDENT</Badge>
            )}
          </div>

          {/* Location */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">LOCATION</p>
            <div className="flex items-start gap-1.5">
              <MapPin size={11} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-mono">{cp.address}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{cp.lat.toFixed(4)}, {cp.lng.toFixed(4)}</p>
              </div>
            </div>
          </div>

          {/* Arrival */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">ARRIVAL</p>
            <div className="flex gap-4">
              <div>
                <p className="text-[9px] font-mono text-muted-foreground">PLANNED</p>
                <p className="text-xs font-mono">{new Date(cp.planned_arrival).toLocaleString()}</p>
              </div>
              {cp.actual_arrival && (
                <div>
                  <p className="text-[9px] font-mono text-muted-foreground">ACTUAL</p>
                  <p className="text-xs font-mono">{new Date(cp.actual_arrival).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sender → Receiver */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">CUSTODY TRANSFER</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 rounded border border-border bg-secondary/30">
                <p className="text-[9px] font-mono text-muted-foreground">RELEASING</p>
                <p className="text-xs font-mono font-medium">{cp.sender.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{cp.sender.team}</p>
              </div>
              <ArrowRight size={14} className="text-primary shrink-0" />
              <div className="flex-1 p-2 rounded border border-border bg-secondary/30">
                <p className="text-[9px] font-mono text-muted-foreground">RECEIVING</p>
                <p className="text-xs font-mono font-medium">{cp.receiver.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{cp.receiver.team}</p>
              </div>
            </div>
          </div>

          {/* Quantity + Condition */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded border border-border bg-secondary/30">
              <p className="text-[9px] font-mono text-muted-foreground">QUANTITY</p>
              <p className="text-sm font-mono font-bold">
                {cp.quantity_received !== undefined ? `${cp.quantity_received}/${cp.quantity_expected}` : cp.quantity_expected}
              </p>
            </div>
            <div className={`p-2 rounded border ${cp.condition !== 'intact' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-secondary/30'}`}>
              <p className="text-[9px] font-mono text-muted-foreground">CONDITION</p>
              <p className={`text-xs font-mono font-medium ${cp.condition !== 'intact' ? 'text-destructive' : ''}`}>
                {CONDITION_LABELS[cp.condition]}
              </p>
            </div>
          </div>

          {/* Verification history */}
          {cp.verifications.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">VERIFICATIONS</p>
              <div className="space-y-1.5">
                {cp.verifications.map(v => (
                  <div key={v.id} className={`p-2 rounded border text-[10px] font-mono ${
                    v.accepted ? 'border-[hsl(var(--risk-safe))]/30 bg-[hsl(var(--risk-safe))]/5' : 'border-destructive/30 bg-destructive/5'
                  }`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium capitalize">{v.role}: {v.verified_by}</span>
                      <span className="text-muted-foreground">{new Date(v.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Qty: {v.quantity_confirmed} • {CONDITION_LABELS[v.condition]} • {v.accepted ? '✓ Accepted' : '✗ Flagged'}
                    </div>
                    {v.notes && <p className="mt-0.5 text-muted-foreground italic">{v.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification Actions */}
          {verifyRole === null && (cp.status === 'upcoming' || cp.status === 'awaiting_sender' || cp.status === 'awaiting_receiver' || cp.status === 'pending') && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono text-muted-foreground tracking-wider">ACTIONS</p>
              {(cp.status === 'upcoming' || cp.status === 'pending' || cp.status === 'awaiting_sender') && (
                <Button size="sm" variant="outline" className="w-full text-xs font-mono h-8" onClick={() => setVerifyRole('sender')}>
                  <Send size={12} className="mr-1.5" /> Sender Verification
                </Button>
              )}
              {cp.status === 'awaiting_receiver' && (
                <Button size="sm" className="w-full text-xs font-mono h-8" onClick={() => setVerifyRole('receiver')}>
                  <CheckCircle size={12} className="mr-1.5" /> Receiver Verification
                </Button>
              )}
            </div>
          )}

          {/* Verification Form */}
          {verifyRole && (
            <div className="space-y-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-[10px] font-mono text-primary tracking-wider font-bold">
                {verifyRole === 'sender' ? 'SENDER RELEASE FORM' : 'RECEIVER ACCEPTANCE FORM'}
              </p>

              <div>
                <label className="text-[9px] font-mono text-muted-foreground">QUANTITY CONFIRMED</label>
                <Input
                  type="number"
                  value={vQuantity}
                  onChange={e => setVQuantity(Number(e.target.value))}
                  className="h-7 text-xs font-mono mt-0.5"
                />
              </div>

              <div>
                <label className="text-[9px] font-mono text-muted-foreground">CONDITION</label>
                <Select value={vCondition} onValueChange={v => setVCondition(v as ConditionStatus)}>
                  <SelectTrigger className="h-7 text-[10px] font-mono mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[9px] font-mono text-muted-foreground">NOTES</label>
                <Textarea
                  value={vNotes}
                  onChange={e => setVNotes(e.target.value)}
                  className="text-xs font-mono min-h-[50px] mt-0.5 resize-none"
                  placeholder="Inspection notes..."
                />
              </div>

              <Button size="sm" variant="outline" className="w-full text-xs font-mono h-7" disabled>
                <Camera size={11} className="mr-1" /> Attach Photo (coming soon)
              </Button>

              {verifyRole === 'receiver' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" className="flex-1 text-xs font-mono h-8" onClick={() => { setVAccepted(false); handleSubmit(); }}>
                    <AlertTriangle size={12} className="mr-1" /> Flag Issue
                  </Button>
                  <Button size="sm" className="flex-1 text-xs font-mono h-8" onClick={() => { setVAccepted(true); handleSubmit(); }}>
                    <CheckCircle size={12} className="mr-1" /> Accept
                  </Button>
                </div>
              )}

              {verifyRole === 'sender' && (
                <Button size="sm" className="w-full text-xs font-mono h-8" onClick={handleSubmit}>
                  <Send size={12} className="mr-1" /> Confirm Release
                </Button>
              )}

              <Button size="sm" variant="ghost" className="w-full text-[10px] font-mono h-6 text-muted-foreground" onClick={() => setVerifyRole(null)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
