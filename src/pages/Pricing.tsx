import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Zap,
  Users,
  BarChart3,
  FileText,
  Headphones,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const penaltyData = [
  { label: "IEEPA 25% tariff on non-USMCA Mexican goods (EO 14194)", value: "25% of declared value", color: "text-red-400" },
  { label: "CBP penalty — negligence under 19 USC 1592", value: "Up to 4× duty shortfall", color: "text-red-400" },
  { label: "PAPS/Pedimento mismatch — border hold + delay", value: "$3,200 avg. per incident", color: "text-orange-400" },
  { label: "Section 232 steel/aluminum non-compliance", value: "$22,000 avg. per incident", color: "text-amber-400" },
  { label: "Orchestra AI annual plan", value: "$14,999/year", color: "text-emerald-400" },
];

const FEATURES: { label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Unlimited shipment validations/month", icon: Zap },
  { label: "7-pair AI document cross-reference", icon: FileText },
  { label: "USMCA / IEEPA / Section 232 compliance checks", icon: Shield },
  { label: "PAPS × Pedimento cross-reference", icon: Shield },
  { label: "OFAC sanctions screening", icon: Shield },
  { label: "Self-improving workspace AI (learns your patterns)", icon: Sparkles },
  { label: "Pre-filing validation report — PDF + Excel export", icon: FileText },
  { label: "24-month audit trail", icon: BarChart3 },
  { label: "3 user seats", icon: Users },
  { label: "Priority support", icon: Headphones },
];

const FAQ = [
  {
    q: "What documents does Orchestra AI support for Mexico land freight?",
    a: "Truck BOL/Carrier Manifest (PAPS), Commercial Invoice, Packing List, USMCA Certification of Origin, Pedimento, and Customs Bond. All six are cross-referenced against each other in 7 mandatory compliance checks.",
  },
  {
    q: "Does Orchestra AI file entries with CBP?",
    a: "No. Orchestra AI is a pre-filing validation tool. Your licensed customs broker remains the filing agent of record. We catch errors before they reach ACE — you file with confidence.",
  },
  {
    q: "How does the self-improving AI work?",
    a: "Every exception you confirm, dismiss, or override trains the AI for your specific workspace. After 90 days, your false positive rate drops below 5% and the AI prioritizes the checks most relevant to your shipment patterns.",
  },
  {
    q: "What if I process fewer than 80 shipments a month?",
    a: "Orchestra AI still catches expensive errors that show up even in low-volume operations. One prevented IEEPA duty error on a $200K shipment saves $50,000 — that's 3+ years of subscription.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Monthly plans cancel anytime. Annual plans are billed upfront — if you cancel early, you keep access through the end of your paid year.",
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!user) {
      window.location.href = "/auth?redirect=/pricing";
      return;
    }
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
        throw new Error("No checkout URL returned.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout.");
      setLoading(false);
    }
  };

  const priceDisplay = billingCycle === "annual" ? "$1,250" : "$1,499";
  const billingLabel = billingCycle === "annual" ? "$14,999 billed annually" : "$1,499 billed monthly";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            <h1 className="text-lg font-bold font-mono">PRICING</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl space-y-16">

        {/* Hero */}
        <div className="text-center space-y-4">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1">
            US-Mexico Land Freight · Customs Brokers
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            One plan. Unlimited validations.<br />
            <span className="text-primary">Built for Mexico corridor brokers.</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            Orchestra AI cross-references all six Mexico land freight documents against
            CBP requirements before you file — so your clients never face an IEEPA
            duty surprise or a border hold from a PAPS mismatch.
          </p>
        </div>

        {/* Cost comparison */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-400" />
            The cost of one compliance error
          </h3>
          <div className="space-y-3">
            {penaltyData.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between text-sm border-b border-border/40 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-muted-foreground text-xs max-w-sm">{row.label}</span>
                <span className={`font-bold font-mono text-sm shrink-0 ml-4 ${row.color}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            At 150 shipments/month, Orchestra AI's annual cost is recovered in under 3 weeks from a single caught IEEPA error.
          </p>
        </div>

        {/* Billing toggle + plan card */}
        <div className="space-y-6">
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${
                billingCycle === "annual"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Annual
              <Badge className="text-[10px] px-2 py-0 bg-emerald-500 text-white border-0">
                Save $2,989
              </Badge>
            </button>
          </div>

          <div className="max-w-md mx-auto rounded-2xl border border-primary/30 bg-primary/5 p-8 space-y-6">
            <div className="text-center space-y-1">
              <p className="font-bold text-xl">Team Plan</p>
              <p className="text-xs text-muted-foreground">US-Mexico Land Freight Compliance</p>
            </div>

            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold">{priceDisplay}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{billingLabel}</p>
              {billingCycle === "annual" && (
                <p className="text-xs text-emerald-600 font-semibold mt-1">
                  You save $2,989 vs monthly billing
                </p>
              )}
            </div>

            <ul className="space-y-3">
              {FEATURES.map(({ label, icon: Icon }) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  {label}
                </li>
              ))}
            </ul>

            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full font-semibold text-base py-5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Redirecting to Stripe...
                </span>
              ) : (
                `Get Started — ${billingCycle === "annual" ? "$14,999/year" : "$1,499/month"}`
              )}
            </Button>

            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}

            <p className="text-[11px] text-muted-foreground text-center">
              5 free validations included · Cancel anytime · Secured by Stripe
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-6">
          <h3 className="font-mono text-center text-xs tracking-widest text-muted-foreground uppercase">
            What happens when you validate a shipment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: "Upload 6 documents",
                desc: "Truck BOL, Commercial Invoice, Packing List, USMCA Cert, Pedimento, Customs Bond. Drag and drop — no formatting required.",
              },
              {
                step: "02",
                title: "AI runs 7-pair cross-reference",
                desc: "Orchestra checks every critical field across all document pairs — PAPS vs Pedimento, HTS vs USMCA, bond sufficiency, IEEPA exposure — in under 2 minutes.",
              },
              {
                step: "03",
                title: "Pre-filing validation report",
                desc: "Ranked exceptions with severity, financial exposure estimate, CBP regulation citation, and recommended fix. Export as PDF or Excel before you file.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-border bg-card p-5 space-y-2">
                <span className="font-mono text-xs text-muted-foreground">{item.step}</span>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <h3 className="font-mono text-center text-xs tracking-widest text-muted-foreground uppercase">
            Common questions
          </h3>
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-sm font-semibold">{item.q}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        {/* Legal */}
        <div className="max-w-2xl mx-auto rounded-lg border border-border/50 bg-muted/20 px-5 py-4 text-center">
          <p className="text-xs text-muted-foreground font-mono">
            Orchestra AI does not file entries with CBP. We do not hold an ABI certification or customs broker license.
            We are the pre-filing validation layer — your licensed customs broker remains the filing agent of record.
          </p>
        </div>

      </main>
    </div>
  );
}
