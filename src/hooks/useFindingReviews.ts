import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ReviewAction = "resolved" | "accept_risk" | "approve_warning" | "override_false_positive" | "escalate" | "note";
export type ReviewStatus = "open" | "resolved" | "accepted" | "overridden" | "escalated";

export interface FindingReview {
  id: string;
  session_id: string;
  rule_id: string;
  finding_key: string;
  action: ReviewAction;
  status: ReviewStatus;
  note: string | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

const ACTION_TO_STATUS: Record<ReviewAction, ReviewStatus> = {
  resolved: "resolved",
  accept_risk: "accepted",
  approve_warning: "accepted",
  override_false_positive: "overridden",
  escalate: "escalated",
  note: "open",
};

export const ACTION_LABELS: Record<ReviewAction, string> = {
  resolved: "Mark Resolved",
  accept_risk: "Accept Risk",
  approve_warning: "Approve with Warning",
  override_false_positive: "Override — False Positive",
  escalate: "Escalate",
  note: "Add Note",
};

export function useFindingReviews(sessionId: string | null) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<FindingReview[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("finding_reviews" as any)
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch finding reviews:", error);
    } else {
      setReviews((data || []) as unknown as FindingReview[]);
    }
    setLoading(false);
  }, [sessionId]);

  const submitReview = useCallback(async (
    ruleId: string,
    findingKey: string,
    action: ReviewAction,
    note: string,
  ) => {
    if (!sessionId) { toast.error("Save the session first to record reviews"); return null; }

    const status = ACTION_TO_STATUS[action];
    const { data, error } = await supabase
      .from("finding_reviews" as any)
      .insert({
        session_id: sessionId,
        rule_id: ruleId,
        finding_key: findingKey,
        action,
        status,
        note: note.trim() || null,
        user_id: user?.id || null,
        user_email: user?.email || null,
      })
      .select("*")
      .single();

    if (error) {
      toast.error("Failed to save review");
      console.error(error);
      return null;
    }

    setReviews((prev) => [...prev, data as FindingReview]);
    toast.success(`Finding ${ACTION_LABELS[action].toLowerCase()}`);
    return data;
  }, [sessionId, user]);

  // Get latest status for a finding
  const getStatus = useCallback((ruleId: string): ReviewStatus => {
    const matching = reviews.filter((r) => r.rule_id === ruleId);
    if (matching.length === 0) return "open";
    const last = matching[matching.length - 1];
    return last.status;
  }, [reviews]);

  const getReviewsForRule = useCallback((ruleId: string): FindingReview[] => {
    return reviews.filter((r) => r.rule_id === ruleId);
  }, [reviews]);

  return { reviews, loading, fetchReviews, submitReview, getStatus, getReviewsForRule };
}
