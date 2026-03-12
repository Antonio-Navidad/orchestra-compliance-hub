import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowLeft, Check, X, Crown, Zap, Building2 } from "lucide-react";

const tiers = [
  {
    name: "Free Trial",
    price: "$0",
    period: "14 days",
    icon: Zap,
    description: "Explore core compliance scanning for small teams.",
    accent: "border-border",
    badge: null,
    features: [
      { name: "Up to 10 shipments/month", included: true },
      { name: "Basic risk scoring (0–100)", included: true },
      { name: "Invoice vs Manifest comparison", included: true },
      { name: "3 transport modes (Air/Sea/Land)", included: true },
      { name: "Community legal knowledge base", included: true },
      { name: "Custom Logic Overrides", included: true },
      { name: "Jurisdiction Severity Engine", included: true },
      { name: "Avoided Exposure Dashboard", included: true },
      { name: "Human-in-the-Loop Review Queue", included: true },
      { name: "PDF Document AI Extraction", included: true },
    ],
    missing: [
      "API / ERP Integrations",
      "Compliance Pulse™ Weekly Digest",
      "Priority Support",
    ],
    cta: "Start Free Trial",
    ctaVariant: "outline" as const,
  },
  {
    name: "Gold Tier",
    price: "$499",
    period: "/mo or $4,999/yr",
    icon: Crown,
    description: "Full compliance engine for growing import/export operations.",
    accent: "border-risk-medium/50 glow-border",
    badge: "MOST POPULAR",
    features: [
      { name: "Unlimited shipments", included: true },
      { name: "Advanced risk scoring + predictions", included: true },
      { name: "Full document comparison engine", included: true },
      { name: "HS Code AI Classification Assistant", included: true },
      { name: "Customs Valuation Risk Engine", included: true },
      { name: "License / Permit Risk Checker", included: true },
      { name: "Jurisdiction Severity Engine (5 countries)", included: true },
      { name: "Avoided Exposure Dashboard", included: true },
      { name: "PDF Document AI Extraction", included: true },
      { name: "Compliance Pulse™ Weekly Digest", included: true },
      { name: "Email Support", included: true },
    ],
    missing: [
      "Custom Logic Overrides (AI stays default)",
      "Unlimited team members",
      "API / ERP / TMS Integrations",
      "White-label audit reports",
      "Dedicated account manager",
    ],
    cta: "Upgrade to Gold",
    ctaVariant: "default" as const,
  },
  {
    name: "Black Tier",
    price: "$799",
    period: "/mo or $7,999/yr",
    icon: Building2,
    description: "Enterprise-grade control. Unlimited team. Total compliance sovereignty.",
    accent: "border-primary/50 glow-blue",
    badge: "ENTERPRISE",
    features: [
      { name: "Everything in Gold, plus:", included: true },
      { name: "Custom Logic Overrides (override AI rules)", included: true },
      { name: "Upload legal docs / URLs to update logic", included: true },
      { name: "Unlimited team members", included: true },
      { name: "All 14+ jurisdiction adapters", included: true },
      { name: "Human-in-the-Loop Review Queue", included: true },
      { name: "API / ERP / TMS / WMS Integrations", included: true },
      { name: "White-label PDF/CSV audit reports", included: true },
      { name: "Broker performance analytics", included: true },
      { name: "Recurring issue trend analysis", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "SOC 2 & custom SLA", included: true },
    ],
    missing: [],
    cta: "Upgrade to Black",
    ctaVariant: "default" as const,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            <h1 className="text-lg font-bold font-mono">SUBSCRIPTION</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Protect Your Supply Chain.<br />
            <span className="text-primary">Eliminate Compliance Risk.</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Every tier shows you what's at stake. Upgrade to unlock the full financial exposure model and take total control of your compliance fate.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <Card key={tier.name} className={`relative flex flex-col ${tier.accent} bg-card`}>
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground font-mono text-[10px] tracking-wider px-3">
                    {tier.badge}
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <tier.icon size={24} className="text-primary" />
                </div>
                <CardTitle className="font-mono text-lg">{tier.name.toUpperCase()}</CardTitle>
                <div className="flex items-baseline justify-center gap-1 mt-2">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                </div>
                <CardDescription className="text-xs mt-2">{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col space-y-4">
                {/* Included features */}
                <div className="space-y-2 flex-1">
                  {tier.features.map((f) => (
                    <div key={f.name} className="flex items-start gap-2 text-xs">
                      <Check size={14} className="text-risk-safe shrink-0 mt-0.5" />
                      <span>{f.name}</span>
                    </div>
                  ))}
                </div>

                {/* Missing features (upsell) */}
                {tier.missing.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="font-mono text-[10px] text-risk-medium tracking-wider">MISSING FEATURES</p>
                    {tier.missing.map((m) => (
                      <div key={m} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <X size={14} className="text-risk-critical/60 shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button variant={tier.ctaVariant} className="w-full font-mono text-xs mt-auto">
                  {tier.cta.toUpperCase()}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ROI callout */}
        <div className="max-w-3xl mx-auto rounded-lg border border-primary/30 bg-primary/5 p-6 text-center space-y-3">
          <h3 className="font-bold text-lg">The Cost of Not Knowing</h3>
          <p className="text-sm text-muted-foreground">
            A single customs hold averages <span className="text-primary font-bold">$15,000–$50,000</span> in delays, storage, and penalties.
            Orchestra's Avoided Exposure Engine has saved enterprises an average of <span className="text-primary font-bold">$2.3M annually</span> in prevented compliance failures.
          </p>
        </div>
      </main>
    </div>
  );
}
