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
import { computePacketScore, type DocItem } from "@/lib/packetScore";
import { ArrowLeft, Upload, X, FileText, Plane, Ship, Truck, Sparkles, CheckCircle2 } from "lucide-react";
import type { TransportMode } from "@/types/orchestra";
import { useLanguage } from "@/hooks/useLanguage";

// Intake sub-components
import { OnboardingBanner } from "@/components/intake/OnboardingBanner";
import { ResetDialog } from "@/components/intake/ResetDialog";
import { SmartPreFillModal } from "@/components/intake/SmartPreFillModal";
import { HSCodeValidation, COOWarning, IncotermHint, DescriptionQualityHint } from "@/components/intake/FieldValidation";
import { FilingDeadlineTimeline } from "@/components/intake/FilingDeadlineTimeline";
import { PacketScoreGauge } from "@/components/intake/PacketScoreGauge";
import { ComplianceCoach } from "@/components/intake/ComplianceCoach";
import { RepeatShipmentSelector } from "@/components/intake/RepeatShipmentSelector";
import { PreSubmissionGate } from "@/components/intake/PreSubmissionGate";
import { PacketItemDrawer } from "@/components/intake/PacketItemDrawer";
import { PacketScoreCard } from "@/components/PacketScoreCard";
import { MultiHSCodeField } from "@/components/intake/MultiHSCodeField";
import { IntakeExportButton } from "@/components/intake/IntakeExportButton";

