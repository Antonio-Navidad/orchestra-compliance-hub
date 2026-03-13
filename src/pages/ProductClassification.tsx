import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Upload, Link as LinkIcon, AlertTriangle, CheckCircle, FileText, Loader2, Info, ShieldAlert, History } from "lucide-react";
import { toast } from "sonner";

interface ClassificationResult {
  primaryCode: string;
  primaryDescription: string;
  confidence: number;
  reasoning: string;
  alternateCodes: { code: string; description: string; confidence: number; reason: string }[];
  estimatedDutyRange?: string;
  estimatedTaxes?: string;
  requiredDocuments: string[];
  restrictedFlags?: string[];
  warnings?: string[];
  missingInfo?: string[];
  classificationId?: string;
}

export default function ProductClassification() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [weight, setWeight] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const { currentWorkspace } = useWorkspace();

  // Load recent classifications from DB
  const { data: recentClassifications = [] } = useQuery({
    queryKey: ["recent-classifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_classifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const handleClassify = async () => {
    if (!title && !description && !productUrl) {
      toast.error("Provide at least a product title, description, or URL");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("classify-product", {
        body: { title, description, materials, dimensions, weight, originCountry, destinationCountry, productUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success("Classification complete");
    } catch (e: any) {
      toast.error(e.message || "Classification failed");
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = (c: number) =>
    c >= 80 ? "text-risk-low" : c >= 60 ? "text-risk-medium" : "text-risk-critical";

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono">AI PRODUCT CLASSIFIER</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get accurate HS/HTS codes, duty estimates, and compliance flags powered by AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-mono text-muted-foreground">PRODUCT INFORMATION</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Product Title *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Stainless Steel Water Bottle 500ml" />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed product description, materials, features..." rows={3} />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Product URL</label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-3 text-muted-foreground" />
                  <Input value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://amazon.com/dp/..." className="pl-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-muted-foreground mb-1 block">Materials</label>
                  <Input value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="e.g. 304 Stainless Steel" />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground mb-1 block">Weight</label>
                  <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 350g" />
                </div>
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Dimensions</label>
                <Input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g. 25cm x 7cm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-muted-foreground mb-1 block">Origin Country</label>
                  <Input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="e.g. China" />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground mb-1 block">Destination Country</label>
                  <Input value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} placeholder="e.g. United States" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleClassify} disabled={loading} className="w-full font-mono" size="lg">
            {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Search size={16} className="mr-2" />}
            {loading ? "CLASSIFYING..." : "AI CLASSIFY"}
          </Button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <Card className="border-border bg-card">
              <CardContent className="py-16 text-center">
                <Search size={40} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">Enter product details and click <strong>AI Classify</strong> to get customs codes</p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card className="border-border bg-card">
              <CardContent className="py-16 text-center">
                <Loader2 size={40} className="mx-auto text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground font-mono">Analyzing product and determining classification...</p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* Primary Code */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-muted-foreground">PRIMARY CLASSIFICATION</p>
                      <p className="text-2xl font-bold font-mono text-primary">{result.primaryCode}</p>
                      <p className="text-sm">{result.primaryDescription}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-mono text-muted-foreground">CONFIDENCE</p>
                      <p className={`text-2xl font-bold font-mono ${confidenceColor(result.confidence)}`}>
                        {result.confidence}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 rounded bg-card border border-border">
                    <p className="text-[10px] font-mono text-muted-foreground mb-1">REASONING</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{result.reasoning}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Duty & Tax Estimates */}
              {(result.estimatedDutyRange || result.estimatedTaxes) && (
                <Card className="border-border bg-card">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] font-mono text-muted-foreground mb-2">DUTY & TAX ESTIMATES</p>
                    <div className="flex gap-6">
                      {result.estimatedDutyRange && (
                        <div>
                          <p className="text-xs text-muted-foreground">Duty Rate</p>
                          <p className="text-lg font-mono font-semibold">{result.estimatedDutyRange}</p>
                        </div>
                      )}
                      {result.estimatedTaxes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Taxes/Fees</p>
                          <p className="text-lg font-mono font-semibold">{result.estimatedTaxes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Alternate Codes */}
              {result.alternateCodes?.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-mono text-muted-foreground">ALTERNATE CODES</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.alternateCodes.map((alt, i) => (
                      <div key={i} className="p-3 rounded border border-border bg-secondary/30 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-semibold">{alt.code}</p>
                          <p className="text-xs text-muted-foreground">{alt.description}</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">{alt.reason}</p>
                        </div>
                        <Badge variant="outline" className={`shrink-0 font-mono ${confidenceColor(alt.confidence)}`}>
                          {alt.confidence}%
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Required Documents */}
              {result.requiredDocuments?.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <FileText size={12} /> REQUIRED DOCUMENTS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {result.requiredDocuments.map((doc, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <CheckCircle size={12} className="text-primary shrink-0" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Warnings & Restrictions */}
              {((result.restrictedFlags?.length || 0) > 0 || (result.warnings?.length || 0) > 0) && (
                <Card className="border-risk-medium/30 bg-risk-medium/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-mono text-risk-medium flex items-center gap-1">
                      <ShieldAlert size={12} /> WARNINGS & RESTRICTIONS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.restrictedFlags?.map((flag, i) => (
                      <div key={`r-${i}`} className="flex items-start gap-2 text-sm">
                        <AlertTriangle size={14} className="text-risk-critical shrink-0 mt-0.5" />
                        <span>{flag}</span>
                      </div>
                    ))}
                    {result.warnings?.map((w, i) => (
                      <div key={`w-${i}`} className="flex items-start gap-2 text-sm">
                        <Info size={14} className="text-risk-medium shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Missing Info */}
              {(result.missingInfo?.length || 0) > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-mono text-muted-foreground">MISSING INFORMATION</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {result.missingInfo?.map((info, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <Info size={12} className="text-primary shrink-0" />
                          {info}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Recent Classifications History */}
          {!result && !loading && recentClassifications.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <History size={12} /> RECENT CLASSIFICATIONS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentClassifications.map((c: any) => (
                  <div key={c.id} className="p-3 rounded border border-border bg-secondary/30 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-primary">{c.accepted_code || "Pending"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(c.evidence as any)?.input?.title || (c.evidence as any)?.input?.description || "No title"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(c.created_at).toLocaleDateString()} · {c.status}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 font-mono ${
                      (c.confidence || 0) >= 0.8 ? "text-risk-low" : (c.confidence || 0) >= 0.6 ? "text-risk-medium" : "text-risk-critical"
                    }`}>
                      {Math.round((c.confidence || 0) * 100)}%
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
