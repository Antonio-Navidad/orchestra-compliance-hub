import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Clock, MessageSquare, AlertTriangle, CheckCircle, FileText,
  Send, Shield, ArrowUpRight, User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AuditTimelineProps {
  shipmentId: string;
}

const eventIcons: Record<string, React.ElementType> = {
  hs_reclassification_requested: FileText,
  coo_requested: FileText,
  value_correction_initiated: AlertTriangle,
  escalated_to_compliance: Shield,
  broker_note_sent: Send,
  marked_resolved: CheckCircle,
  status_change: ArrowUpRight,
  comment: MessageSquare,
};

const eventColors: Record<string, string> = {
  hs_reclassification_requested: "text-risk-critical",
  escalated_to_compliance: "text-risk-critical",
  coo_requested: "text-risk-medium",
  value_correction_initiated: "text-risk-medium",
  broker_note_sent: "text-primary",
  marked_resolved: "text-risk-safe",
  status_change: "text-primary",
  comment: "text-muted-foreground",
};

export function AuditTimeline({ shipmentId }: AuditTimelineProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["shipment-events", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_events")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["shipment-comments", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_comments")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Merge events and comments into a unified timeline
  const timeline = [
    ...events.map((e: any) => ({ ...e, type: "event" as const })),
    ...comments.map((c: any) => ({
      ...c,
      type: "comment" as const,
      event_type: "comment",
      description: c.content,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from("shipment_comments").insert({
        shipment_id: shipmentId,
        user_id: user?.id,
        user_name: user?.email?.split("@")[0] || "User",
        content: comment.trim(),
      });
      // Also log as event
      await supabase.from("shipment_events").insert({
        shipment_id: shipmentId,
        event_type: "comment",
        description: comment.trim(),
        user_id: user?.id,
        user_name: user?.email?.split("@")[0] || "User",
      });
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["shipment-comments", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["shipment-events", shipmentId] });
      toast({ title: "Comment added" });
    } catch {
      toast({ title: "Error", description: "Failed to add comment.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs text-muted-foreground flex items-center gap-2">
          <Clock size={14} className="text-primary" />
          AUDIT TRAIL & COMMENTS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Input */}
        <div className="space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment or note... Use @name to mention team members"
            className="text-sm bg-secondary/30 border-border min-h-[60px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleComment}
              disabled={submitting || !comment.trim()}
              className="font-mono text-[10px] h-7"
            >
              <MessageSquare size={10} className="mr-1" />
              {submitting ? "SENDING..." : "ADD COMMENT"}
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-0">
          {timeline.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No activity recorded yet.</p>
          ) : (
            timeline.map((item, i) => {
              const Icon = eventIcons[item.event_type] || Clock;
              const color = eventColors[item.event_type] || "text-muted-foreground";
              return (
                <div key={item.id} className="flex gap-3 py-2.5 border-b border-border/50 last:border-0">
                  <div className={`mt-0.5 ${color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        <User size={8} /> {item.user_name || "System"}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                      {item.type === "comment" && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0">NOTE</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
