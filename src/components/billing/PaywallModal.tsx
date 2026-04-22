/**
 * PaywallModal — shown when a user runs out of free validation credits.
 *
 * Single plan:
 *   Team  $1,499/month (or $14,999/year) — unlimited shipments, 3 seats
 *
 * On plan selection, calls the stripe-subscription Edge Function to create
 * a Stripe Checkout Session and redirects the browser to the Stripe-hosted
 * payment page.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Zap,
  Users,
  BarChart3,
  Shield,
  FileText,
  Headphones,
  Sparkles,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  creditsUsed?: number;
}

const TEAM_FEATURES = [
  { label: "Unlimited shipment validations/month", icon: <Zap className="h-3.5 w-3.5 text-emerald-500" /> },
  { label: "7-pair AI document cross-reference", icon: <FileText className="h-3.5 w-3.5 text-emerald-500" /> },
  { label: "USMCA / IEEPA / Section 232 compliance checks", icon: <Shield className="h-3.5 w-3.5 text-emerald-500" /> },
  { label: "PAPS × Pedimento cross-reference", icon: <Shield className="h-3.5 w-3.5 text-emerald-500" /> },
  { label: "OFAC sanctions screening", icon: <Shield className="h-3.5 w-3.5 text-emerald-500" /> },
  { label: "Self-improving workspace AI (learns your shipments)", icon: <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> },
  { label: "Pre-filing validation report — PDF + Excel export", icon: <FileText className="h-3.5 w-3.5 text-emerald-500" /> },
  { label: "24-month audit trail", icon: <BarChart3 className="h-3.5 w-3.5 text-emerald-500" /> },
  { label: "3 user seats", icon: <Users className="h-3.5 w-3.5 text-emerald-500" /> },
  { label: "Priority support", icon: <Headphones className="h-3.5 w-3.5 text-emerald-500" /> },
];

export function PaywallModal({ open, onClose, creditsUsed = 5 }: PaywallModalProps) {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "stripe-subscription",
        {
          body: {
            plan: "team",
            billingCycle,
            userId: user.id,
            userEmail: user.email,
            successUrl: `${window.location.origin}/intake?subscribed=true`,
            cancelUrl: window.location.href,
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from Stripe.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start checkout. Please try again."
      );
      setLoading(false);
    }
  };

  const monthlyDisplay = billingCycle === "annual" ? "$1,250" : "$1,499";
  const annualSavings = "$2,989";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center bg-gradient-to-b from-muted/40 to-background border-b">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              You've used all {creditsUsed} free validations
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Upgrade to keep running pre-filing compliance reports. One caught
              IEEPA or Section 232 error pays for months of Orchestra AI.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center gap-2 pt-6 px-8">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              billingCycle === "monthly"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              billingCycle === "annual"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Annual
            <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500 text-white border-0">
              Save {annualSavings}
            </Badge>
          </button>
        </div>

        {/* Plan card */}
        <div className="px-8 py-6">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-lg text-foreground">Team Plan</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  US-Mexico Land Freight Compliance
                </p>
              </div>
              <Badge className="bg-primary text-primary-foreground text-[10px]">
                Most Popular
              </Badge>
            </div>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold text-foreground">{monthlyDisplay}</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            {billingCycle === "annual" && (
              <p className="text-xs text-emerald-600 font-semibold mb-4">
                $14,999 billed annually — saves {annualSavings}/year vs monthly
              </p>
            )}
            {billingCycle === "monthly" && (
              <p className="text-xs text-muted-foreground mb-4">
                $1,499/month billed monthly
              </p>
            )}

            <ul className="space-y-2 mb-6">
              {TEAM_FEATURES.map(({ label, icon }) => (
                <li key={label} className="flex items-center gap-2 text-xs text-foreground">
                  <span className="flex-shrink-0">{icon}</span>
                  {label}
                </li>
              ))}
            </ul>

            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Redirecting to Stripe...
                </span>
              ) : (
                `Subscribe — ${billingCycle === "annual" ? "$14,999/year" : "$1,499/month"}`
              )}
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-8 pb-4">
            <p className="text-xs text-destructive text-center bg-destructive/10 rounded p-2">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 bg-muted/20 border-t text-center">
          <p className="text-[11px] text-muted-foreground">
            Cancel anytime · Secured by Stripe · No filing services included · Licensed broker remains agent of record
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
