/**
 * PaywallModal — shown when a user runs out of free validation credits.
 *
 * Presents two plans side-by-side:
 *   Starter  $299/month — up to 50 shipments/month, 1 seat
 *   Team     $499/month — unlimited shipments, 3 seats, savings dashboard
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
import { cn } from "@/lib/utils";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  creditsUsed?: number; // how many free credits they consumed
}

interface Plan {
  id: "starter" | "team";
  name: string;
  price: number;
  priceLabel: string;
  badge?: string;
  tagline: string;
  limit: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 299,
    priceLabel: "$299",
    tagline: "For small forwarders validating up to 50 shipments/month",
    limit: "Up to 50 shipments/month",
    features: [
      "BOL × Invoice × Pack list cross-match",
      "HTS pre-validation",
      "OFAC sanctions screening",
      "PGA flag detection (FDA, USDA)",
      "Printable exceptions report",
      "1 user seat",
      "Email support",
    ],
    cta: "Start Starter Plan",
    highlighted: false,
  },
  {
    id: "team",
    name: "Team",
    price: 499,
    priceLabel: "$499",
    badge: "Most Popular",
    tagline: "For growing forwarders who need unlimited validations + team access",
    limit: "Unlimited shipments",
    features: [
      "Everything in Starter",
      "Unlimited shipments/month",
      "3 user seats",
      "Savings dashboard — cumulative risk avoided",
      "Priority support (< 4hr response)",
      "Early access to new features",
    ],
    cta: "Start Team Plan",
    highlighted: true,
  },
];

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  "BOL × Invoice × Pack list cross-match": <FileText className="h-3.5 w-3.5 text-emerald-500" />,
  "HTS pre-validation": <Shield className="h-3.5 w-3.5 text-emerald-500" />,
  "OFAC sanctions screening": <Shield className="h-3.5 w-3.5 text-emerald-500" />,
  "PGA flag detection (FDA, USDA)": <Shield className="h-3.5 w-3.5 text-emerald-500" />,
  "Printable exceptions report": <FileText className="h-3.5 w-3.5 text-emerald-500" />,
  "1 user seat": <Users className="h-3.5 w-3.5 text-emerald-500" />,
  "Email support": <Headphones className="h-3.5 w-3.5 text-emerald-500" />,
  "Everything in Starter": <Sparkles className="h-3.5 w-3.5 text-primary" />,
  "Unlimited shipments/month": <Zap className="h-3.5 w-3.5 text-primary" />,
  "3 user seats": <Users className="h-3.5 w-3.5 text-primary" />,
  "Savings dashboard — cumulative risk avoided": <BarChart3 className="h-3.5 w-3.5 text-primary" />,
  "Priority support (< 4hr response)": <Headphones className="h-3.5 w-3.5 text-primary" />,
  "Early access to new features": <Sparkles className="h-3.5 w-3.5 text-primary" />,
};

export function PaywallModal({ open, onClose, creditsUsed = 5 }: PaywallModalProps) {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<"starter" | "team" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) return;
    setLoadingPlan(plan.id);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "stripe-subscription",
        {
          body: {
            plan: plan.id,
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
        err instanceof Error
          ? err.message
          : "Failed to start checkout. Please try again."
      );
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
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
              Upgrade to keep running pre-filing validation reports. Your licensed
              forwarder stays the agent of record — we just catch the errors before
              they reach ACE.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-2 gap-0 divide-x">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col p-6",
                plan.highlighted && "bg-primary/5"
              )}
            >
              {/* Plan header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-base text-foreground">
                    {plan.name}
                  </span>
                  {plan.badge && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
                      {plan.badge}
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-foreground">
                    {plan.priceLabel}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {plan.tagline}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Zap className="h-3 w-3" />
                  {plan.limit}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="mt-0.5 flex-shrink-0">
                      {FEATURE_ICONS[feature] ?? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={() => handleSelectPlan(plan)}
                disabled={loadingPlan !== null}
                variant={plan.highlighted ? "default" : "outline"}
                className="w-full font-semibold"
              >
                {loadingPlan === plan.id ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Redirecting to Stripe...
                  </span>
                ) : (
                  plan.cta
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="px-8 py-3 bg-destructive/10 border-t border-destructive/20">
            <p className="text-xs text-destructive text-center">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 bg-muted/20 border-t text-center">
          <p className="text-[11px] text-muted-foreground">
            Cancel anytime · Secured by Stripe · No filing services included
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
