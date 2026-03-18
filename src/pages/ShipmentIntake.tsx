import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { PacketScoreCard } from "@/components/PacketScoreCard";
import { computePacketScore } from "@/lib/packetScore";
import { ArrowLeft, Upload, X, FileText, Plane, Ship, Truck } from "lucide-react";
import type { TransportMode } from "@/types/orchestra";
import { useLanguage } from "@/hooks/useLanguage";

const DOC_TYPES = [
  { value: 'commercial_invoice', label: 'Commercial Invoice' },
  { value: 'packing_list', label: 'Packing List' },
  { value: 'bill_of_lading', label: 'Bill of Lading' },
  { value: 'air_waybill', label: 'Air Waybill' },
  { value: 'certificate_of_origin', label: 'Certificate of Origin' },
  { value: 'dangerous_goods_declaration', label: 'Dangerous Goods Declaration' },
  { value: 'export_license', label: 'Export License' },
  { value: 'import_permit', label: 'Import Permit' },
  { value: 'customs_declaration', label: 'Customs Declaration' },
  { value: 'inspection_certificate', label: 'Inspection Certificate' },
  { value: 'insurance_certificate', label: 'Insurance Certificate' },
  { value: 'multimodal_transport_doc', label: 'Multimodal Transport Doc' },
  { value: 'other', label: 'Other' },
] as const;