// Collapsible for packet layers
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2 as CheckIcon, XCircle, AlertTriangle, MinusCircle, HelpCircle } from "lucide-react";

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
  { value: 'potentially_eligible', label: 'Potentially Eligible' },
  { value: 'unknown', label: 'Unknown' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const INCOTERMS = ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'];

function generateShipmentId() {
  return `ORC-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

const INITIAL_FORM = {
  shipment_id: generateShipmentId(),
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
};

interface UploadedDoc {
  file: File;
  docType: string;
  id: string;
}

export default function ShipmentIntake() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [hsCodes, setHsCodes] = useState<string[]>([]);
  const [aiSuggestedHS, setAiSuggestedHS] = useState<string[]>([]);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('commercial_invoice');
  const [showPreFill, setShowPreFill] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [selectedPacketItem, setSelectedPacketItem] = useState<DocItem | null>(null);
  const [packetDrawerOpen, setPacketDrawerOpen] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<Set<number>>(new Set());
  const [hsValidationResult, setHsValidationResult] = useState<any>(null);

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

  const applyPreFill = (fields: Record<string, string>) => {
    const fieldMap: Record<string, string> = {
      etd: 'planned_departure',
      eta: 'estimated_arrival',
      origin_country: 'origin_country',
      destination_country: 'destination_country',
      import_country: 'import_country',
      export_country: 'export_country',
      place_of_receipt: 'place_of_receipt',
      place_of_delivery: 'place_of_delivery',
      hs_code: 'hs_code',
      declared_value: 'declared_value',
      currency: 'currency',
      commodity_description: 'description',
      incoterm: 'incoterm',
      transport_mode: 'mode',
      shipper: 'shipper',
      shipper_name: 'shipper',
      consignee: 'consignee',
      consignee_name: 'consignee',
      notify_party: 'notify_party',
      bl_number: 'bl_number',
      vessel_name: 'vessel_name',
      container_number: 'container_number',
      seal_number: 'seal_number',
      port_of_loading: 'port_of_loading',
      port_of_discharge: 'port_of_discharge',
      total_pieces: 'quantity',
      total_cartons: 'quantity',
      quantity: 'quantity',
      gross_weight: 'gross_weight',
      net_weight: 'net_weight',
      total_cbm: 'volume',
      freight_charges: 'freight_charges',
      insurance_value: 'insurance_value',
      cif_value: 'cif_value',
      booking_reference: 'booking_reference',
      purchase_order: 'purchase_order',
      shippers_reference: 'shippers_reference',
      customs_entry_number: 'customs_entry_number',
    };
    const mapped: Record<string, string> = {};
    let piecesMapped = false;
    for (const [key, value] of Object.entries(fields)) {
      const formKey = fieldMap[key] || key;
      if (key === 'total_cartons' && (piecesMapped || mapped['quantity'])) continue;
      if (key === 'total_pieces') piecesMapped = true;
      // Skip address fields — only use name fields for consignee/shipper
      if (['consignee_address', 'consignee_city_state', 'consignee_country',
           'shipper_address', 'shipper_city_state', 'shipper_country'].includes(key)) continue;
      mapped[formKey] = value;
    }

    // Normalize mode to lowercase to match Select option values
    if (mapped['mode']) {
      mapped['mode'] = mapped['mode'].toLowerCase() as any;
    }

    // Normalize incoterm to uppercase to match Select option values
    if (mapped['incoterm']) {
      mapped['incoterm'] = mapped['incoterm'].toUpperCase();
    }

    // Auto-detect COO eligibility for Colombia → US
    const origin = mapped['origin_country'] || fields['origin_country'] || fields['export_country'] || '';
    const dest = mapped['destination_country'] || fields['destination_country'] || fields['import_country'] || '';
    const isColombiaToUS = 
      (origin.toUpperCase() === 'CO' || origin.toLowerCase().includes('colombia')) &&
      (dest.toUpperCase() === 'US' || dest.toLowerCase().includes('united states'));
    
    if (isColombiaToUS) {
      mapped['coo_status'] = 'potentially_eligible';
    }

    // Handle HS codes — may be comma-separated or single
    const hsValue = mapped['hs_code'] || '';
    if (hsValue) {
      const codes = hsValue.split(/[,;]/).map((c: string) => c.trim()).filter(Boolean);
      if (codes.length > 0) {
        setHsCodes(codes);
        setAiSuggestedHS(codes);
        mapped['hs_code'] = codes[0]; // Keep first as primary
      }
    }

    setForm(prev => ({ ...prev, ...mapped }));
  };

  const resetForm = () => {
    setForm({ ...INITIAL_FORM, shipment_id: generateShipmentId() });
    setHsCodes([]);
    setAiSuggestedHS([]);
    setDocs([]);
    setExpandedLayers(new Set());
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

  const toggleLayer = (idx: number) => {
    const next = new Set(expandedLayers);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setExpandedLayers(next);
  };

  const handleItemClick = (item: DocItem) => {
    setSelectedPacketItem(item);
    setPacketDrawerOpen(true);
  };

  const doCreate = async () => {
    if (!form.shipment_id || !form.destination_country || !form.description) {
      toast({ title: "Error", description: "Shipment ID, destination country, and description are required", variant: "destructive" });
      return;
    }

    try {
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

      for (const doc of docs) {
        const filePath = `${form.shipment_id}/${doc.docType}/${doc.file.name}`;
        const { error: uploadErr } = await supabase.storage.from('shipment-documents').upload(filePath, doc.file);
        if (uploadErr) throw uploadErr;
        await supabase.from("shipment_documents" as any).insert({
          shipment_id: form.shipment_id,
          document_type: doc.docType,
          file_name: doc.file.name,
          file_path: filePath,
          file_size: doc.file.size,
          uploaded_by: user?.id,
        } as any);
      }

      await supabase.from("shipment_events").insert({
        shipment_id: form.shipment_id,
        event_type: 'shipment_created',
        description: `Shipment created via AI intake. Packet score: ${packetScore.overallScore}%. Filing readiness: ${packetScore.filingReadiness}. ${packetScore.topMissing.length} missing items.`,
        user_id: user?.id,
        confidence_level: 100,
        evidence_quality: 'confirmed',
      });

      toast({
        title: `Shipment ${form.shipment_id} created`,
        description: (
          <div className="space-y-1 text-xs">
            <p>Compliance readiness: {packetScore.overallScore}%</p>
            {packetScore.topMissing.length > 0 && (
              <p className="text-risk-high">Next: Upload {packetScore.topMissing[0]}</p>
            )}
          </div>
        ),
      });
      navigate(`/shipment/${form.shipment_id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateClick = () => {
    if (!form.shipment_id || !form.destination_country || !form.description) {
      toast({ title: "Error", description: "Shipment ID, destination country, and description are required", variant: "destructive" });
      return;
    }
    setShowGate(true);
  };

  function statusIcon(status: string) {
    switch (status) {
      case 'present': return <CheckIcon size={13} className="text-risk-safe" />;
      case 'missing': return <XCircle size={13} className="text-risk-critical" />;
      case 'inconsistent': return <AlertTriangle size={13} className="text-risk-medium" />;
      case 'low_confidence': return <HelpCircle size={13} className="text-risk-high" />;
      case 'not_applicable': return <MinusCircle size={13} className="text-muted-foreground" />;
      case 'optional_present': return <CheckIcon size={13} className="text-muted-foreground" />;
      default: return null;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold font-mono">{t("intake.pageTitle")}</h1>
          <Badge variant="outline" className="font-mono text-[10px]">{t("shipment.intake")}</Badge>
          <div className="ml-auto flex items-center gap-2">
            <ResetDialog onReset={resetForm} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <OnboardingBanner />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pre-fill buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setShowPreFill(true)} variant="outline" className="font-mono text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                <Sparkles size={12} /> Smart Pre-fill from Documents
              </Button>
              <RepeatShipmentSelector onSelect={applyPreFill} />
            </div>

            {/* Core Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm">{t("intake.shipmentDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5" data-field="shipment_id">
                  <Label className="text-xs font-mono">{t("intake.shipmentId")} *</Label>
                  <Input value={form.shipment_id} onChange={e => updateField('shipment_id', e.target.value)} placeholder="ORC-XXX" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.direction")} *</Label>
                  <Select value={form.direction} onValueChange={v => updateField('direction', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbound">↓ {t("intake.inbound")}</SelectItem>
                      <SelectItem value="outbound">↑ {t("intake.outbound")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.mode")} *</Label>
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
                  <Label className="text-xs font-mono">{t("intake.originCountry")}</Label>
                  <Input value={form.origin_country} onChange={e => updateField('origin_country', e.target.value)} placeholder="CN" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.destCountry")} *</Label>
                  <Input value={form.destination_country} onChange={e => updateField('destination_country', e.target.value)} placeholder="US" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.importCountry")}</Label>
                  <Input value={form.import_country} onChange={e => updateField('import_country', e.target.value)} placeholder="US" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.exportCountry")}</Label>
                  <Input value={form.export_country} onChange={e => updateField('export_country', e.target.value)} placeholder="CN" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.portOfEntry")}</Label>
                  <Input value={form.port_of_entry} onChange={e => updateField('port_of_entry', e.target.value)} placeholder="Port of Los Angeles" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.jurisdiction")}</Label>
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
                <div className="md:col-span-2 space-y-1.5" data-field="description">
                  <Label className="text-xs font-mono">{t("intake.commodityDesc")} *</Label>
                  <Textarea value={form.description} onChange={e => updateField('description', e.target.value)} placeholder={t("intake.commodityPlaceholder")} rows={2} />
                  <DescriptionQualityHint description={form.description} />
                </div>
                <div className="md:col-span-2 space-y-1.5" data-field="hs_code">
                  <Label className="text-xs font-mono">{t("intake.hsCode")}</Label>
                  <MultiHSCodeField
                    hsCodes={hsCodes.length > 0 ? hsCodes : (form.hs_code ? [form.hs_code] : [])}
                    onCodesChange={(codes) => {
                      setHsCodes(codes);
                      updateField('hs_code', codes.join(', '));
                    }}
                    declaredValue={form.declared_value}
                    currency={form.currency}
                    aiSuggestions={aiSuggestedHS}
                  />
                  {hsCodes.length <= 1 && form.hs_code && (
                    <HSCodeValidation
                      hsCode={form.hs_code}
                      description={form.description}
                      destinationCountry={form.destination_country || form.jurisdiction_code}
                      declaredValue={form.declared_value}
                      currency={form.currency}
                    />
                  )}
                </div>
                <div className="space-y-1.5" data-field="quantity">
                  <Label className="text-xs font-mono">{t("intake.quantity")}</Label>
                  <Input type="number" value={form.quantity} onChange={e => updateField('quantity', e.target.value)} placeholder="100" />
                </div>
                <div className="space-y-1.5" data-field="declared_value">
                  <Label className="text-xs font-mono">{t("intake.declaredValue")}</Label>
                  <Input type="number" value={form.declared_value} onChange={e => updateField('declared_value', e.target.value)} placeholder="50000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.currency")}</Label>
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
                  <Label className="text-xs font-mono">{t("intake.incoterm")}</Label>
                  <Select value={form.incoterm} onValueChange={v => updateField('incoterm', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {INCOTERMS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <IncotermHint incoterm={form.incoterm} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.consignee")}</Label>
                  <Input value={form.consignee} onChange={e => updateField('consignee', e.target.value)} placeholder="Company name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.shipper")}</Label>
                  <Input value={form.shipper} onChange={e => updateField('shipper', e.target.value)} placeholder="Shipper name" />
                </div>
              </CardContent>
            </Card>

            {/* Broker & Logistics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm">{t("intake.brokerLogistics")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.assignedBroker")}</Label>
                  <Select value={form.broker_id} onValueChange={v => {
                    const broker = brokers.find(b => b.id === v);
                    setForm(prev => ({ ...prev, broker_id: v, assigned_broker: broker?.canonical_name || '' }));
                  }}>
                    <SelectTrigger><SelectValue placeholder={t("intake.selectBroker")} /></SelectTrigger>
                    <SelectContent>
                      {brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.canonical_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.forwarder")}</Label>
                  <Input value={form.forwarder} onChange={e => updateField('forwarder', e.target.value)} placeholder="Forwarder name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.cooStatus")}</Label>
                  <Select value={form.coo_status} onValueChange={v => updateField('coo_status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <COOWarning cooStatus={form.coo_status} destinationCountry={form.destination_country || form.jurisdiction_code} originCountry={form.origin_country} declaredValue={form.declared_value} currency={form.currency} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.priority")}</Label>
                  <Select value={form.priority} onValueChange={v => updateField('priority', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.plannedDeparture")}</Label>
                  <Input type="date" value={form.planned_departure} onChange={e => updateField('planned_departure', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">{t("intake.estimatedArrival")}</Label>
                  <Input type="date" value={form.estimated_arrival} onChange={e => updateField('estimated_arrival', e.target.value)} />
                </div>
                {form.planned_departure && form.destination_country && (
                  <div className="md:col-span-2">
                    <FilingDeadlineTimeline
                      mode={form.mode}
                      originCountry={form.origin_country}
                      destinationCountry={form.destination_country}
                      plannedDeparture={form.planned_departure}
                      estimatedArrival={form.estimated_arrival}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm">{t("intake.docUpload")}</CardTitle>
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
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto mb-2 text-muted-foreground" size={24} />
                  <p className="text-sm text-muted-foreground">{t("intake.dragDrop")}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Type: {DOC_TYPES.find(d => d.value === selectedDocType)?.label}</p>
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

            {/* AI Compliance Coach */}
            <ComplianceCoach shipmentContext={{
              originCountry: form.origin_country,
              destinationCountry: form.destination_country,
              mode: form.mode,
              hsCode: form.hs_code,
              description: form.description,
              declaredValue: form.declared_value,
              currency: form.currency,
              incoterm: form.incoterm,
              cooStatus: form.coo_status,
            }} />

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                onClick={handleCreateClick}
                disabled={!form.shipment_id || !form.destination_country || !form.description}
                className="font-mono"
              >
                {t("intake.createShipment")}
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="font-mono">{t("common.cancel").toUpperCase()}</Button>
            </div>
          </div>

          {/* Right: Compliance Readiness Panel */}
          <div className="space-y-4">
            <PacketScoreGauge
              result={packetScore}
              onResolveIssues={() => {
                // Expand all layers to show issues
                setExpandedLayers(new Set(packetScore.layers.map((_, i) => i)));
              }}
            />

            {/* Interactive packet breakdown */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h4 className="font-mono text-[10px] text-muted-foreground tracking-wider">DOCUMENT PACKET BREAKDOWN</h4>
              <div className="space-y-2">
                {packetScore.layers.map((layer, idx) => (
                  <Collapsible key={idx} open={expandedLayers.has(idx)} onOpenChange={() => toggleLayer(idx)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-3 p-2 rounded hover:bg-secondary/50 transition-colors cursor-pointer">
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono">{layer.label}</span>
                            <span className={`text-xs font-mono font-bold ${layer.score >= 80 ? 'text-risk-safe' : layer.score >= 50 ? 'text-risk-medium' : 'text-risk-critical'}`}>{layer.score}%</span>
                          </div>
                          <Progress value={layer.score} className={`h-1 mt-1 ${layer.score >= 80 ? '[&>div]:bg-risk-safe' : layer.score >= 50 ? '[&>div]:bg-risk-medium' : '[&>div]:bg-risk-critical'}`} />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">{Math.round(layer.weight * 100)}%</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-2 pb-2 space-y-0.5">
                        {layer.items.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => handleItemClick(item)}
                            className="w-full flex items-center gap-2 text-xs py-1.5 px-1 rounded hover:bg-secondary/50 transition-colors text-left"
                          >
                            {statusIcon(item.status)}
                            <span className={item.status === 'missing' && item.required ? 'text-risk-critical' : 'text-foreground'}>
                              {item.name}
                            </span>
                            <span className="text-muted-foreground text-[10px] ml-auto">
                              {item.status === 'present' ? 'Present' : item.status === 'missing' ? 'Missing' : item.status === 'low_confidence' ? 'Low Confidence' : item.status === 'not_applicable' ? 'N/A' : item.status}
                            </span>
                            {item.required && <Badge variant="outline" className="text-[9px] px-1 py-0">REQ</Badge>}
                          </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>

            {/* Export Button */}
            <IntakeExportButton form={form} docs={docs} packetScore={packetScore} className="w-full" />

            {/* Quick stats */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-mono">{t("intake.documents")}</span>
                  <span className="font-mono font-bold">{docs.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-mono">{t("intake.docTypes")}</span>
                  <span className="font-mono font-bold">{new Set(uploadedDocTypes).size}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-mono">{t("intake.filing")}</span>
                  <span className="font-mono font-bold uppercase">{packetScore.filingReadiness.replace('_', ' ')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modals */}
      <SmartPreFillModal open={showPreFill} onOpenChange={setShowPreFill} onApply={applyPreFill} />
      <PreSubmissionGate
        open={showGate}
        onOpenChange={setShowGate}
        shipmentData={{
          shipmentId: form.shipment_id,
          originCountry: form.origin_country,
          destinationCountry: form.destination_country,
          mode: form.mode,
          hsCode: form.hs_code,
          description: form.description,
          declaredValue: form.declared_value,
          currency: form.currency,
          consignee: form.consignee,
          shipper: form.shipper,
          cooStatus: form.coo_status,
          incoterm: form.incoterm,
          uploadedDocs: uploadedDocTypes,
          packetScore: packetScore.overallScore,
          missingDocs: packetScore.topMissing,
        }}
        onConfirm={doCreate}
        onForceCreate={doCreate}
      />
      <PacketItemDrawer
        open={packetDrawerOpen}
        onOpenChange={setPacketDrawerOpen}
        item={selectedPacketItem}
        jurisdictionCode={form.jurisdiction_code}
      />
    </div>
  );
}
