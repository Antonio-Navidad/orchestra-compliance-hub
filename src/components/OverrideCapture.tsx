import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

interface OverrideCaptureProps {
  entityType: string;
  entityId: string;
  fieldOverridden: string;
  originalValue: unknown;
  overrideValue: unknown;
  workspaceId?: string;
  onComplete?: () => void;
  children: React.ReactNode;
}

export function OverrideCapture({
  entityType,
  entityId,
  fieldOverridden,
  originalValue,
  overrideValue,
  workspaceId,
  onComplete,
  children,
}: OverrideCaptureProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast({ title: "Required", description: "Please provide a reason for this override.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("override_events" as any).insert({
        user_id: user?.id,
        entity_type: entityType,
        entity_id: entityId,
        field_overridden: fieldOverridden,
        original_value: JSON.stringify(originalValue),
        override_value: JSON.stringify(overrideValue),
        reason: reason.trim(),
        workspace_id: workspaceId || null,
      });

      if (error) throw error;

      toast({ title: "Override Recorded", description: "Your override has been logged for review." });
      setOpen(false);
      setReason("");
      onComplete?.();
    } catch (err) {
      toast({ title: "Error", description: "Failed to record override.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-risk-medium" />
            OVERRIDE CONFIRMATION
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Field</span>
              <span className="font-mono">{fieldOverridden}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original</span>
              <span className="font-mono text-risk-medium">{String(originalValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New Value</span>
              <span className="font-mono text-primary">{String(overrideValue)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-muted-foreground">REASON FOR OVERRIDE *</label>
            <Textarea
              placeholder="Explain why this override is appropriate..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 font-mono text-xs">
              CANCEL
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || !reason.trim()}
              className="flex-1 font-mono text-xs"
              variant="destructive"
            >
              {loading ? "RECORDING..." : "CONFIRM OVERRIDE"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
