import { useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { computePacketScore } from "@/lib/packetScore";
import { Upload, X, FileText, Sparkles, ClipboardList, ShieldCheck, FileCheck, Save, Clock, Brain } from "lucide-react";
import type { TransportMode } from "@/types/orchestra";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

import { SHIPMENT_MODES, MODE_DOC_PROFILES, getApplicableConditionalDocs, type ShipmentModeId } from "@/lib/shipmentModes";
import { ShipmentModeSelector } from "@/components/workspace/ShipmentModeSelector";
import { DocChecklistPanel } from "@/components/workspace/DocChecklistPanel";
import { ShipmentsSidebar } from "@/components/workspace/ShipmentsSidebar";
import { NewShipmentWizard, type WizardResult } from "@/components/workspace/NewShipmentWizard";
import { DocumentsTab } from "@/components/workspace/DocumentsTab";
import { DeadlineBar } from "@/components/workspace/DeadlineBar";
import { AlertDrawer } from "@/components/workspace/AlertDrawer";
import { AIVerificationTab } from "@/components/workspace/AIVerificationTab";
import { useDocExtraction } from "@/hooks/useDocExtraction";
import { calculateDeadlines, getDeadlinesWithin7Days } from "@/lib/deadlineEngine";
import { getDeadlineDrawer, type AlertDrawerData } from "@/lib/alertDrawerContent";

import { OnboardingBanner } from "@/components/intake/OnboardingBanner";
import { ResetDialog } from "@/components/intake/ResetDialog";
import { SmartPreFillModal } from "@/components/intake/SmartPreFillModal";
import { HSCodeValidation, COOWarning, IncotermHint, DescriptionQualityHint } from "@/components/intake/FieldValidation";
import { FilingDeadlineTimeline } from "@/components/intake/FilingDeadlineTimeline";
import { ComplianceCoach } from "@/components/intake/ComplianceCoach";
import { RepeatShipmentSelector } from "@/components/intake/RepeatShipmentSelector";
import { PreSubmissionGate } from "@/components/intake/PreSubmissionGate";
import { LineItemTable, type LineItem } from "@/components/intake/LineItemTable";
import { IntakeExportButton } from "@/components/intake/IntakeExportButton";

const DOC_TYPES = [
  { value: 'commercial_invoice', label: 'Commercial Invoice' },
  { value: 'packing_list', label: 'Packing List' },
  { value: 'bill_of_lading', label: 'Bill of Lading' },
  { value: 'air_waybill', label: 'Air Waybill' },
  { value: 'certificate_of_origin', label: 'Certificate of Origin' },
  { value: 'isf_filing', label: 'ISF 10+2 Filing' },
  { value: 'customs_bond', label: 'Customs Bond' },
  { value: 'entry_summary', label: 'Entry Summary (7501)' },
  { value: 'fda_prior_notice', label: 'FDA Prior Notice' },
  { value: 'aes_filing', label: 'AES/EEI Filing' },
  { value: 'dangerous_goods_declaration', label: 'Dangerous Goods Declaration' },
  { value: 'export_license', label: 'Export License' },
  { value: 'import_permit', label: 'Import Permit' },
  { value: 'in_bond_application', label: 'In-Bond Application (7512)' },
  { value: 'insurance_certificate', label: 'Insurance Certificate' },
  { value: 'other', label: 'Other' },
] as const;

const COO_OPTIONS = [
  { value: 'attached', label: 'Attached' },
  { value: 'pending', label: 'Pending' },
  { value: 'not_required', label: 'Not Required' },
  { value: 'potentially_eligible', label: 'Potentially Eligible' },
  { value: 'unknown', label: 'Unknown' },
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

  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [isNewMode, setIsNewMode] = useState(true);
  const [shipmentMode, setShipmentMode] = useState<ShipmentModeId>('ocean_import');
  const [activeTab, setActiveTab] = useState('details');
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [aiSuggestedItems, setAiSuggestedItems] = useState<Array<{ hsCode: string; description?: string }>>([]);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('commercial_invoice');
  const [showPreFill, setShowPreFill] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [deadlineDrawerOpen, setDeadlineDrawerOpen] = useState(false);
  const [deadlineDrawerData, setDeadlineDrawerData] = useState<AlertDrawerData | null>(null);

  // AI extraction pipeline
  const docExtraction = useDocExtraction({
    shipmentMode: form.mode,
    commodityType: form.description,
    countryOfOrigin: form.origin_country,
    shipmentId: form.shipment_id,
  });

  // Calculate deadlines for current shipment
  const shipmentDeadlines = useMemo(() => {
    return calculateDeadlines({
      shipmentMode: shipmentMode,
      vesselEtd: form.planned_departure || null,
      vesselEta: form.estimated_arrival || null,
    });
  }, [shipmentMode, form.planned_departure, form.estimated_arrival]);

  const urgentDeadlines = useMemo(() => getDeadlinesWithin7Days(shipmentDeadlines), [shipmentDeadlines]);

  const handleDeadlineClick = useCallback((deadline: any) => {
    const drawerData = getDeadlineDrawer(deadline);
    setDeadlineDrawerData(drawerData);
    setDeadlineDrawerOpen(true);
  }, []);

  // Fetch existing importers for autocomplete
  const { data: existingImporters = [] } = useQuery({
    queryKey: ["existing-importers"],
    queryFn: async () => {
      const { data } = await supabase.from("shipments").select("consignee").not("consignee", "is", null);
      const names = [...new Set((data || []).map((r: any) => r.consignee).filter(Boolean))];
      return names as string[];
    },
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brokers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const modeConfig = SHIPMENT_MODES.find(m => m.id === shipmentMode)!;
  const profile = MODE_DOC_PROFILES[shipmentMode];
  const conditionalDocs = getApplicableConditionalDocs(profile, form.description, form.origin_country);

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleModeChange = (newMode: ShipmentModeId) => {
    setShipmentMode(newMode);
    const config = SHIPMENT_MODES.find(m => m.id === newMode)!;
    setForm(prev => ({
      ...prev,
      mode: config.transportMode as TransportMode,
      direction: config.direction === 'transit' ? 'inbound' : config.direction,
    }));
  };

  const applyPreFill = (fields: Record<string, string>) => {
    const fieldMap: Record<string, string> = {
      etd: 'planned_departure', eta: 'estimated_arrival',
      origin_country: 'origin_country', destination_country: 'destination_country',
      import_country: 'import_country', export_country: 'export_country',
      hs_code: 'hs_code', declared_value: 'declared_value', currency: 'currency',
      commodity_description: 'description', incoterm: 'incoterm', transport_mode: 'mode',
      shipper: 'shipper', shipper_name: 'shipper', consignee: 'consignee', consignee_name: 'consignee',
      bl_number: 'bl_number', vessel_name: 'vessel_name', container_number: 'container_number',
      seal_number: 'seal_number', port_of_loading: 'port_of_loading', port_of_discharge: 'port_of_discharge',
      total_pieces: 'quantity', total_cartons: 'quantity', quantity: 'quantity',
      gross_weight: 'gross_weight', net_weight: 'net_weight', total_cbm: 'volume',
    };
    const mapped: Record<string, string> = {};
    let piecesMapped = false;
    for (const [key, value] of Object.entries(fields)) {
      const formKey = fieldMap[key] || key;
      if (key === 'total_cartons' && (piecesMapped || mapped['quantity'])) continue;
      if (key === 'total_pieces') piecesMapped = true;
      if (['consignee_address', 'consignee_city_state', 'consignee_country',
           'shipper_address', 'shipper_city_state', 'shipper_country'].includes(key)) continue;
      mapped[formKey] = value;
    }
    if (mapped['mode']) mapped['mode'] = mapped['mode'].toLowerCase() as any;
    if (mapped['incoterm']) {
      const upper = mapped['incoterm'].toUpperCase();
      mapped['incoterm'] = INCOTERMS.includes(upper) ? upper : '';
    }
    const origin = mapped['origin_country'] || fields['origin_country'] || fields['export_country'] || '';
    const dest = mapped['destination_country'] || fields['destination_country'] || fields['import_country'] || '';
    if ((origin.toUpperCase() === 'CO' || origin.toLowerCase().includes('colombia')) &&
        (dest.toUpperCase() === 'US' || dest.toLowerCase().includes('united states'))) {
      mapped['coo_status'] = 'potentially_eligible';
    }
    const hsValue = mapped['hs_code'] || '';
    if (hsValue) {
      const codes = hsValue.split(/[,;]/).map((c: string) => c.trim()).filter(Boolean);
      if (codes.length > 0) {
        setLineItems(codes.map(code => ({ id: crypto.randomUUID(), hsCode: code, description: '', quantity: '', uom: 'pcs', unitValue: '' })));
        setAiSuggestedItems(codes.map(c => ({ hsCode: c })));
        mapped['hs_code'] = codes[0];
      }
    }
    setForm(prev => ({ ...prev, ...mapped }));
  };

  const resetForm = () => {
    setForm({ ...INITIAL_FORM, shipment_id: generateShipmentId() });
    setLineItems([]);
    setAiSuggestedItems([]);
    setDocs([]);
    setActiveTab('details');
    setLastSaved(null);
  };

  const handleNewShipment = () => {
    setShowWizard(true);
  };

  const WIZARD_MODE_MAP: Record<string, ShipmentModeId> = {
    ocean_import: 'ocean_import',
    air_import: 'air_import',
    us_export: 'us_export',
    inbond_te: 'in_bond',
  };

  const handleWizardComplete = (result: WizardResult) => {
    resetForm();
    setSelectedShipmentId(null);
    setIsNewMode(true);
    setShowWizard(false);

    // Map wizard mode to shipment mode
    const modeId = WIZARD_MODE_MAP[result.shipmentMode] || 'ocean_import';
    handleModeChange(modeId);

    // Pre-fill form fields from wizard
    setForm(prev => ({
      ...prev,
      shipment_id: generateShipmentId(),
      description: result.title,
      consignee: result.importerOfRecord,
      origin_country: result.countryOfOrigin,
      port_of_entry: result.portOfEntry,
      destination_country: result.shipmentMode === 'us_export' ? '' : 'United States',
    }));

    toast({
      title: "Shipment workspace ready",
      description: `${result.title} — ${result.commodityType}`,
    });
  };

  const handleSelectShipment = async (id: string) => {
    setSelectedShipmentId(id);
    setIsNewMode(false);
    // Load shipment data
    const { data } = await supabase.from("shipments").select("*").eq("shipment_id", id).single();
    if (data) {
      setForm(prev => ({
        ...prev,
        shipment_id: data.shipment_id,
        direction: (data as any).direction || 'inbound',
        origin_country: (data as any).origin_country || '',
        destination_country: data.destination_country || '',
        import_country: (data as any).import_country || '',
        export_country: (data as any).export_country || '',
        mode: data.mode as TransportMode,
        port_of_entry: (data as any).port_of_entry || '',
        description: data.description || '',
        declared_value: data.declared_value?.toString() || '',
        currency: (data as any).currency || 'USD',
        incoterm: (data as any).incoterm || '',
        consignee: data.consignee || '',
        shipper: (data as any).shipper || '',
        hs_code: data.hs_code || '',
        broker_id: (data as any).broker_id || '',
        assigned_broker: (data as any).assigned_broker || '',
        forwarder: (data as any).forwarder || '',
        coo_status: (data as any).coo_status || 'unknown',
        filing_status: (data as any).filing_status || 'not_filed',
        priority: (data as any).priority || 'normal',
        planned_departure: (data as any).planned_departure || '',
        estimated_arrival: (data as any).estimated_arrival || '',
        jurisdiction_code: (data as any).jurisdiction_code || 'US',
      }));
      setActiveTab('details');
    }
  };

  const uploadedDocTypes = docs.map(d => d.docType);
  const packetScore = computePacketScore(
    uploadedDocTypes, form.mode, form.jurisdiction_code,
    { description: form.description, quantity: form.quantity ? parseInt(form.quantity) : undefined,
      declared_value: form.declared_value ? parseFloat(form.declared_value) : undefined,
      hs_code: form.hs_code, consignee: form.consignee, shipper: form.shipper,
      assigned_broker: form.assigned_broker, coo_status: form.coo_status, origin_country: form.origin_country }
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(file => {
      setDocs(prev => [...prev, { file, docType: selectedDocType, id: crypto.randomUUID() }]);
    });
  }, [selectedDocType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(file => {
      setDocs(prev => [...prev, { file, docType: selectedDocType, id: crypto.randomUUID() }]);
    });
    e.target.value = '';
  };

  const removeDoc = (id: string) => setDocs(prev => prev.filter(d => d.id !== id));

  const doCreate = async () => {
    if (!form.shipment_id || !form.destination_country || !form.description) {
      toast({ title: "Error", description: "Shipment ID, destination, and description are required", variant: "destructive" });
      return;
    }
    try {
      const { error: shipErr } = await supabase.from("shipments").insert({
        shipment_id: form.shipment_id, mode: form.mode, description: form.description,
        consignee: form.consignee || 'TBD', hs_code: form.hs_code || '0000.00',
        declared_value: form.declared_value ? parseFloat(form.declared_value) : 0,
        status: 'new' as any, direction: form.direction as any,
        origin_country: form.origin_country || null, destination_country: form.destination_country,
        jurisdiction_code: form.jurisdiction_code, assigned_broker: form.assigned_broker || null,
        broker_id: form.broker_id || null, import_country: form.import_country || null,
        export_country: form.export_country || null, port_of_entry: form.port_of_entry || null,
        incoterm: form.incoterm || null, shipper: form.shipper || null, forwarder: form.forwarder || null,
        coo_status: form.coo_status, filing_status: form.filing_status, priority: form.priority,
        planned_departure: form.planned_departure || null, estimated_arrival: form.estimated_arrival || null,
        currency: form.currency, quantity: form.quantity ? parseInt(form.quantity) : null,
        packet_score: packetScore.overallScore, filing_readiness: packetScore.filingReadiness,
      } as any);
      if (shipErr) throw shipErr;

      for (const doc of docs) {
        const filePath = `${form.shipment_id}/${doc.docType}/${doc.file.name}`;
        await supabase.storage.from('shipment-documents').upload(filePath, doc.file);
        await supabase.from("shipment_documents" as any).insert({
          shipment_id: form.shipment_id, document_type: doc.docType, file_name: doc.file.name,
          file_path: filePath, file_size: doc.file.size, uploaded_by: user?.id,
        } as any);
      }

      await supabase.from("shipment_events").insert({
        shipment_id: form.shipment_id, event_type: 'shipment_created',
        description: `Shipment created. Packet score: ${packetScore.overallScore}%. Mode: ${shipmentMode}.`,
        user_id: user?.id, confidence_level: 100, evidence_quality: 'confirmed',
      });

      toast({ title: `Shipment ${form.shipment_id} created`, description: `Readiness: ${packetScore.overallScore}%` });
      setLastSaved(new Date());
      setIsNewMode(false);
      setSelectedShipmentId(form.shipment_id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateClick = () => {
    if (!form.shipment_id || !form.destination_country || !form.description) {
      toast({ title: "Error", description: "Shipment ID, destination, and description are required", variant: "destructive" });
      return;
    }
    setShowGate(true);
  };

  const detailsComplete = [form.origin_country, form.destination_country, form.description, form.hs_code || lineItems.length > 0 ? 'yes' : ''].filter(Boolean).length;
  const docsComplete = docs.length;

  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden bg-background">
      {/* LEFT: Shipments Sidebar */}
      <ShipmentsSidebar
        selectedId={selectedShipmentId}
        onSelect={handleSelectShipment}
        onNewShipment={handleNewShipment}
        deadlines={shipmentDeadlines}
        onClickDeadline={handleDeadlineClick}
      />

      {/* RIGHT: Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Workspace top bar */}
        <div className="shrink-0 border-b border-border bg-card/60 backdrop-blur-sm px-4 py-2.5 space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <h1 className="text-[15px] font-bold truncate">
                {isNewMode ? 'New Shipment' : form.shipment_id}
              </h1>
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 shrink-0">
                {modeConfig.icon} {modeConfig.shortLabel}
              </Badge>
              {!isNewMode && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {form.direction === 'inbound' ? '↓ Import' : '↑ Export'}
                </Badge>
              )}
              {lastSaved && (
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 shrink-0 ml-auto">
                  <Clock size={10} /> Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          <div className="flex items-center gap-2 shrink-0">
            <RepeatShipmentSelector onSelect={applyPreFill} />
            <Button onClick={() => setShowPreFill(true)} variant="outline" size="sm" className="text-[11px] gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
              <Sparkles size={12} /> Pre-fill
            </Button>
            <ResetDialog onReset={handleNewShipment} />
          </div>
          </div>
          {/* Deadline row */}
          {urgentDeadlines.length > 0 && (
            <DeadlineBar deadlines={urgentDeadlines} onClickDeadline={handleDeadlineClick} />
          )}
        </div>

        {/* Workspace content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <OnboardingBanner />

            {/* Mode selector */}
            <div className="mb-4">
              <ShipmentModeSelector selected={shipmentMode} onSelect={handleModeChange} />
            </div>

            {/* Main workspace */}
            <div>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full justify-start bg-card border border-border rounded-lg p-1 h-auto flex-wrap">
                    <TabsTrigger value="details" className="text-[11px] gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                      <ClipboardList size={12} /> Documents
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="text-[11px] gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                      <FileText size={12} /> AI Verification
                      {docs.length > 0 && <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">{docs.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="compliance" className="text-[11px] gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                      <ShieldCheck size={12} /> Workflow Log
                    </TabsTrigger>
                    <TabsTrigger value="review" className="text-[11px] gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                      <FileCheck size={12} /> Shipment Profile
                    </TabsTrigger>
                  </TabsList>

                  {/* ─── Documents Tab (Phased Document Checklist) ─── */}
                  <TabsContent value="details" className="mt-4">
                    <DocumentsTab
                      shipmentMode={shipmentMode}
                      uploadedDocTypes={uploadedDocTypes}
                      commodityType={form.description}
                      originCountry={form.origin_country}
                      incoterm={form.incoterm}
                      declaredValue={form.declared_value}
                      hsCode={form.hs_code}
                      shipmentId={form.shipment_id}
                      deadlines={shipmentDeadlines}
                      onClickDeadline={handleDeadlineClick}
                      shipmentSubtitle={`${modeConfig.label} · ${form.origin_country || '—'} → ${form.destination_country || '—'} · ${form.description ? form.description.slice(0, 40) : 'No commodity'} ${form.hs_code ? `HTS ${form.hs_code.split(',')[0]}` : ''}`}
                      onViewAIAnalysis={() => setActiveTab('documents')}
                      onUploadDoc={(docId, files) => {
                        Array.from(files).forEach(file => {
                          setDocs(prev => [...prev, { file, docType: docId, id: crypto.randomUUID() }]);
                        });
                      }}
                    />
                  </TabsContent>

                  {/* ─── AI Verification Tab ─── */}
                  <TabsContent value="documents" className="mt-4 space-y-4">
                    {/* Upload section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Upload size={14} /> Upload Documents for AI Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2 flex-wrap">
                          <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                            <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DOC_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <label className="cursor-pointer">
                            <input type="file" multiple className="hidden" onChange={handleFileSelect} accept=".pdf,.jpg,.png,.doc,.docx,.xls,.xlsx" />
                            <Button variant="outline" size="sm" className="text-xs" asChild>
                              <span><Upload size={12} className="mr-1" /> Browse Files</span>
                            </Button>
                          </label>
                        </div>

                        <div
                          className={cn(
                            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                            isDragging ? 'border-primary bg-primary/5' : 'border-border'
                          )}
                          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                        >
                          <Upload className="mx-auto mb-2 text-muted-foreground" size={20} />
                          <p className="text-xs text-muted-foreground">Drop files here — AI will extract and cross-reference all data</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Uploading as: <strong>{DOC_TYPES.find(d => d.value === selectedDocType)?.label}</strong>
                          </p>
                        </div>

                        {docs.length > 0 && (
                          <div className="space-y-1.5">
                            {docs.map(doc => (
                              <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-secondary/20">
                                <FileText size={14} className="text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{doc.file.name}</p>
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

                    {/* AI Verification Panels */}
                    <AIVerificationTab
                      extractedDocs={docExtraction.extractedDocs}
                      crossRefResults={docExtraction.crossRefResults}
                      onOpenDrawer={(alertId, context) => {
                        setDeadlineDrawerData({
                          id: `crossref_${alertId}`,
                          title: context?.field ? `${context.docA} ↔ ${context.docB}: ${context.field}` : "Cross-Reference Issue",
                          severity: "high",
                          whatIsThis: context?.finding || "A discrepancy was detected between two uploaded documents during AI cross-reference analysis.",
                          whyItMatters: "Document discrepancies can trigger CBP examination holds, delays of 2–7 days, and additional storage and demurrage charges at the port terminal.",
                          whatToDo: [
                            "Review the flagged data points in both documents",
                            "Contact your supplier to confirm which value is correct",
                            "Upload corrected documents to the relevant slots",
                            "If the shipment is en route, prepare a written explanation letter for CBP"
                          ],
                          quickActions: [
                            { label: "Upload document", type: "upload" as const },
                            { label: "Request from supplier", type: "request" as const },
                            { label: "Add note", type: "note" as const },
                          ],
                        });
                        setDeadlineDrawerOpen(true);
                      }}
                    />

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setActiveTab('details')} className="text-xs">← Back to Documents</Button>
                      <Button onClick={() => setActiveTab('compliance')} className="text-xs gap-1.5">Continue to Workflow Log →</Button>
                    </div>
                  </TabsContent>

                  {/* ─── Workflow Log / Compliance Tab ─── */}
                  <TabsContent value="compliance" className="mt-4 space-y-4">
                    <ComplianceCoach shipmentContext={{
                      originCountry: form.origin_country, destinationCountry: form.destination_country,
                      mode: form.mode, hsCode: form.hs_code, description: form.description,
                      declaredValue: form.declared_value, currency: form.currency,
                      incoterm: form.incoterm, cooStatus: form.coo_status,
                    }} />

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setActiveTab('documents')} className="text-xs">← Back to AI Verification</Button>
                      <Button onClick={() => setActiveTab('review')} className="text-xs gap-1.5">Continue to Shipment Profile →</Button>
                    </div>
                  </TabsContent>

                  {/* ─── Shipment Profile / Review Tab ─── */}
                  <TabsContent value="review" className="mt-4 space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">Shipment Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                          {[
                            ['Shipment ID', form.shipment_id],
                            ['Mode', `${modeConfig.icon} ${modeConfig.label}`],
                            ['Origin', form.origin_country || '—'],
                            ['Destination', form.destination_country || '—'],
                            ['Shipper', form.shipper || '—'],
                            ['Consignee', form.consignee || '—'],
                            ['HS Code', form.hs_code || (lineItems.length > 0 ? lineItems.map(l => l.hsCode).filter(Boolean).join(', ') : '—')],
                            ['Declared Value', form.declared_value ? `${form.currency} ${parseFloat(form.declared_value).toLocaleString()}` : '—'],
                            ['Incoterm', form.incoterm || '—'],
                            ['COO Status', form.coo_status.replace(/_/g, ' ')],
                            ['ETD', form.planned_departure || '—'],
                            ['ETA', form.estimated_arrival || '—'],
                            ['Broker', form.assigned_broker || '—'],
                            ['Documents', `${docs.length} uploaded`],
                          ].map(([label, value]) => (
                            <div key={label as string} className="flex justify-between border-b border-border/50 pb-2">
                              <span className="text-muted-foreground font-medium">{label}</span>
                              <span className="font-semibold text-right">{value}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-3">
                      <Button onClick={handleCreateClick} disabled={!form.shipment_id || !form.destination_country || !form.description} className="flex-1">
                        {isNewMode ? 'Create Shipment' : 'Update Shipment'}
                      </Button>
                      <IntakeExportButton form={form} docs={docs} packetScore={packetScore} />
                    </div>
                  </TabsContent>
                </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SmartPreFillModal open={showPreFill} onOpenChange={setShowPreFill} onApply={applyPreFill} />
      <PreSubmissionGate
        open={showGate} onOpenChange={setShowGate}
        shipmentData={{
          shipmentId: form.shipment_id, originCountry: form.origin_country,
          destinationCountry: form.destination_country, mode: form.mode,
          hsCode: form.hs_code, description: form.description,
          declaredValue: form.declared_value, currency: form.currency,
          consignee: form.consignee, shipper: form.shipper,
          cooStatus: form.coo_status, incoterm: form.incoterm,
          uploadedDocs: uploadedDocTypes, packetScore: packetScore.overallScore,
          missingDocs: packetScore.topMissing,
        }}
        onConfirm={doCreate} onForceCreate={doCreate}
      />
      <NewShipmentWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onComplete={handleWizardComplete}
        existingImporters={existingImporters}
      />
      <AlertDrawer
        open={deadlineDrawerOpen}
        onOpenChange={setDeadlineDrawerOpen}
        data={deadlineDrawerData}
      />
    </div>
  );
}
