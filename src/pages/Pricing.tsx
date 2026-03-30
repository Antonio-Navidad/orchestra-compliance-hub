import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowLeft, Check, Zap, Building2, ShieldCheck, FileText, AlertTriangle } from "lucide-react";

// ─── Pricing model ────────────────────────────────────────────────────────────
// Per-shipment pricing for freight forwarders.
// Forwarders think in per-shipment economics. Seat fees feel like overhead.
// Per-shipment feels like insurance. One ISF penalty = $10K. We charge $20.

const perShipmentTiers = [
  {
    name: "Pay-As-You-Go",
    price: "$20",
    period: "/ shipment",
    icon: Zap,
    description: "Pay only for what you validate. No monthly commitment.",
    accent: "border-border",
    badge: null,
    features: [
      "Pre-filing document validation",
      "3-way match: BOL × Invoice × Packing List",
      "HTS code pre-check + confidence score",
      "OFAC sanctions screening",
      "Green / amber / red exceptions report",
      "Print-ready PDF report",
      "Audit trail per shipment",
    ],
    cta: "Start Validating",
    ctaVariant: "outline" as const,
    highlight: false,
  },
  {
    name: "Forwarder Plan",
    price: "$299",
    period: "/ month · up to 20 shipments",
    icon: ShieldCheck,
    description: "For teams processing 10–20 shipments/month. Overage at $18/shipment.",
    accent: "border-primary/50",
    badge: "BEST VALUE",
    features: [
      "Everything in Pay-As-You-Go",
      "Up to 20 shipments included",
      "Overage at $18/shipment",
      "Team access (up to 5 seats)",
      "Batch upload: process multiple shipments",
      "30-day exception history + trend view",
      "Priority email support",
      "CSV export for internal reporting",
    ],
    cta: "Start Free Trial",
    ctaVariant: "default" as const,
    highlight: true,
  },
  {
    name: "Volume",
    price: "$799",
    period: "/ month · up to 60 shipments",
    icon: Building2,
    description: "For mid-size NVOCCs and forwarders processing 30–60 shipments/month.",
    accent: "border-slate-600/50",
    badge: null,
    features: [
      "Everything in Forwarder Plan",
      "Up to 60 shipments included",
      "Overage at $15/shipment",
      "Unlimited team seats",
      "API access for TMS/ERP integration",
      "White-label PDF reports",
      "Dedicated onboarding call",
      "SLA: 99.9% uptime guarantee",
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    highlight: false,
  },
];

const penaltyData = [
  { label: "ISF late filing penalty", value: "$10,000", color: "text-red-400" },
  { label: "ACE entry rejection + refile cost", value: "$3,000–8,000", color: "text-orange-400" },
  { label: "Cargo hold demurrage (avg 3 days)", value: "$4,500–15,000", color: "text-amber-400" },
  { label: "Orchestra validation (per shipment)", value: "$15–20", color: "text-green-400" },
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
            <h1 className="text-lg font-bold font-mono">PRICING</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-12">

        {/* Hero */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Pay per shipment.<br />
            <span className="text-primary">Stop paying per penalty.</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Orchestra is a pre-filing validation firewall for freight forwarders. Upload your docs,
            get a green/amber/red exceptions report in 90 seconds — before you touch the filing system.
          </p>
          <p className="text-xs text-muted-foreground font-mono border border-border rounded px-3 py-1.5 inline-block">
            We don't file entries. We catch errors before you do.
          </p>
        </div>

        {/* Cost comparison */}
        <div className="max-w-2xl mx-auto rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            <AlertTriangle size={12} className="inline mr-1.5" />
            The cost of not validating
          </h3>
          <div className="space-y-2">
            {penaltyData.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={`font-bold font-mono ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            A single ISF penalty pays for 500 Orchestra validations. Your margin on 5–10 shipments disappears with one bad filing.
          </p>
        </div>

        {/* Pricing tiers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {perShipmentTiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col ${tier.accent} bg-card ${tier.highlight ? "ring-1 ring-primary/50" : ""}`}
            >
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
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{tier.period}</p>
                <CardDescription className="text-xs mt-2">{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col space-y-4">
                <div className="space-y-2 flex-1">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-xs">
                      <Check size={14} className="text-green-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <Button variant={tier.ctaVariant} className="w-full font-mono text-xs mt-auto">
                  {tier.cta.toUpperCase()}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* What's included explainer */}
        <div className="max-w-3xl mx-auto space-y-4">
          <h3 className="font-mono text-center text-sm tracking-widest text-muted-foreground uppercase">
            What happens when you validate a shipment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: FileText,
                step: "01",
                title: "Upload 3 docs",
                desc: "BOL, commercial invoice, packing list. Drag and drop or connect your email.",
              },
              {
                icon: Zap,
                step: "02",
                title: "AI runs 3-way match",
                desc: "Checks consignee names, HTS codes, weights, values, and country of origin across all docs.",
              },
              {
                icon: ShieldCheck,
                step: "03",
                title: "Get exceptions report",
                desc: "Green / amber / red per document. OFAC clear or flagged. HTS recommendation. Print and act.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{item.step}</span>
                  <item.icon size={16} className="text-primary" />
                </div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legal clarification */}
        <div className="max-w-2xl mx-auto rounded-lg border border-border/50 bg-muted/20 px-5 py-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground font-mono">
            Orchestra does not file entries with CBP. We do not hold an ABI certification or customs broker license.
            We are the pre-filing validation layer — your licensed broker or forwarder remains the filing agent of record.
          </p>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto space-y-3">
          <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase text-center">Common questions</h3>
          {[
            {
              q: "Do you integrate with CargoWise or Magaya?",
              a: "Not yet. Right now you upload docs directly. CSV export is available on the Forwarder Plan. API integration is on the roadmap for Q3 2026.",
            },
            {
              q: "What if the AI flags something incorrectly?",
              a: "Every flag has a confidence score. Medium-confidence flags are marked 'Review Recommended' not 'Action Required.' You can mark any flag as reviewed with a note — it's logged in your audit trail.",
            },
            {
              q: "Is this a substitute for a licensed customs broker?",
              a: "No. Orchestra catches document errors before you file. The licensed broker or forwarder is the filing agent of record. We make their job faster and reduce their error rate.",
            },
            {
              q: "What documents do you support?",
              a: "Commercial invoice, packing list, bill of lading, air waybill, ISF 10+2, certificate of origin, FTA certificate, and entry summary. More in progress.",
            },
          ].map((item) => (
            <div key={item.q} className="rounded-lg border border-border bg-card p-4 space-y-1.5">
              <p className="text-sm font-semibold">{item.q}</p>
              <p className="text-xs text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
