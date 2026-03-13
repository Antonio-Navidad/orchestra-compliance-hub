import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ShoppingCart, Package, DollarSign, FileCheck, AlertTriangle,
  ChevronRight, ChevronLeft, CheckCircle2, Lightbulb, HelpCircle,
  Truck, Calculator, Shield, Star, BookOpen, ArrowRight
} from "lucide-react";

/* ---------- wizard steps ---------- */
const STEPS = ["Product", "Shipping", "Documents", "Review"] as const;
type Step = typeof STEPS[number];

/* ---------- common mistakes ---------- */
const COMMON_MISTAKES = [
  { title: "Wrong HS Code", desc: "Using generic codes instead of specific ones leads to higher duties or customs holds.", icon: AlertTriangle, severity: "critical" as const },
  { title: "Undervalued Goods", desc: "Declaring a lower value than actual price triggers audits and fines.", icon: DollarSign, severity: "critical" as const },
  { title: "Missing Packing List", desc: "Many sellers forget the packing list — it's required for most destinations.", icon: FileCheck, severity: "warning" as const },
  { title: "Wrong Country of Origin", desc: "Listing the seller's country instead of the manufacturing country.", icon: Shield, severity: "warning" as const },
  { title: "No Commercial Invoice", desc: "Platform receipts are not the same as commercial invoices.", icon: Package, severity: "critical" as const },
  { title: "Ignoring Import Permits", desc: "Some products need special permits (food, electronics, cosmetics).", icon: Lightbulb, severity: "info" as const },
];

const severityStyle = {
  critical: "border-destructive/40 bg-destructive/5",
  warning: "border-[hsl(var(--risk-medium))]/40 bg-[hsl(var(--risk-medium))]/5",
  info: "border-primary/30 bg-primary/5",
};

