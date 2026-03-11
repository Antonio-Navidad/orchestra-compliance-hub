import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RiskBadge } from "@/components/RiskBadge";
import { ModeIcon } from "@/components/ModeIcon";
import { ComparisonView } from "@/components/ComparisonView";
import { ModeCompliancePanel } from "@/components/ModeCompliancePanel";
import { PdfUpload } from "@/components/PdfUpload";
import { compareInvoiceManifest, getRiskBgClass } from "@/lib/compliance";
import { ExposurePanel } from "@/components/ExposurePanel";
import { Shipment, Invoice, Manifest, TransportMode } from "@/types/orchestra";
import { ArrowLeft, FileText, Package, AlertTriangle, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: shipment, isLoading } = useQuery({
    queryKey: ["shipment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("shipment_id", id)
        .single();
      if (error) throw error;
      return data as unknown as Shipment;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").eq("shipment_id", id);
      if (error) throw error;
      return data as unknown as Invoice[];
    },
    enabled: !!id,
  });

  const { data: manifests = [] } = useQuery({
    queryKey: ["manifests", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("manifests").select("*").eq("shipment_id", id);
      if (error) throw error;
      return data as unknown as Manifest[];
    },
    enabled: !!id,
  });

  const invoice = invoices[0];
  const manifest = manifests[0];
  const mismatches = invoice && manifest ? compareInvoiceManifest(invoice, manifest) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-mono text-sm">LOADING SHIPMENT DATA...</div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Shipment not found</p>
          <Link to="/" className="text-primary text-sm hover:underline">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <ModeIcon mode={shipment.mode as TransportMode} className="text-primary" size={18} />
            <h1 className="text-lg font-bold font-mono">{shipment.shipment_id}</h1>
          </div>
          <RiskBadge score={shipment.risk_score} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Risk Banner */}
        {shipment.risk_score >= 60 && (
          <div className={`rounded-lg border p-4 ${getRiskBgClass(shipment.risk_score)} ${
            shipment.risk_score >= 85 ? 'border-risk-critical/30' : 'border-risk-medium/30'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className={shipment.risk_score >= 85 ? 'text-risk-critical' : 'text-risk-medium'} />
              <div>
                <p className="text-sm font-semibold">
                  {shipment.risk_score >= 85 ? 'Critical Risk Alert' : 'Compliance Warning'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{shipment.risk_notes}</p>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-secondary/50 border border-border">
            <TabsTrigger value="overview" className="font-mono text-xs">OVERVIEW</TabsTrigger>
            <TabsTrigger value="exposure" className="font-mono text-xs">
              <TrendingDown size={12} className="mr-1" /> EXPOSURE
            </TabsTrigger>
            <TabsTrigger value="documents" className="font-mono text-xs">
              <FileText size={12} className="mr-1" /> DOCUMENTS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6">
            {/* Shipment Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h3 className="font-mono text-xs text-muted-foreground">SHIPMENT INFO</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-mono uppercase">{shipment.mode}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Consignee</span><span>{shipment.consignee}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">HS Code</span><span className="font-mono">{shipment.hs_code}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Declared Value</span><span className="font-mono">${shipment.declared_value.toLocaleString()}</span></div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="font-mono text-[10px]">{shipment.status.replace('_', ' ').toUpperCase()}</Badge>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h3 className="font-mono text-xs text-muted-foreground">DESCRIPTION</h3>
                <p className="text-sm">{shipment.description}</p>
                {shipment.risk_notes && (
                  <>
                    <h3 className="font-mono text-xs text-muted-foreground mt-4">RISK ANALYSIS</h3>
                    <p className="text-sm text-muted-foreground">{shipment.risk_notes}</p>
                  </>
                )}
              </div>

              <ModeCompliancePanel mode={shipment.mode as TransportMode} />
            </div>

            {/* Comparison View */}
            <div className="space-y-3">
              <h3 className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                <FileText size={14} /> INVOICE vs MANIFEST COMPARISON
              </h3>
              {invoice && manifest ? (
                <ComparisonView mismatches={mismatches} />
              ) : (
                <div className="rounded-lg border border-border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">No invoice/manifest data available for comparison.</p>
                </div>
              )}
            </div>

            {/* Invoice & Manifest Details */}
            {(invoice || manifest) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoice && (
                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <h3 className="font-mono text-xs text-muted-foreground">INVOICE DATA</h3>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Item</span><span className="text-right max-w-[200px] truncate">{invoice.item_description}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Qty</span><span className="font-mono">{invoice.quantity}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">HS Code</span><span className="font-mono">{invoice.hs_code}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-mono">${invoice.total_value.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Net Weight</span><span className="font-mono">{invoice.net_weight_kg.toLocaleString()} kg</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Gross Weight</span><span className="font-mono">{invoice.gross_weight_kg.toLocaleString()} kg</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Exporter</span><span className="text-right max-w-[200px] truncate">{invoice.exporter_name}</span></div>
                    </div>
                  </div>
                )}
                {manifest && (
                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <h3 className="font-mono text-xs text-muted-foreground">MANIFEST DATA</h3>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Item</span><span className="text-right max-w-[200px] truncate">{manifest.item_description}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Qty</span><span className="font-mono">{manifest.quantity}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">HS Code</span><span className="font-mono">{manifest.hs_code}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-mono">${manifest.total_value.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Net Weight</span><span className="font-mono">{manifest.net_weight_kg.toLocaleString()} kg</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Gross Weight</span><span className="font-mono">{manifest.gross_weight_kg.toLocaleString()} kg</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">B/L</span><span className="font-mono">{manifest.bill_of_lading || '—'}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="exposure" className="mt-4">
            <ExposurePanel
              riskScore={shipment.risk_score}
              declaredValue={shipment.declared_value}
              jurisdictionCode="US"
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <PdfUpload shipmentId={shipment.shipment_id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
