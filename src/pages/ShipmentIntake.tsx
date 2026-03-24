import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Upload, X, FileText, Sparkles, ClipboardList, ShieldCheck, FileCheck, Save, Clock, Brain, Plus, Pause, Play, Package } from "lucide-react";
import type { TransportMode } from "@/types/orchestra";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

import { SHIPMENT_MODES, MODE_DOC_PROFILES, getApplicableConditionalDocs, type ShipmentModeId } from "@/lib/shipmentModes";
import { getModeSubtitle } from "@/lib/modeDocumentDefs";
import { ShipmentModeSelector } from "@/components/workspace/ShipmentModeSelector";
import { DocChecklistPanel } from "@/components/workspace/DocChecklistPanel";
import { ShipmentsSidebar } from "@/components/workspace/ShipmentsSidebar";
import { NewShipmentWizard, type WizardResult, type PacketIntakeDraft } from "@/components/workspace/NewShipmentWizard";
import { DocumentsTab } from "@/components/workspace/DocumentsTab";
import { DeadlineBar } from "@/components/workspace/DeadlineBar";
import { AlertDrawer } from "@/components/workspace/AlertDrawer";
import { AIVerificationTab } from "@/components/workspace/AIVerificationTab";
import { HoldManagementPanel, HoldBanner } from "@/components/workspace/HoldManagementPanel";
import { useDocExtraction } from "@/hooks/useDocExtraction";
import { useImporterMemory } from "@/hooks/useImporterMemory";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

import { calculateDeadlines, getDeadlinesWithin7Days } from "@/lib/deadlineEngine";
import { getDeadlineDrawer, type AlertDrawerData } from "@/lib/alertDrawerContent";
import { getHoldDrawer, type ShipmentHold } from "@/lib/holdTypes";

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
import { SmartPacketIntake, SmartPacketIntakeButton } from "@/components/workspace/SmartPacketIntake";
import type { ShipmentProfileData } from "@/hooks/useSmartPacketIntake";

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

// Wrapper to stabilize hook order during HMR
export default function ShipmentIntake() {
  return <ShipmentIntakeInner key="shipment-intake-stable" />;
}