export default function MicroSellerMode() {
  const [activeTab, setActiveTab] = useState("wizard");
  const [step, setStep] = useState(0);

  // wizard state
  const [product, setProduct] = useState({ name: "", description: "", category: "", platform: "amazon" });
  const [shipping, setShipping] = useState({ origin: "CN", destination: "US", weight: "", value: "", mode: "air" });
  const [docs, setDocs] = useState({ invoice: false, packingList: false, coo: false });

  // landed cost estimator
  const [lcOrigin, setLcOrigin] = useState("CN");
  const [lcDest, setLcDest] = useState("US");
  const [lcValue, setLcValue] = useState("");
  const [lcWeight, setLcWeight] = useState("");
  const [lcResult, setLcResult] = useState<null | { duty: number; tax: number; shipping: number; total: number }>(null);

  const nextStep = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const estimateLandedCost = () => {
    const val = parseFloat(lcValue) || 0;
    const wt = parseFloat(lcWeight) || 1;
    const dutyRate = lcDest === "CO" ? 0.15 : lcDest === "US" ? 0.06 : 0.08;
    const taxRate = lcDest === "CO" ? 0.19 : lcDest === "US" ? 0.05 : 0.10;
    const shippingCost = wt * (lcDest === "CO" ? 8 : 5);
    setLcResult({
      duty: Math.round(val * dutyRate * 100) / 100,
      tax: Math.round(val * taxRate * 100) / 100,
      shipping: Math.round(shippingCost * 100) / 100,
      total: Math.round((val + val * dutyRate + val * taxRate + shippingCost) * 100) / 100,
    });
  };

  const submitWizard = () => {
    toast.success("Shipment draft created! Redirecting to classification…");
  };

  const docProgress = [docs.invoice, docs.packingList, docs.coo].filter(Boolean).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShoppingCart size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Seller Mode</h1>
          <p className="text-xs text-muted-foreground font-mono">Simple shipping for Amazon & Mercado Libre sellers</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="wizard" className="text-xs font-mono gap-1"><Package size={12} /> New Shipment</TabsTrigger>
          <TabsTrigger value="cost" className="text-xs font-mono gap-1"><Calculator size={12} /> Landed Cost</TabsTrigger>
          <TabsTrigger value="mistakes" className="text-xs font-mono gap-1"><AlertTriangle size={12} /> Common Mistakes</TabsTrigger>
          <TabsTrigger value="glossary" className="text-xs font-mono gap-1"><BookOpen size={12} /> Glossary</TabsTrigger>
        </TabsList>

        {/* ---- WIZARD ---- */}
        <TabsContent value="wizard" className="mt-4">
          {/* Step progress */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-mono shrink-0 ${
                  i < step ? "bg-[hsl(var(--risk-safe))] text-background" :
                  i === step ? "bg-primary text-primary-foreground" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {i < step ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={`text-xs font-mono hidden sm:inline ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
              </div>
            ))}
          </div>

          <Card className="border-border">
            <CardContent className="pt-6 space-y-4">
              {step === 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">What are you shipping?</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-mono">Product Name</Label>
                      <Input value={product.name} onChange={e => setProduct(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Wireless Bluetooth Earbuds" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-mono">Platform</Label>
                      <Select value={product.platform} onValueChange={v => setProduct(p => ({ ...p, platform: v }))}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amazon">Amazon FBA</SelectItem>
                          <SelectItem value="mercadolibre">Mercado Libre</SelectItem>
                          <SelectItem value="shopify">Shopify</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-mono">Description</Label>
                    <Input value={product.description} onChange={e => setProduct(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of the product" className="text-sm" />
                  </div>
                  <div className="p-3 rounded bg-primary/5 border border-primary/20">
                    <div className="flex items-start gap-2">
                      <Lightbulb size={14} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">Tip: The more detail you give, the better our AI can classify your product and estimate duties.</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Shipping details</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-mono">From</Label>
                      <Select value={shipping.origin} onValueChange={v => setShipping(s => ({ ...s, origin: v }))}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CN">China</SelectItem>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CO">Colombia</SelectItem>
                          <SelectItem value="MX">Mexico</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-mono">To</Label>
                      <Select value={shipping.destination} onValueChange={v => setShipping(s => ({ ...s, destination: v }))}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CO">Colombia</SelectItem>
                          <SelectItem value="MX">Mexico</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="JP">Japan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-mono">Weight (kg)</Label>
                      <Input type="number" value={shipping.weight} onChange={e => setShipping(s => ({ ...s, weight: e.target.value }))} placeholder="0" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-mono">Value (USD)</Label>
                      <Input type="number" value={shipping.value} onChange={e => setShipping(s => ({ ...s, value: e.target.value }))} placeholder="0" className="text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-mono">Shipping Mode</Label>
                    <div className="flex gap-2">
                      {[
                        { v: "air", l: "Air", icon: "✈️" },
                        { v: "sea", l: "Sea", icon: "🚢" },
                        { v: "land", l: "Land", icon: "🚛" },
                      ].map(m => (
                        <button
                          key={m.v}
                          onClick={() => setShipping(s => ({ ...s, mode: m.v }))}
                          className={`flex-1 py-2 rounded border text-xs font-mono transition-colors ${
                            shipping.mode === m.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {m.icon} {m.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Document checklist</h3>
                  <p className="text-xs text-muted-foreground">Check each document you have ready. Missing docs may delay your shipment.</p>
                  <Progress value={(docProgress / 3) * 100} className="h-2" />
                  <p className="text-[10px] font-mono text-muted-foreground">{docProgress}/3 documents ready</p>
                  {[
                    { key: "invoice" as const, label: "Commercial Invoice", required: true },
                    { key: "packingList" as const, label: "Packing List", required: true },
                    { key: "coo" as const, label: "Certificate of Origin", required: false },
                  ].map(d => (
                    <button
                      key={d.key}
                      onClick={() => setDocs(prev => ({ ...prev, [d.key]: !prev[d.key] }))}
                      className={`w-full flex items-center gap-3 p-3 rounded border transition-colors ${
                        docs[d.key] ? "border-[hsl(var(--risk-safe))]/50 bg-[hsl(var(--risk-safe))]/5" : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className={`h-5 w-5 rounded flex items-center justify-center ${docs[d.key] ? "bg-[hsl(var(--risk-safe))] text-background" : "bg-secondary"}`}>
                        {docs[d.key] && <CheckCircle2 size={12} />}
                      </div>
                      <span className="text-sm flex-1 text-left">{d.label}</span>
                      {d.required && <Badge variant="outline" className="text-[9px]">Required</Badge>}
                    </button>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Review your shipment</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-secondary/50 space-y-1">
                      <p className="text-[10px] font-mono text-muted-foreground">PRODUCT</p>
                      <p className="text-sm font-medium">{product.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{product.platform}</p>
                    </div>
                    <div className="p-3 rounded bg-secondary/50 space-y-1">
                      <p className="text-[10px] font-mono text-muted-foreground">ROUTE</p>
                      <p className="text-sm font-medium">{shipping.origin} → {shipping.destination}</p>
                      <p className="text-xs text-muted-foreground">{shipping.mode} • {shipping.weight || "?"}kg • ${shipping.value || "?"}</p>
                    </div>
                    <div className="p-3 rounded bg-secondary/50 space-y-1 col-span-2">
                      <p className="text-[10px] font-mono text-muted-foreground">DOCUMENTS</p>
                      <div className="flex gap-2">
                        {[
                          { k: "invoice" as const, l: "Invoice" },
                          { k: "packingList" as const, l: "Packing List" },
                          { k: "coo" as const, l: "COO" },
                        ].map(d => (
                          <Badge key={d.k} variant={docs[d.k] ? "default" : "outline"} className={`text-[10px] ${docs[d.k] ? "" : "text-destructive border-destructive/40"}`}>
                            {docs[d.k] ? "✓" : "✗"} {d.l}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  {!docs.invoice && (
                    <div className="p-3 rounded bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                      <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                      <p className="text-xs text-destructive">Missing commercial invoice — your shipment will likely be held at customs.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Nav buttons */}
              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={prevStep} disabled={step === 0} className="text-xs font-mono">
                  <ChevronLeft size={12} className="mr-1" /> Back
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button size="sm" onClick={nextStep} className="text-xs font-mono">
                    Next <ChevronRight size={12} className="ml-1" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={submitWizard} className="text-xs font-mono">
                    Create Shipment <ArrowRight size={12} className="ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- LANDED COST ---- */}
        <TabsContent value="cost" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono flex items-center gap-2"><Calculator size={14} className="text-primary" /> Landed Cost Estimator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">From</Label>
                  <Select value={lcOrigin} onValueChange={setLcOrigin}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CN">China</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CO">Colombia</SelectItem>
                      <SelectItem value="MX">Mexico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">To</Label>
                  <Select value={lcDest} onValueChange={setLcDest}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CO">Colombia</SelectItem>
                      <SelectItem value="MX">Mexico</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Product Value ($)</Label>
                  <Input type="number" value={lcValue} onChange={e => setLcValue(e.target.value)} placeholder="0" className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Weight (kg)</Label>
                  <Input type="number" value={lcWeight} onChange={e => setLcWeight(e.target.value)} placeholder="0" className="text-sm" />
                </div>
              </div>
              <Button onClick={estimateLandedCost} className="text-xs font-mono">
                <Calculator size={12} className="mr-1" /> Estimate
              </Button>
              {lcResult && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {[
                    { l: "Duty", v: lcResult.duty, c: "text-[hsl(var(--risk-medium))]" },
                    { l: "Tax", v: lcResult.tax, c: "text-[hsl(var(--risk-medium))]" },
                    { l: "Shipping", v: lcResult.shipping, c: "text-muted-foreground" },
                    { l: "Total Landed", v: lcResult.total, c: "text-primary font-bold" },
                  ].map(item => (
                    <div key={item.l} className="p-3 rounded bg-secondary/50 text-center">
                      <p className="text-[10px] font-mono text-muted-foreground">{item.l}</p>
                      <p className={`text-lg font-mono ${item.c}`}>${item.v.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- COMMON MISTAKES ---- */}
        <TabsContent value="mistakes" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMMON_MISTAKES.map((m, i) => (
              <Card key={i} className={`border ${severityStyle[m.severity]}`}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-2.5">
                    <m.icon size={16} className={
                      m.severity === "critical" ? "text-destructive shrink-0 mt-0.5" :
                      m.severity === "warning" ? "text-[hsl(var(--risk-medium))] shrink-0 mt-0.5" :
                      "text-primary shrink-0 mt-0.5"
                    } />
                    <div>
                      <p className="text-sm font-semibold">{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ---- GLOSSARY ---- */}
        <TabsContent value="glossary" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono flex items-center gap-2"><BookOpen size={14} className="text-primary" /> Shipping Glossary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { term: "HS Code", def: "Harmonized System code — a 6-10 digit number that classifies your product for customs. Getting this wrong is the #1 cause of delays." },
                  { term: "Landed Cost", def: "The total cost of your product delivered to your door: product price + shipping + duties + taxes + fees." },
                  { term: "Commercial Invoice", def: "A document describing the goods, their value, and the buyer/seller. Required by customs for every international shipment." },
                  { term: "COO (Certificate of Origin)", def: "Proves where the product was manufactured. May reduce duties under trade agreements." },
                  { term: "Incoterm", def: "International terms (like FOB, CIF, DDP) that define who pays for shipping, insurance, and duties." },
                  { term: "Customs Hold", def: "When customs stops your shipment for inspection, missing docs, or valuation questions. Can add days or weeks of delay." },
                  { term: "FBA (Fulfillment by Amazon)", def: "Amazon stores and ships your products. You still need to handle customs/import duties when shipping inventory to Amazon warehouses." },
                  { term: "Duty / Tariff", def: "A tax on imported goods, calculated as a percentage of the declared value based on the HS code." },
                ].map(g => (
                  <div key={g.term} className="p-3 rounded bg-secondary/30 border border-border">
                    <p className="text-sm font-semibold">{g.term}</p>
                    <p className="text-xs text-muted-foreground mt-1">{g.def}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