const COO_OPTIONS = [
  { value: 'attached', label: 'Attached' },
  { value: 'pending', label: 'Pending' },
  { value: 'not_required', label: 'Not Required' },
  { value: 'unknown', label: 'Unknown' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const INCOTERMS = ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'];

interface UploadedDoc {
  file: File;
  docType: string;
  id: string;
}

export default function ShipmentIntake() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    shipment_id: '',
    direction: 'inbound' as 'inbound' | 'outbound',
    origin_country: '',
    destination_country: '',
    import_country: '',
    export_country: '',
    mode: 'sea' as TransportMode,
    port_of_entry: '',
    description: '',
    quantity: '',
    declared_value: '',
    currency: 'USD',
    incoterm: '',
    consignee: '',
    shipper: '',
    hs_code: '',
    broker_id: '',
    assigned_broker: '',
    forwarder: '',
    coo_status: 'unknown',
    filing_status: 'not_filed',
    priority: 'normal',
    planned_departure: '',
    estimated_arrival: '',
    jurisdiction_code: 'US',
  });

  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('commercial_invoice');

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brokers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const uploadedDocTypes = docs.map(d => d.docType);

  const packetScore = computePacketScore(
    uploadedDocTypes,
    form.mode,
    form.jurisdiction_code,
    {
      description: form.description,
      quantity: form.quantity ? parseInt(form.quantity) : undefined,
      declared_value: form.declared_value ? parseFloat(form.declared_value) : undefined,
      hs_code: form.hs_code,
      consignee: form.consignee,
      shipper: form.shipper,
      assigned_broker: form.assigned_broker,
      coo_status: form.coo_status,
      origin_country: form.origin_country,
    }
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      setDocs(prev => [...prev, { file, docType: selectedDocType, id: crypto.randomUUID() }]);
    });
  }, [selectedDocType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      setDocs(prev => [...prev, { file, docType: selectedDocType, id: crypto.randomUUID() }]);
    });
    e.target.value = '';
  };

  const removeDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!form.shipment_id || !form.destination_country || !form.description) {
        throw new Error("Shipment ID, destination country, and description are required");
      }

      // Create shipment
      const { error: shipErr } = await supabase.from("shipments").insert({
        shipment_id: form.shipment_id,
        mode: form.mode,
        description: form.description,
        consignee: form.consignee || 'TBD',
        hs_code: form.hs_code || '0000.00',
        declared_value: form.declared_value ? parseFloat(form.declared_value) : 0,
        status: 'new' as any,
        direction: form.direction as any,
        origin_country: form.origin_country || null,
        destination_country: form.destination_country,
        jurisdiction_code: form.jurisdiction_code,
        assigned_broker: form.assigned_broker || null,
        broker_id: form.broker_id || null,
        import_country: form.import_country || null,
        export_country: form.export_country || null,
        port_of_entry: form.port_of_entry || null,
        incoterm: form.incoterm || null,
        shipper: form.shipper || null,
        forwarder: form.forwarder || null,
        coo_status: form.coo_status,
        filing_status: form.filing_status,
        priority: form.priority,
        planned_departure: form.planned_departure || null,
        estimated_arrival: form.estimated_arrival || null,
        currency: form.currency,
        quantity: form.quantity ? parseInt(form.quantity) : null,
        packet_score: packetScore.overallScore,
        filing_readiness: packetScore.filingReadiness,
      } as any);
      if (shipErr) throw shipErr;

      // Upload documents
      for (const doc of docs) {
        const filePath = `${form.shipment_id}/${doc.docType}/${doc.file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from('shipment-documents')
          .upload(filePath, doc.file);
        if (uploadErr) throw uploadErr;

        const { error: docErr } = await supabase.from("shipment_documents" as any).insert({
          shipment_id: form.shipment_id,
          document_type: doc.docType,
          file_name: doc.file.name,
          file_path: filePath,
          file_size: doc.file.size,
          uploaded_by: user?.id,
        } as any);
        if (docErr) throw docErr;
      }

      // Log creation event
      await supabase.from("shipment_events").insert({
        shipment_id: form.shipment_id,
        event_type: 'shipment_created',
        description: `Shipment created via intake. Packet score: ${packetScore.overallScore}. Filing readiness: ${packetScore.filingReadiness}.`,
        user_id: user?.id,
        confidence_level: 100,
        evidence_quality: 'confirmed',
      });

      return form.shipment_id;
    },
    onSuccess: (id) => {
      toast({ title: "Shipment created", description: `${id} has been submitted.` });
      navigate(`/shipment/${id}`);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold font-mono">{t("intake.pageTitle")}</h1>
          <Badge variant="outline" className="font-mono text-[10px]">{t("shipment.intake")}</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Core Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm">{t("intake.shipmentDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.shipmentId")} *</Label>
                  <Input value={form.shipment_id} onChange={e => updateField('shipment_id', e.target.value)} placeholder="ORC-XXX" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Direction *</Label>
                  <Select value={form.direction} onValueChange={v => updateField('direction', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbound">↓ Inbound (Import)</SelectItem>
                      <SelectItem value="outbound">↑ Outbound (Export)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Mode *</Label>
                  <Select value={form.mode} onValueChange={v => updateField('mode', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="air"><span className="flex items-center gap-2"><Plane size={12} /> Air</span></SelectItem>
                      <SelectItem value="sea"><span className="flex items-center gap-2"><Ship size={12} /> Sea</span></SelectItem>
                      <SelectItem value="land"><span className="flex items-center gap-2"><Truck size={12} /> Land</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Origin Country</Label>
                  <Input value={form.origin_country} onChange={e => updateField('origin_country', e.target.value)} placeholder="CN" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Destination Country *</Label>
                  <Input value={form.destination_country} onChange={e => updateField('destination_country', e.target.value)} placeholder="US" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Import Country</Label>
                  <Input value={form.import_country} onChange={e => updateField('import_country', e.target.value)} placeholder="US" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Export Country</Label>
                  <Input value={form.export_country} onChange={e => updateField('export_country', e.target.value)} placeholder="CN" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Port / Airport / Border</Label>
                  <Input value={form.port_of_entry} onChange={e => updateField('port_of_entry', e.target.value)} placeholder="Port of Los Angeles" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Jurisdiction</Label>
                  <Select value={form.jurisdiction_code} onValueChange={v => updateField('jurisdiction_code', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="MX">Mexico</SelectItem>
                      <SelectItem value="EU">EU (General)</SelectItem>
                      <SelectItem value="ES">Spain</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="IT">Italy</SelectItem>
                      <SelectItem value="NL">Netherlands</SelectItem>
                      <SelectItem value="CO">Colombia</SelectItem>
                      <SelectItem value="BR">Brazil</SelectItem>
                      <SelectItem value="PA">Panama</SelectItem>
                      <SelectItem value="CN">China</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs font-mono">Commodity Description *</Label>
                  <Textarea value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Detailed product description..." rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">HS Code</Label>
                  <Input value={form.hs_code} onChange={e => updateField('hs_code', e.target.value)} placeholder="8471.30" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Quantity</Label>
                  <Input type="number" value={form.quantity} onChange={e => updateField('quantity', e.target.value)} placeholder="100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Declared Value</Label>
                  <Input type="number" value={form.declared_value} onChange={e => updateField('declared_value', e.target.value)} placeholder="50000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Currency</Label>
                  <Select value={form.currency} onValueChange={v => updateField('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                      <SelectItem value="MXN">MXN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Incoterm</Label>
                  <Select value={form.incoterm} onValueChange={v => updateField('incoterm', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {INCOTERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Consignee</Label>
                  <Input value={form.consignee} onChange={e => updateField('consignee', e.target.value)} placeholder="Company name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Shipper</Label>
                  <Input value={form.shipper} onChange={e => updateField('shipper', e.target.value)} placeholder="Shipper name" />
                </div>
              </CardContent>
            </Card>

            {/* Broker & Logistics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm">BROKER & LOGISTICS</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Assigned Broker</Label>
                  <Select value={form.broker_id} onValueChange={v => {
                    const broker = brokers.find(b => b.id === v);
                    setForm(prev => ({ ...prev, broker_id: v, assigned_broker: broker?.canonical_name || '' }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select broker..." /></SelectTrigger>
                    <SelectContent>
                      {brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.canonical_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Forwarder</Label>
                  <Input value={form.forwarder} onChange={e => updateField('forwarder', e.target.value)} placeholder="Forwarder name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">COO Status</Label>
                  <Select value={form.coo_status} onValueChange={v => updateField('coo_status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Priority</Label>
                  <Select value={form.priority} onValueChange={v => updateField('priority', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Planned Departure</Label>
                  <Input type="date" value={form.planned_departure} onChange={e => updateField('planned_departure', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Estimated Arrival</Label>
                  <Input type="date" value={form.estimated_arrival} onChange={e => updateField('estimated_arrival', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Document Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm">DOCUMENT UPLOAD</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                    <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <label className="cursor-pointer">
                    <input type="file" multiple className="hidden" onChange={handleFileSelect} accept=".pdf,.jpg,.png,.doc,.docx,.xls,.xlsx" />
                    <Button variant="outline" size="sm" className="font-mono text-xs" asChild>
                      <span><Upload size={12} className="mr-1" /> BROWSE</span>
                    </Button>
                  </label>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto mb-2 text-muted-foreground" size={24} />
                  <p className="text-sm text-muted-foreground">Drag & drop files here</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Type: {DOC_TYPES.find(d => d.value === selectedDocType)?.label}
                  </p>
                </div>

                {docs.length > 0 && (
                  <div className="space-y-2">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-2 rounded border border-border bg-secondary/30">
                        <FileText size={14} className="text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono truncate">{doc.file.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {DOC_TYPES.find(d => d.value === doc.docType)?.label} · {(doc.file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeDoc(doc.id)} className="h-6 w-6 p-0">
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !form.shipment_id || !form.destination_country || !form.description}
                className="font-mono"
              >
                {submitMutation.isPending ? 'CREATING...' : 'CREATE SHIPMENT'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="font-mono">CANCEL</Button>
            </div>
          </div>

          {/* Right: Packet Score */}
          <div className="space-y-4">
            <PacketScoreCard result={packetScore} />

            {/* Quick stats */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-mono">Documents</span>
                  <span className="font-mono font-bold">{docs.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-mono">Doc Types</span>
                  <span className="font-mono font-bold">{new Set(uploadedDocTypes).size}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-mono">Filing</span>
                  <span className="font-mono font-bold uppercase">{packetScore.filingReadiness.replace('_', ' ')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