function ShipmentIntakeInner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

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
  const [isPaused, setIsPaused] = useState(false);
  const [pausedDate, setPausedDate] = useState<string | null>(null);
  const [showPacketIntake, setShowPacketIntake] = useState(false);
  const [docRefreshKey, setDocRefreshKey] = useState(0);

  // Hold management state
  const [activeHold, setActiveHold] = useState<ShipmentHold | null>(null);
  const [holdPanelOpen, setHoldPanelOpen] = useState(false);

  // Importer memory
  const importerMemory = useImporterMemory();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewShipment: () => setShowWizard(true),
    onCloseDrawer: () => {
      if (holdPanelOpen) setHoldPanelOpen(false);
      else if (deadlineDrawerOpen) setDeadlineDrawerOpen(false);
      else if (showPreFill) setShowPreFill(false);
      else if (showWizard) setShowWizard(false);
    },
  });

  // AI extraction pipeline
  const docExtraction = useDocExtraction({
    shipmentMode: form.mode,
    commodityType: form.description,
    countryOfOrigin: form.origin_country,
    shipmentId: form.shipment_id,
  });

  // Autosave — debounced save on form changes
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!selectedShipmentId || isNewMode) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      try {
        await supabase.from("shipments").update({
          description: form.description,
          consignee: form.consignee,
          hs_code: form.hs_code,
          declared_value: form.declared_value ? parseFloat(form.declared_value) : 0,
          origin_country: form.origin_country || null,
          destination_country: form.destination_country,
        } as any).eq("shipment_id", selectedShipmentId);
        setLastSaved(new Date());
      } catch {
        // Silently fail autosave
      }
    }, 2000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [form.description, form.consignee, form.hs_code, form.declared_value, form.origin_country, form.destination_country, selectedShipmentId, isNewMode]);

  // Check for repeat client when consignee changes
  const importerSuggestion = useMemo(() => {
    if (!form.consignee) return null;
    return importerMemory.getMatchingShipmentSuggestion(form.consignee, form.description, form.origin_country);
  }, [form.consignee, form.description, form.origin_country, importerMemory]);

  const importerProfile = useMemo(() => {
    return importerMemory.getImporter(form.consignee);
  }, [form.consignee, importerMemory]);

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
    setActiveHold(null);
    setIsPaused(false);
    setPausedDate(null);
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

  const handleWizardComplete = async (result: WizardResult) => {
    setIsNewMode(false);
    setShowWizard(false);

    const modeId = WIZARD_MODE_MAP[result.shipmentMode] || 'ocean_import';
    handleModeChange(modeId);

    // Always honor the user-entered shipment reference from the wizard
    const shipRef = (result.shipmentReference || "").trim();
    if (!shipRef) {
      toast({ title: "Missing shipment reference", description: "Shipment Reference / ID is required", variant: "destructive" });
      return;
    }
    const config = SHIPMENT_MODES.find(m => m.id === modeId)!;

    // Auto-fill from importer memory if known
    const knownImporter = importerMemory.getImporter(result.importerOfRecord);

    const dest = ['ocean_export', 'air_export', 'land_mexico_export', 'land_canada_export'].includes(result.shipmentMode) ? '' : 'United States';

    // Set form with the correct shipment_id directly — no separate resetForm call
    setForm({
      ...INITIAL_FORM,
      shipment_id: shipRef,
      description: result.title,
      consignee: result.importerOfRecord,
      origin_country: result.countryOfOrigin,
      port_of_entry: result.portOfEntry,
      mode: config.transportMode as TransportMode,
      destination_country: dest,
    });
    setLineItems([]);
    setSelectedShipmentId(null);

    // Create the shipment in the database immediately so it appears in the sidebar
    try {
      // Guard: check if shipment already exists before inserting
      const { data: existingShipment } = await supabase
        .from("shipments")
        .select("shipment_id")
        .eq("shipment_id", shipRef)
        .maybeSingle();

      if (existingShipment) {
        console.log("[handleWizardComplete] Shipment already exists, skipping insert:", shipRef);
      } else {
        const dest = ['ocean_export', 'air_export', 'land_mexico_export', 'land_canada_export'].includes(result.shipmentMode) ? '' : 'United States';
        const { error: insertErr } = await supabase.from("shipments").insert({
          shipment_id: shipRef,
          mode: config.transportMode,
          description: result.title,
          consignee: result.importerOfRecord || 'TBD',
          hs_code: '',
          declared_value: 0,
          status: 'new' as any,
          origin_country: result.countryOfOrigin || null,
          destination_country: dest,
          risk_score: 0,
          risk_notes: null,
        } as any);

        if (insertErr) {
          console.error("[handleWizardComplete] DB insert error:", insertErr);
          toast({ title: "Failed to create shipment", description: insertErr.message, variant: "destructive" });
        } else {
          console.log("[handleWizardComplete] Shipment inserted:", shipRef);
        }
      }

      setSelectedShipmentId(shipRef);
      await queryClient.refetchQueries({ queryKey: ["shipments-sidebar-list"] });
    } catch (err: any) {
      console.error("[handleWizardComplete] Insert failed:", err);
    }

    toast({
      title: "Shipment workspace ready",
      description: `${result.title} — ${result.commodityType}${knownImporter ? ' · Known importer — authority fields auto-filled' : ''}`,
    });
  };

  const handleSelectShipment = async (id: string) => {
    setSelectedShipmentId(id);
    setIsNewMode(false);
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
      setIsPaused((data.status as string) === 'paused' || data.status === 'waiting_docs');
    }

    // Load hold data
    const { data: holds } = await supabase
      .from("shipment_holds" as any)
      .select("*")
      .eq("shipment_id", id)
      .eq("hold_status", "active")
      .limit(1);
    if (holds && (holds as any[]).length > 0) {
      const h = (holds as any[])[0];
      setActiveHold({
        id: h.id,
        shipment_id: h.shipment_id,
        hold_type: h.hold_type,
        hold_received_date: h.hold_received_date,
        port_ces_location: h.port_ces_location,
        free_time_expires: h.free_time_expires,
        demurrage_total: h.demurrage_total || 0,
        documents_submitted: h.documents_submitted || [],
        hold_status: h.hold_status,
        resolution_date: h.resolution_date,
        notes: h.notes,
      });
    } else {
      setActiveHold(null);
    }
  };

  const handlePauseToggle = async () => {
    if (isPaused) {
      setIsPaused(false);
      setPausedDate(null);
      if (selectedShipmentId) {
        await supabase.from("shipments").update({ status: 'new' } as any).eq("shipment_id", selectedShipmentId);
      }
      toast({ title: "Shipment resumed" });
    } else {
      setIsPaused(true);
      setPausedDate(new Date().toLocaleDateString());
      if (selectedShipmentId) {
        await supabase.from("shipments").update({ status: 'paused' } as any).eq("shipment_id", selectedShipmentId);
      }
      toast({ title: "Shipment paused", description: "Moved to Incomplete / Paused" });
    }
  };

  const handleHoldSave = async (holdData: Partial<ShipmentHold>) => {
    const payload = {
      ...holdData,
      shipment_id: form.shipment_id,
      updated_at: new Date().toISOString(),
    };

    if (activeHold?.id) {
      await supabase.from("shipment_holds" as any).update(payload as any).eq("id", activeHold.id);
    } else {
      const { data } = await supabase.from("shipment_holds" as any).insert(payload as any).select().single();
      if (data) {
        setActiveHold({ ...holdData, id: (data as any).id, shipment_id: form.shipment_id } as ShipmentHold);
        return;
      }
    }
    setActiveHold(prev => prev ? { ...prev, ...holdData } as ShipmentHold : null);
    toast({ title: "Hold information saved" });
  };

  const handleHoldTypeClick = (holdType: string) => {
    const drawer = getHoldDrawer(holdType);
    setDeadlineDrawerData(drawer);
    setDeadlineDrawerOpen(true);
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
      // Check if already exists (may have been created by wizard)
      const { data: existing } = await supabase.from("shipments").select("shipment_id").eq("shipment_id", form.shipment_id).maybeSingle();

      if (existing) {
        // PATCH: only update profile fields the user can edit — never overwrite documents, scores, or findings
        const patchFields: Record<string, any> = {};
        if (form.mode) patchFields.mode = form.mode;
        if (form.description) patchFields.description = form.description;
        if (form.consignee) patchFields.consignee = form.consignee;
        if (form.hs_code) patchFields.hs_code = form.hs_code;
        if (form.declared_value) patchFields.declared_value = parseFloat(form.declared_value);
        if (form.origin_country) patchFields.origin_country = form.origin_country;
        if (form.destination_country) patchFields.destination_country = form.destination_country;
        if (form.shipper) patchFields.shipper = form.shipper;
        if (form.incoterm) patchFields.incoterm = form.incoterm;
        if (form.planned_departure) patchFields.planned_departure = form.planned_departure;
        if (form.estimated_arrival) patchFields.estimated_arrival = form.estimated_arrival;
        if (form.assigned_broker) patchFields.assigned_broker = form.assigned_broker;
        if (form.broker_id) patchFields.broker_id = form.broker_id;
        if (form.port_of_entry) patchFields.port_of_entry = form.port_of_entry;
        if (form.coo_status && form.coo_status !== 'unknown') patchFields.coo_status = form.coo_status;
        if (form.currency && form.currency !== 'USD') patchFields.currency = form.currency;
        if (form.forwarder) patchFields.forwarder = form.forwarder;
        if (form.priority && form.priority !== 'normal') patchFields.priority = form.priority;
        await supabase.from("shipments").update(patchFields as any).eq("shipment_id", form.shipment_id);
      } else {
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
      }

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

      // Record in importer memory
      if (form.consignee) {
        importerMemory.recordShipment(form.consignee, {
          shipmentId: form.shipment_id,
          commodity: form.description,
          hsCode: form.hs_code,
          ftaProgram: form.coo_status === 'potentially_eligible' ? 'Pending' : undefined,
          origin: form.origin_country,
        });
      }

      toast({ title: `Shipment ${form.shipment_id} created`, description: `Readiness: ${packetScore.overallScore}%` });
      setLastSaved(new Date());
      setIsNewMode(false);
      setSelectedShipmentId(form.shipment_id);
      await queryClient.refetchQueries({ queryKey: ["shipments-sidebar-list"] });
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

  // Supplier flagging check
  const isShipperFlagged = importerMemory.isSupplierFlagged(form.shipper);

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
        {/* Hold banner — always visible when hold active */}
        <HoldBanner hold={activeHold} onClick={() => setHoldPanelOpen(true)} />

        {/* Paused banner */}
        {isPaused && (
          <div className="flex items-center gap-2.5 px-4 py-2 bg-muted/50 border-b border-border">
            <Pause size={14} className="text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground flex-1">
              This workflow was paused{pausedDate ? ` on ${pausedDate}` : ''}.{' '}
              {docs.length > 0
                ? `${docs.length} documents uploaded. Pick up where you left off ↓`
                : 'No documents yet.'}
            </span>
            <Button size="sm" variant="outline" onClick={handlePauseToggle} className="text-[11px] h-7 gap-1">
              <Play size={10} /> Resume
            </Button>
          </div>
        )}

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
              {activeHold && (
                <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 shrink-0 cursor-pointer"
                  onClick={() => setHoldPanelOpen(true)}>
                  ⚠ Hold Active
                </Badge>
              )}
              {lastSaved && (
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 shrink-0 ml-auto">
                  <Clock size={10} /> Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Repeat client suggestion */}
              {importerSuggestion && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                  onClick={() => {
                    if (importerSuggestion.htsCodesUsed.length > 0) {
                      updateField('hs_code', importerSuggestion.htsCodesUsed[0]);
                    }
                    toast({ title: "Pre-filled from previous shipment", description: importerSuggestion.shipmentId });
                  }}
                >
                  <Package size={10} /> Pre-fill from {importerSuggestion.shipmentId}
                </Button>
              )}
              <RepeatShipmentSelector onSelect={applyPreFill} />
              <Button onClick={() => setShowPreFill(true)} variant="outline" size="sm" className="text-[11px] gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                <Sparkles size={12} /> Pre-fill
              </Button>
              {!isNewMode && (
                <Button onClick={handlePauseToggle} variant="ghost" size="sm" className="text-[11px] gap-1 h-7">
                  {isPaused ? <><Play size={10} /> Resume</> : <><Pause size={10} /> Pause</>}
                </Button>
              )}
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
            {/* Empty state — no shipment selected and no new mode */}
            {!isNewMode && !selectedShipmentId && (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Package size={28} className="text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">No shipments yet</h2>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Create your first shipment workspace to begin managing documents, compliance, and filing deadlines with AI assistance.
                </p>
                <Button onClick={handleNewShipment} className="gap-2">
                  <Plus size={14} /> Create first shipment
                </Button>
                <p className="text-[10px] text-muted-foreground/60">Press N to open the new shipment wizard</p>
              </div>
            )}

            {(isNewMode || selectedShipmentId) && (
              <>
                <OnboardingBanner />

                {/* Shipper flagged warning */}
                {isShipperFlagged && form.shipper && (
                  <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
                    <ShieldCheck size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-semibold text-amber-600">Supplier associated with previous hold</p>
                      <p className="text-[11px] text-muted-foreground">
                        "{form.shipper}" was associated with a CBP hold on a previous shipment. Review compliance carefully.
                      </p>
                    </div>
                  </div>
                )}

                {/* Known importer auto-fill notice */}
                {importerProfile && (
                  <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 flex items-center gap-2">
                    <FileCheck size={12} className="text-emerald-500 shrink-0" />
                    <span className="text-[11px] text-muted-foreground flex-1">
                      Known importer: {importerProfile.importer_name}
                      {importerProfile.poa_status === 'active' && ' · POA ✓'}
                      {importerProfile.bond_status === 'active' && ' · Bond ✓'}
                      {importerProfile.ach_status && ' · ACH ✓'}
                      {importerProfile.hold_count > 0 && ` · ${importerProfile.hold_count} previous hold${importerProfile.hold_count > 1 ? 's' : ''}`}
                    </span>
                  </div>
                )}

                {/* Mode selector — only for new shipments */}
                {isNewMode && (
                  <div className="mb-4">
                    <ShipmentModeSelector selected={shipmentMode} onSelect={handleModeChange} />
                  </div>
                )}

                {/* Main workspace */}
                <div>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start bg-card border border-border rounded-lg p-1 h-auto flex-wrap">
                      <TabsTrigger value="details" className="text-[11px] gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <ClipboardList size={12} /> Documents
                      </TabsTrigger>
                      <TabsTrigger value="documents" className="text-[11px] gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <Brain size={12} /> AI Verification
                        {Object.keys(docExtraction.extractedDocs).length > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">
                            {Object.keys(docExtraction.extractedDocs).length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="review" className="text-[11px] gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <FileCheck size={12} /> Shipment Profile
                      </TabsTrigger>
                    </TabsList>

                    {/* ─── Documents Tab (Phased Document Checklist) ─── */}
                    <TabsContent value="details" className="mt-4">
                      <DocumentsTab
                        key={`docs-${form.shipment_id}-${docRefreshKey}`}
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
                        shipmentSubtitle={getModeSubtitle(shipmentMode, form.origin_country, form.destination_country, form.description)}
                        onViewAIAnalysis={() => setActiveTab('documents')}
                        onUploadDoc={(docId, files) => {
                          Array.from(files).forEach(file => {
                            setDocs(prev => [...prev, { file, docType: docId, id: crypto.randomUUID() }]);
                          });
                        }}
                        // ── FIX 1: Always set selectedShipmentId before opening intake ──
                        onOpenPacketIntake={() => {
                          const targetId = selectedShipmentId || form.shipment_id;
                          if (!targetId) {
                            toast({
                              title: "No shipment selected",
                              description: "Please select or create a shipment first.",
                              variant: "destructive",
                            });
                            return;
                          }
                          setSelectedShipmentId(targetId);
                          setShowPacketIntake(true);
                        }}
                      />
                    </TabsContent>

                    {/* ─── AI Verification Tab ─── */}
                    <TabsContent value="documents" className="mt-4 space-y-4">
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
                              ['Hold Status', activeHold ? `Active — ${activeHold.hold_type.replace(/_/g, ' ')}` : 'No hold'],
                              ['Paused', isPaused ? `Yes${pausedDate ? ` (${pausedDate})` : ''}` : 'No'],
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
              </>
            )}
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
        // ── FIX 2: Always set selectedShipmentId before opening intake from wizard ──
        onOpenPacketIntake={(draft: PacketIntakeDraft) => {
          setShowWizard(false);
          const ref = draft?.shipmentReference || form.shipment_id;
          if (draft?.shipmentReference) {
            setForm(prev => ({
              ...prev,
              shipment_id: draft.shipmentReference,
              description: draft.title || prev.description,
            }));
          }
          // Always set the target ID — never null — before opening intake
          setSelectedShipmentId(ref);
          setShowPacketIntake(true);
        }}
      />
      <SmartPacketIntake
        open={showPacketIntake}
        onOpenChange={setShowPacketIntake}
        shipmentId={selectedShipmentId || form.shipment_id}
        onComplete={async (profileData: ShipmentProfileData, sid?: string) => {
          // Build update payload from extracted profile data
          const profileUpdate: Record<string, any> = {};
          if (profileData.countryOfOrigin) profileUpdate.origin_country = profileData.countryOfOrigin;
          if (profileData.portOfLoading) profileUpdate.origin_country = profileUpdate.origin_country || profileData.portOfLoading;
          if (profileData.portOfDischarge) profileUpdate.destination_country = profileData.portOfDischarge;
          if (profileData.exporterSeller) profileUpdate.shipper = profileData.exporterSeller;
          if (profileData.importerOfRecord) profileUpdate.consignee = profileData.importerOfRecord;
          if (profileData.htsCodes?.length) profileUpdate.hs_code = profileData.htsCodes[0];
          if (profileData.declaredValue) profileUpdate.declared_value = parseFloat(profileData.declaredValue) || 0;
          if (profileData.currency) profileUpdate.currency = profileData.currency;
          if (profileData.incoterms) profileUpdate.incoterm = profileData.incoterms;
          if (profileData.etd) profileUpdate.planned_departure = profileData.etd;
          if (profileData.eta) profileUpdate.estimated_arrival = profileData.eta;

          const targetId = sid || selectedShipmentId || form.shipment_id;

          // Persist extracted profile to shipments table
          if (targetId && Object.keys(profileUpdate).length > 0) {
            await supabase.from("shipments").update(profileUpdate as any).eq("shipment_id", targetId);
          }

          if (targetId && targetId === selectedShipmentId) {
            // Existing shipment — docs were added, refresh data
            await queryClient.refetchQueries({ queryKey: ["shipments-sidebar-list"] });
            setDocRefreshKey(prev => prev + 1);
            toast({ title: `Documents added to ${targetId}`, description: "Cross-reference checks updated" });
            handleSelectShipment(targetId);
            setActiveTab('details');
          } else if (targetId) {
            // New shipment created via intake
            await queryClient.refetchQueries({ queryKey: ["shipments-sidebar-list"] });
            setDocRefreshKey(prev => prev + 1);
            await new Promise(resolve => setTimeout(resolve, 250));
            handleSelectShipment(targetId);
            setActiveTab('details');
          } else {
            setForm(prev => ({
              ...prev,
              consignee: profileData.importerOfRecord || prev.consignee,
              shipper: profileData.exporterSeller || prev.shipper,
              origin_country: profileData.countryOfOrigin || prev.origin_country,
              destination_country: profileData.portOfDischarge || prev.destination_country,
              declared_value: profileData.declaredValue || prev.declared_value,
              currency: profileData.currency || prev.currency,
              hs_code: profileData.htsCodes[0] || prev.hs_code,
              incoterm: profileData.incoterms || prev.incoterm,
              planned_departure: profileData.etd || prev.planned_departure,
              estimated_arrival: profileData.eta || prev.estimated_arrival,
            }));
            if (profileData.shipmentMode === "ocean" || profileData.shipmentMode === "Ocean Import") handleModeChange("ocean_import");
            else if (profileData.shipmentMode === "air") handleModeChange("air_import");
            else if (profileData.shipmentMode === "land") handleModeChange("land_import_mexico");
            else if (profileData.shipmentMode === "land_canada") handleModeChange("land_import_canada");
          }
        }}
      />
      <AlertDrawer
        open={deadlineDrawerOpen}
        onOpenChange={setDeadlineDrawerOpen}
        data={deadlineDrawerData}
      />
      <HoldManagementPanel
        open={holdPanelOpen}
        onOpenChange={setHoldPanelOpen}
        hold={activeHold}
        onSave={handleHoldSave}
        onClickHoldType={handleHoldTypeClick}
      />
    </div>
  );
}
