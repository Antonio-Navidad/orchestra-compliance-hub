/**
 * useCredits — manages validation credits and subscription state.
 *
 * Free tier:  5 credits (one per exceptions report generated)
 * Team:       $1,499/month or $14,999/year — subscription_tier = 'team', unlimited
 *
 * Calling deductCredit() invokes the `deduct_validation_credit` Postgres
 * function, which is atomic and returns false if the user has no credits left.
 * Any non-'free' tier is treated as unlimited both client- and server-side.
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// 'gold' and 'black' are legacy tier names from the original Starter/Team
// pricing model. The current Stripe webhook writes 'team' as the canonical
// paid tier. All three are treated as "subscribed / unlimited" everywhere.
export type SubscriptionTier = "free" | "gold" | "black" | "team";
export type PlanName = "Free" | "Starter" | "Team";

// Tiers that should be treated as paid/unlimited. Update this in one place
// if the tier naming changes again. The DB-side deduct_validation_credit RPC
// applies the same rule (any tier <> 'free' bypasses deduction).
const PAID_TIERS: SubscriptionTier[] = ["gold", "black", "team"];

export interface CreditsState {
  creditsRemaining: number;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: string;
  planName: PlanName;
  isSubscribed: boolean;   // true when tier ∈ PAID_TIERS AND status === 'active'
  isLoading: boolean;
  error: string | null;
}

export interface UseCreditsReturn extends CreditsState {
  /** Deducts 1 credit. Returns true if success, false if out of credits. */
  deductCredit: () => Promise<boolean>;
  /** Refreshes profile data from the database. */
  refresh: () => Promise<void>;
}

export function useCredits(): UseCreditsReturn {
  const { user } = useAuth();

  const [state, setState] = useState<CreditsState>({
    creditsRemaining: 0,
    subscriptionTier: "free",
    subscriptionStatus: "inactive",
    planName: "Free",
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "credits_remaining, subscription_tier, subscription_status, plan_name"
        )
        .eq("id", user.id)
        .single();

      if (error) throw error;

      const tier = (data?.subscription_tier ?? "free") as SubscriptionTier;
      const status = data?.subscription_status ?? "inactive";
      const isSubscribed = PAID_TIERS.includes(tier) && status === "active";

      setState({
        creditsRemaining: data?.credits_remaining ?? 5,
        subscriptionTier: tier,
        subscriptionStatus: status,
        planName: (data?.plan_name ?? "Free") as PlanName,
        isSubscribed,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load profile",
      }));
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const deductCredit = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    // Subscribers are never blocked — no deduction needed
    if (state.isSubscribed) return true;

    // Optimistic update for snappy UI
    setState((s) => ({
      ...s,
      creditsRemaining: Math.max(0, s.creditsRemaining - 1),
    }));

    try {
      const { data, error } = await supabase.rpc(
        "deduct_validation_credit",
        { p_user_id: user.id }
      );

      if (error) throw error;

      // If the function returned false, credits were already 0 — revert
      if (!data) {
        setState((s) => ({
          ...s,
          creditsRemaining: 0,
        }));
        return false;
      }

      return true;
    } catch (err) {
      // Revert optimistic update on error
      setState((s) => ({
        ...s,
        creditsRemaining: s.creditsRemaining + 1,
      }));
      return false;
    }
  }, [user?.id, state.isSubscribed]);

  return {
    ...state,
    deductCredit,
    refresh: fetchProfile,
  };
}
