import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Upload, Loader2, CheckCircle, AlertTriangle, XCircle,
  ShieldAlert, Info, Plus, Trash2
} from "lucide-react";
import { toast } from "sonner";

interface DocumentEntry {
  id: string;
  type: string;
  name: string;
  extractedFields: Record<string, string>;
}

interface ValidationResult {
  completenessScore: number;
  consistencyScore: number;
  overallReadiness: "ready" | "needs_attention" | "not_ready" | "critical";
  missingDocuments: { documentType: string; importance: string; reason: string }[];
  issues: { severity: string; field: string; description: string; suggestion: string }[];
  countryRequirements?: string[];
  recommendations: string[];
}

const DOC_TYPES = [
  "commercial_invoice", "packing_list", "bill_of_lading", "air_waybill",
  "certificate_of_origin", "customs_declaration", "export_license",
  "import_permit", "insurance_certificate", "inspection_certificate",
  "phytosanitary_certificate", "fumigation_certificate",
  "dangerous_goods_declaration", "other",
];

const readinessConfig = {
  ready: { label: "READY TO FILE", color: "text-risk-low", bg: "bg-risk-low/10 border-risk-low/30", icon: CheckCircle },
  needs_attention: { label: "NEEDS ATTENTION", color: "text-risk-medium", bg: "bg-risk-medium/10 border-risk-medium/30", icon: AlertTriangle },
  not_ready: { label: "NOT READY", color: "text-risk-high", bg: "bg-risk-high/10 border-risk-high/30", icon: XCircle },
  critical: { label: "CRITICAL ISSUES", color: "text-risk-critical", bg: "bg-risk-critical/10 border-risk-critical/30", icon: ShieldAlert },
};

export default function DocumentValidator() {
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [shipmentMode, setShipmentMode] = useState("sea");
  const [originCountry, setOriginCountry] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const addDocument = () => {
    setDocuments([...documents, { id: crypto.randomUUID(), type: "commercial_invoice", name: "", extractedFields: {} }]);
  };

  const updateDocument = (id: string, updates: Partial<DocumentEntry>) => {
    setDocuments(documents.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const removeDocument = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
  };

  const [shipmentId, setShipmentId] = useState("");

  const handleValidate = async () => {
    if (documents.length === 0) {
      toast.error("Add at least one document to validate");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("validate-documents", {
        body: { documents, shipmentMode, originCountry, destinationCountry, hsCode, declaredValue, shipmentId: shipmentId || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success("Validation complete");
    } catch (e: any) {
      toast.error(e.message || "Validation failed");
    } finally {
      setLoading(false);
    }
  };

  const severityIcon = (s: string) => {
    if (s === "critical") return <XCircle size={14} className="text-risk-critical shrink-0" />;
    if (s === "high") return <AlertTriangle size={14} className="text-risk-high shrink-0" />;
    if (s === "medium") return <AlertTriangle size={14} className="text-risk-medium shrink-0" />;
    return <Info size={14} className="text-primary shrink-0" />;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono">DOCUMENT PACKET VALIDATOR</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered validation of completeness, consistency, and customs compliance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-mono text-muted-foreground">SHIPMENT CONTEXT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Transport Mode</label>
                <Select value={shipmentMode} onValueChange={setShipmentMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="air">Air</SelectItem>
                    <SelectItem value="sea">Sea</SelectItem>
                    <SelectItem value="land">Land</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-muted-foreground mb-1 block">Origin</label>
                  <Input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="China" />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground mb-1 block">Destination</label>
                  <Input value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} placeholder="United States" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-muted-foreground mb-1 block">HS Code</label>
                  <Input value={hsCode} onChange={(e) => setHsCode(e.target.value)} placeholder="7323.93" />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground mb-1 block">Declared Value</label>
                  <Input value={declaredValue} onChange={(e) => setDeclaredValue(e.target.value)} placeholder="$25,000" />
               </div>
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1 block">Shipment ID (optional)</label>
                <Input value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} placeholder="e.g. SHP-001" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono text-muted-foreground">DOCUMENTS ({documents.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={addDocument} className="h-7 text-xs font-mono">
                <Plus size={12} className="mr-1" /> ADD
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No documents added. Click ADD to start.</p>
              )}
              {documents.map((doc) => (
                <div key={doc.id} className="p-3 border border-border rounded bg-secondary/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={doc.type} onValueChange={(v) => updateDocument(doc.id, { type: v })}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map(t => (
                          <SelectItem key={t} value={t} className="text-xs">{t.replace(/_/g, " ").toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-risk-critical">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <Input
                    value={doc.name}
                    onChange={(e) => updateDocument(doc.id, { name: e.target.value })}
                    placeholder="Document name or reference"
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button onClick={handleValidate} disabled={loading} className="w-full font-mono" size="lg">
            {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileText size={16} className="mr-2" />}
            {loading ? "VALIDATING..." : "VALIDATE PACKET"}
          </Button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <Card className="border-border bg-card">
              <CardContent className="py-16 text-center">
                <FileText size={40} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">Add documents and shipment context, then click <strong>Validate Packet</strong></p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card className="border-border bg-card">
              <CardContent className="py-16 text-center">
                <Loader2 size={40} className="mx-auto text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground font-mono">Analyzing document packet...</p>
              </CardContent>
            </Card>
          )}

          {result && (() => {
            const rc = readinessConfig[result.overallReadiness];
            const StatusIcon = rc.icon;
            return (
              <>
                {/* Readiness Banner */}
                <Card className={`border ${rc.bg}`}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <StatusIcon size={24} className={rc.color} />
                      <div>
                        <p className={`text-lg font-bold font-mono ${rc.color}`}>{rc.label}</p>
                        <p className="text-xs text-muted-foreground">Based on {documents.length} document(s) analyzed</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground mb-1">COMPLETENESS</p>
                        <div className="flex items-center gap-2">
                          <Progress value={result.completenessScore} className="h-2 flex-1" />
                          <span className="font-mono text-sm font-bold">{result.completenessScore}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground mb-1">CONSISTENCY</p>
                        <div className="flex items-center gap-2">
                          <Progress value={result.consistencyScore} className="h-2 flex-1" />
                          <span className="font-mono text-sm font-bold">{result.consistencyScore}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Issues */}
                {result.issues.length > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-muted-foreground">
                        ISSUES FOUND ({result.issues.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.issues.map((issue, i) => (
                        <div key={i} className="p-3 rounded border border-border bg-secondary/30">
                          <div className="flex items-start gap-2">
                            {severityIcon(issue.severity)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-mono uppercase">{issue.severity}</Badge>
                                <span className="text-xs font-mono text-muted-foreground">{issue.field}</span>
                              </div>
                              <p className="text-sm mt-1">{issue.description}</p>
                              <p className="text-xs text-primary mt-1">💡 {issue.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Missing Documents */}
                {result.missingDocuments.length > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-muted-foreground">MISSING DOCUMENTS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.missingDocuments.map((doc, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded border border-border">
                          <FileText size={14} className={doc.importance === "required" ? "text-risk-critical" : "text-risk-medium"} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono">{doc.documentType.replace(/_/g, " ").toUpperCase()}</span>
                              <Badge variant={doc.importance === "required" ? "destructive" : "outline"} className="text-[10px]">
                                {doc.importance}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{doc.reason}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-primary">RECOMMENDATIONS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <CheckCircle size={14} className="text-primary shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Country Requirements */}
                {(result.countryRequirements?.length || 0) > 0 && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-mono text-muted-foreground">COUNTRY-SPECIFIC REQUIREMENTS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {result.countryRequirements?.map((req, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <Info size={12} className="text-muted-foreground shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
