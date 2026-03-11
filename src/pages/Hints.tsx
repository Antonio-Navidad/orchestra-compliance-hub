import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, ArrowLeft, Upload, BarChart3, FileSearch, Settings, Shield, Lightbulb, Navigation } from "lucide-react";

const sections = [
  {
    id: "navigate",
    icon: Navigation,
    title: "Navigate the Platform",
    steps: [
      { title: "Dashboard", desc: "Your command center. Filter shipments by Air, Sea, or Land mode. View real-time risk scores and compliance status at a glance." },
      { title: "Shipment Detail", desc: "Click any shipment ID to open the detail view. Here you see risk analysis, document comparisons, and mode-specific compliance checks." },
      { title: "Legal Knowledge", desc: "Browse the global regulations database. Laws are auto-updated via our Make.com integration or can be manually added." },
      { title: "Admin Settings", desc: "Configure the AI system prompt that drives compliance logic. Gold/Black tier users can override default rules." },
      { title: "Pricing / Subscription", desc: "View and manage your subscription tier. Upgrade to unlock advanced features like Custom Logic and the Avoided Exposure Dashboard." },
    ],
  },
  {
    id: "upload",
    icon: Upload,
    title: "Upload Documents",
    steps: [
      { title: "Go to Shipment Detail", desc: "Navigate to any shipment by clicking its ID from the dashboard." },
      { title: "Locate the PDF Upload Section", desc: "Scroll down to find the 'Document Upload' panel at the bottom of the shipment detail page." },
      { title: "Upload Your Document", desc: "Click 'Choose File' or drag & drop your commercial invoice, packing list, bill of lading, or certificate of origin." },
      { title: "AI Extraction", desc: "The system uses Google Document AI to extract HS codes, weights, values, and descriptions automatically." },
      { title: "Review Extracted Data", desc: "Compare the AI-extracted data with the original document side-by-side. Red-flagged errors will appear instantly." },
    ],
  },
  {
    id: "risk",
    icon: BarChart3,
    title: "Understand Risk Scores",
    steps: [
      { title: "Score Range 0–100", desc: "Every shipment gets a compliance risk score. 0 = perfectly clean, 100 = maximum risk of hold, penalty, or seizure." },
      { title: "Risk Drivers", desc: "The score factors in HS code accuracy, document mismatches, valuation consistency, licensing requirements, and jurisdiction severity." },
      { title: "Financial Exposure", desc: "For Gold/Black tiers: see the predicted Expected Loss and Avoided Exposure calculated from hold probability, penalty severity, and legal escalation risk." },
      { title: "Color Coding", desc: "Green (0–30) = Safe, Yellow (31–60) = Warning, Orange (61–84) = High Risk, Red (85–100) = Critical." },
    ],
  },
  {
    id: "compare",
    icon: FileSearch,
    title: "Document Comparison",
    steps: [
      { title: "Invoice vs Manifest", desc: "The comparison engine checks HS codes, quantities, weights (net & gross), values, and descriptions between your commercial invoice and shipping manifest." },
      { title: "Mismatch Detection", desc: "Any discrepancy is flagged with severity: Critical (red), Warning (yellow), or Info (blue)." },
      { title: "Example: Weight Mismatch", desc: "If your invoice says 45,000kg but the manifest says 44,200kg, that's an 800kg discrepancy — flagged as Critical because it triggers customs inspection." },
      { title: "HS Code Cross-Check", desc: "If the declared HS code doesn't match the product description (e.g., lead-acid code for lithium-ion batteries), it's flagged as a misclassification risk." },
    ],
  },
  {
    id: "data",
    icon: Settings,
    title: "Extract Backend Data",
    steps: [
      { title: "API-Ready Architecture", desc: "All shipment, invoice, manifest, and legal data is stored in structured database tables accessible via our API." },
      { title: "Export Options (Coming Soon)", desc: "Black tier users will be able to export audit reports as PDF or CSV for compliance documentation." },
      { title: "Webhook Integration", desc: "Legal knowledge is automatically updated via Make.com webhooks. Set up your own automations to push or pull data." },
      { title: "Real-Time Updates", desc: "Data syncs in real-time. Changes to shipments, risk scores, or legal rules are reflected instantly across all views." },
    ],
  },
  {
    id: "premium",
    icon: Shield,
    title: "Premium Features",
    steps: [
      { title: "Custom Logic Overrides (Gold+)", desc: "Override the AI's default compliance rules. Set country-specific import/export rules that match your organization's risk tolerance." },
      { title: "Avoided Exposure Dashboard (Gold+)", desc: "See exactly how much money Orchestra has saved you by catching errors before customs submission." },
      { title: "Human-in-the-Loop Queue (Black)", desc: "High-value or low-confidence shipments are routed to a review queue where your team can approve, reject, or escalate." },
      { title: "Jurisdiction Engine (Black)", desc: "Country-specific severity adapters for US, Mexico, EU, Colombia, Brazil, and more — each with calibrated penalty models." },
    ],
  },
];

export default function Hints() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-risk-medium" />
            <h1 className="text-lg font-bold font-mono">PLATFORM GUIDE</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="max-w-3xl mx-auto text-center space-y-2">
          <h2 className="text-2xl font-bold">How to Use Orchestra</h2>
          <p className="text-sm text-muted-foreground">
            Step-by-step walkthroughs for every feature. Select a topic below to get started.
          </p>
        </div>

        <Tabs defaultValue="navigate" className="max-w-4xl mx-auto">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/50 border border-border p-1">
            {sections.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="font-mono text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
                <s.icon size={12} /> {s.title.split(" ").slice(0, 2).join(" ").toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((section) => (
            <TabsContent key={section.id} value={section.id} className="mt-6">
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <section.icon size={20} className="text-primary" />
                    </div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold font-mono shrink-0">
                          {i + 1}
                        </div>
                        {i < section.steps.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-semibold text-sm">{step.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
