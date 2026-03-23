import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export type PacketFileStatus =
  | "queued"
  | "uploading"
  | "identifying"
  | "awaiting_confirmation"
  | "extracting"
  | "extracted"
  | "extracted_warnings"
  | "unidentified"
  | "error";

export interface PacketFile {
  id: string;
  file: File;
  status: PacketFileStatus;
  documentType: string | null;
  confidence: number;
  extractedData: Record<string, any> | null;
  fieldDetails: Array<{ field: string; value: any; confidence: number; source_location: string }>;
  warnings: string[];
  pgaFlags: Array<{ agency: string; requirement: string; mandatory: boolean; reason: string }>;
  modeInference: string | null;
  importerName: string | null;
  exporterName: string | null;
  blOrAwbNumber: string | null;
  reasoning: string | null;
  error: string | null;
  shipmentGroup: string | null;
  savedToLibrary: boolean;
}

export interface CrossRefFinding {
  severity: "critical" | "high" | "medium" | "low";
  document_a: string;
  document_b: string;
  field_checked: string;
  finding: string;
  recommendation: string;
  estimated_financial_impact_usd: number;
}

export interface DetectedShipment {
  id: string;
  importerName: string;
  commodity: string;
  origin: string;
  fileIds: string[];
}

export interface ShipmentProfileData {
  importerOfRecord: string;
  exporterSeller: string;
  countryOfOrigin: string;
  declaredValue: string;
  currency: string;
  htsCodes: string[];
  shipmentMode: string;
  incoterms: string;
  ftaDetected: string;
  relatedParty: boolean;
  portOfLoading: string;
  portOfDischarge: string;
  blNumber: string;
  vesselName: string;
  containerNumbers: string[];
  totalPackages: string;
  grossWeight: string;
  etd: string;
  eta: string;
  [key: string]: any;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/jpg", "image/png", "image/tiff",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-outlook", "message/rfc822",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".docx", ".xlsx", ".msg", ".eml"];

export function isFileAccepted(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);
}

let fileCounter = 0;

const DEFAULT_PROFILE: ShipmentProfileData = {
  importerOfRecord: "", exporterSeller: "", countryOfOrigin: "",
  declaredValue: "", currency: "USD", htsCodes: [], shipmentMode: "",
  incoterms: "", ftaDetected: "", relatedParty: false,
  portOfLoading: "", portOfDischarge: "", blNumber: "",
  vesselName: "", containerNumbers: [], totalPackages: "", grossWeight: "",
};

export function useSmartPacketIntake(existingShipmentId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<PacketFile[]>([]);
  const [crossRefResults, setCrossRefResults] = useState<CrossRefFinding[]>([]);
  const [detectedShipments, setDetectedShipments] = useState<DetectedShipment[]>([]);
  const [profileData, setProfileData] = useState<ShipmentProfileData>({ ...DEFAULT_PROFILE });
  const [score, setScore] = useState(0);
  const [draftShipmentId, setDraftShipmentId] = useState<string | null>(existingShipmentId || null);
  const [draftReady, setDraftReady] = useState(!!existingShipmentId);
  const extractedRef = useRef<Record<string, any>>({});

  // Keep draftShipmentId in sync when existingShipmentId changes (e.g. after reset)
  useEffect(() => {
    if (existingShipmentId) {
      setDraftShipmentId(existingShipmentId);
      setDraftReady(true);
    }
  }, [existingShipmentId]);

  const ensureDraftShipment = useCallback(async (sid: string) => {
    if (!sid) return null;

    const { data: existing, error: lookupError } = await supabase
      .from("shipments")
      .select("shipment_id")
      .eq("shipment_id", sid)
      .maybeSingle();

    if (lookupError) {
      console.error("[ensureDraftShipment] Lookup failed:", { sid, error: lookupError });
      return null;
    }

    if (existing?.shipment_id) {
      return sid;
    }

    // NEVER create a new shipment if we're working with an existing one
    if (existingShipmentId) {
      console.error("[ensureDraftShipment] Existing shipment not found in DB:", sid);
      return sid; // Return anyway — it should exist, RLS may be filtering
    }

    const { error: insertError } = await supabase.from("shipments").insert({
      shipment_id: sid,
      description: "Draft — Smart Packet Intake",
      mode: "sea",
      status: "draft" as any,
      risk_score: 0,
      declared_value: 0,
      consignee: "",
      hs_code: "",
      risk_notes: null,
    } as any);

    if (insertError) {
      console.error("[ensureDraftShipment] Insert failed:", { sid, error: insertError });
      return null;
    }

    console.log("[ensureDraftShipment] Inserted missing draft shipment:", sid);
    return sid;
  }, [existingShipmentId]);

  // Create draft shipment on mount (if no existing shipment)
  const createDraft = useCallback(async () => {
    // For existing shipments, NEVER create a new one — just return the existing ID
    if (existingShipmentId) {
      setDraftShipmentId(existingShipmentId);
      setDraftReady(true);
      return existingShipmentId;
    }

    const id = draftShipmentId || `ORC-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    console.log("[createDraft] Ensuring draft shipment exists:", {
      id,
      hasUser: !!user,
      userId: user?.id ?? null,
    });

    const ensuredId = await ensureDraftShipment(id);
    if (!ensuredId) {
      console.error("[createDraft] Failed to ensure draft shipment:", id);
      return null;
    }

    console.log("[createDraft] Draft shipment ready:", ensuredId);
    setDraftShipmentId(ensuredId);
    setDraftReady(true);
    queryClient.invalidateQueries({ queryKey: ["shipments-sidebar-list"] });
    return ensuredId;
  }, [draftShipmentId, existingShipmentId, user, queryClient, ensureDraftShipment]);

  // Run cross-reference after saving a document if 2+ verified docs exist
  const runCrossRefAfterSave = useCallback(async (sid: string) => {
    try {
      const { data: allDocs } = await supabase
        .from("document_library")
        .select("document_type, extracted_fields")
        .eq("shipment_id", sid)
        .eq("extraction_status", "complete");

      if (!allDocs || allDocs.length < 2) return;

      const documents = allDocs
        .filter((d: any) => d.document_type && d.extracted_fields)
        .map((d: any) => ({ document_type: d.document_type, extracted_data: d.extracted_fields }));

      if (documents.length < 2) return;

      console.log("[runCrossRefAfterSave] Comparing", documents.length, "docs for shipment", sid);

      const { data, error } = await supabase.functions.invoke("workspace-crossref", {
        body: { documents, shipmentMode: profileData.shipmentMode, commodityType: "", countryOfOrigin: profileData.countryOfOrigin },
      });

      if (error) { console.error("[runCrossRefAfterSave] Edge function error:", error); return; }

      const discrepancies: any[] = data?.discrepancies || [];
      const activeUser = user ?? (await supabase.auth.getUser()).data.user ?? null;

      // Clear old results and insert new ones
      await supabase.from("crossref_results").delete().eq("shipment_id", sid);

      if (discrepancies.length > 0) {
        const rows = discrepancies.map((d: any) => ({
          shipment_id: sid,
          document_a_type: d.document_a,
          document_b_type: d.document_b,
          field_checked: d.field_checked,
          severity: d.severity,
          finding: d.finding,
          recommendation: d.recommendation || "",
          estimated_financial_impact_usd: d.estimated_financial_impact_usd || 0,
          user_id: activeUser?.id || null,
        }));
        await supabase.from("crossref_results").insert(rows);
        console.log("[runCrossRefAfterSave] Stored", rows.length, "crossref findings");
      }

      setCrossRefResults(discrepancies);
    } catch (err) {
      console.error("[runCrossRefAfterSave] Failed:", err);
    }
  }, [profileData.shipmentMode, profileData.countryOfOrigin, user]);

  // Save file to document library linked to draft shipment
  const saveFileToLibrary = useCallback(async (
    pf: PacketFile, docType: string, extractedData: Record<string, any> | null, sid: string
  ) => {
    const activeUser = user ?? (await supabase.auth.getUser()).data.user ?? null;
    if (!activeUser) {
      console.error("[saveFileToLibrary] No user — skipping save for", docType);
      return;
    }
    const filePath = `${activeUser.id}/${sid}/${Date.now()}_${pf.file.name}`;

    const { error: storageError } = await supabase.storage.from("document-library").upload(filePath, pf.file, { upsert: true });
    if (storageError) {
      console.error("[saveFileToLibrary] Storage upload failed:", storageError);
    }

    const { error: insertError } = await supabase.from("document_library").insert({
      user_id: activeUser.id,
      file_name: pf.file.name,
      file_path: filePath,
      file_size_bytes: pf.file.size,
      mime_type: pf.file.type,
      document_type: docType,
      shipment_id: sid,
      extraction_status: extractedData ? "complete" : "pending",
      extracted_fields: extractedData || {},
      tags: [],
    } as any);

    if (insertError) {
      console.error("[saveFileToLibrary] DB insert failed:", insertError);
      return;
    }

    console.log("[saveFileToLibrary] Saved", docType, "to shipment", sid);
    setFiles(prev => prev.map(f => f.id === pf.id ? { ...f, savedToLibrary: true } : f));

    // Trigger cross-reference after save
    runCrossRefAfterSave(sid);
  }, [user, runCrossRefAfterSave]);

  const addFiles = useCallback((newFiles: File[]) => {
    const packetFiles: PacketFile[] = newFiles.map(f => ({
      id: `pf_${++fileCounter}_${Date.now()}`,
      file: f,
      status: isFileAccepted(f) ? "queued" : "error",
      documentType: null,
      confidence: 0,
      extractedData: null,
      fieldDetails: [],
      warnings: [],
      pgaFlags: [],
      modeInference: null,
      importerName: null,
      exporterName: null,
      blOrAwbNumber: null,
      reasoning: null,
      error: isFileAccepted(f) ? null : "Unsupported format",
      shipmentGroup: null,
      savedToLibrary: false,
    }));

    setFiles(prev => [...prev, ...packetFiles]);
    return packetFiles.filter(pf => pf.status === "queued");
  }, []);

  const updateFile = useCallback((id: string, updates: Partial<PacketFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const updateProfileFromExtraction = useCallback((docType: string, data: Record<string, any>) => {
    setProfileData(prev => {
      const next = { ...prev };
      if (docType === "commercial_invoice" || docType.includes("invoice")) {
        if (data.buyer_name) next.importerOfRecord = data.buyer_name;
        if (data.seller_name) next.exporterSeller = data.seller_name;
        if (data.country_of_origin) next.countryOfOrigin = data.country_of_origin;
        if (data.total_value) next.declaredValue = String(data.total_value);
        if (data.currency) next.currency = data.currency;
        if (data.incoterms) next.incoterms = data.incoterms;
        if (typeof data.related_parties === "boolean") next.relatedParty = data.related_parties;
        if (data.fta_program) next.ftaDetected = data.fta_program;
        if (data.line_items?.length) {
          const codes = data.line_items.map((li: any) => li.hts_6digit).filter(Boolean);
          if (codes.length) next.htsCodes = [...new Set([...next.htsCodes, ...codes])];
        }
        if (!next.shipmentMode && data.incoterms) {
          const terms = (data.incoterms || "").toUpperCase();
          if (terms.includes("CIF") || terms.includes("CFR") || terms.includes("FOB")) {
            next.shipmentMode = "Ocean Import";
          }
        }
      }
      if (docType === "bill_of_lading" || docType.includes("lading")) {
        next.shipmentMode = "ocean";
        if (data.consignee) next.importerOfRecord = next.importerOfRecord || data.consignee;
        if (data.shipper) next.exporterSeller = next.exporterSeller || data.shipper;
        if (data.port_of_loading) next.portOfLoading = data.port_of_loading;
        if (data.port_of_discharge) next.portOfDischarge = data.port_of_discharge;
        if (data.bl_number) next.blNumber = data.bl_number;
        if (data.vessel_name) next.vesselName = data.vessel_name;
        if (data.container_numbers) next.containerNumbers = data.container_numbers;
        if (data.total_packages) next.totalPackages = String(data.total_packages);
        if (data.gross_weight_kg) next.grossWeight = `${data.gross_weight_kg} kg`;
      }
      if (docType === "air_waybill") next.shipmentMode = "air";
      if (docType === "paps_document" || docType === "truck_bol_carrier_manifest") next.shipmentMode = "land";
      if (docType === "pars_document" || docType === "aci_emanifest") next.shipmentMode = "land_canada";
      if (docType === "certificate_of_origin" || docType === "usmca_certification" || docType === "korus_certificate") {
        if (data.fta_program) next.ftaDetected = data.fta_program;
        if (docType === "usmca_certification") next.ftaDetected = next.ftaDetected || "USMCA";
        if (docType === "korus_certificate") next.ftaDetected = next.ftaDetected || "KORUS FTA";
        if (data.country_of_origin) next.countryOfOrigin = next.countryOfOrigin || data.country_of_origin;
      }
      if (docType === "packing_list") {
        if (data.total_cartons) next.totalPackages = String(data.total_cartons);
        if (data.total_gross_weight_kg) next.grossWeight = `${data.total_gross_weight_kg} kg`;
      }
      return next;
    });
  }, []);

  // Update the draft shipment record with profile data
  const syncDraftProfile = useCallback(async (sid: string, profile: ShipmentProfileData) => {
    const modeMap: Record<string, string> = {
      "ocean": "sea", "Ocean Import": "sea", "air": "air", "Air Import": "air",
      "land": "land", "land_canada": "land",
    };
    const ensuredId = await ensureDraftShipment(sid);
    if (!ensuredId) {
      console.error("[syncDraftProfile] Cannot sync — draft missing:", sid);
      return;
    }

    const { error } = await supabase.from("shipments").update({
      description: profile.importerOfRecord ? `${profile.importerOfRecord} — ${profile.countryOfOrigin || ""}`.trim() : "Draft — Smart Packet Intake",
      consignee: profile.importerOfRecord || "",
      hs_code: profile.htsCodes[0] || "",
      declared_value: parseFloat(profile.declaredValue) || 0,
      mode: (modeMap[profile.shipmentMode] || "sea") as any,
      origin_country: profile.countryOfOrigin || null,
      packet_score: score || null,
    } as any).eq("shipment_id", sid);

    if (error) {
      console.error("[syncDraftProfile] Update failed:", { sid, error });
    }
  }, [score, ensureDraftShipment]);

  const processFile = useCallback(async (pf: PacketFile, sid: string) => {
    // Step 1: Upload to storage
    updateFile(pf.id, { status: "uploading" });
    const filePath = `${sid}/packet/${pf.file.name}`;
    await supabase.storage.from("shipment-documents").upload(filePath, pf.file, { upsert: true });

    // Step 2: Identify
    updateFile(pf.id, { status: "identifying" });
    const identifyForm = new FormData();
    identifyForm.append("file", pf.file);

    const { data: idResult, error: idError } = await supabase.functions.invoke("packet-identify", {
      body: identifyForm,
    });

    if (idError || idResult?.error) {
      updateFile(pf.id, { status: "error", error: idError?.message || idResult?.error || "Identification failed" });
      return;
    }

    const confidence = idResult.confidence || 0;
    const docType = idResult.document_type || "unknown";

    if (confidence < 0.50 || docType === "unknown") {
      updateFile(pf.id, {
        status: "unidentified", confidence,
        reasoning: idResult.reasoning,
        modeInference: idResult.shipment_mode_inference,
        importerName: idResult.importer_name,
        exporterName: idResult.exporter_name,
      });
      return;
    }

    if (confidence < 0.70) {
      updateFile(pf.id, {
        status: "awaiting_confirmation", documentType: docType, confidence,
        reasoning: idResult.reasoning,
        modeInference: idResult.shipment_mode_inference,
        importerName: idResult.importer_name,
        exporterName: idResult.exporter_name,
        blOrAwbNumber: idResult.bl_or_awb_number,
      });
      return;
    }

    await extractFile(pf.id, pf.file, docType, idResult, sid);
  }, []);

  const extractFile = useCallback(async (
    fileId: string, file: File, docType: string, idResult?: any, sid?: string,
  ) => {
    updateFile(fileId, {
      status: "extracting", documentType: docType,
      confidence: idResult?.confidence || 0.8,
      modeInference: idResult?.shipment_mode_inference,
      importerName: idResult?.importer_name,
      exporterName: idResult?.exporter_name,
      blOrAwbNumber: idResult?.bl_or_awb_number,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", docType);
      formData.append("shipmentMode", profileData.shipmentMode || "");
      formData.append("commodityType", "");
      formData.append("countryOfOrigin", profileData.countryOfOrigin || "");

      const { data, error } = await supabase.functions.invoke("workspace-extract", { body: formData });

      if (error || data?.error) {
        updateFile(fileId, { status: "error", error: error?.message || data?.error });
        return;
      }

      const hasWarnings = (data.warnings?.length || 0) > 0;

      updateFile(fileId, {
        status: hasWarnings ? "extracted_warnings" : "extracted",
        extractedData: data.extracted_data || {},
        fieldDetails: data.field_details || [],
        warnings: data.warnings || [],
        pgaFlags: data.pga_flags || [],
      });

      updateProfileFromExtraction(docType, data.extracted_data || {});
      extractedRef.current[docType] = data.extracted_data || {};

      setScore(prev => {
        const total = Object.keys(extractedRef.current).length;
        return Math.min(Math.round((total / Math.max(total + 3, 8)) * 100), 95);
      });

      // Persist to document library immediately
      const shipmentIdForSave = sid || draftShipmentId || existingShipmentId;
      if (shipmentIdForSave) {
        const pf = files.find(f => f.id === fileId) || { id: fileId, file, savedToLibrary: false } as any;
        if (!pf.savedToLibrary) {
          saveFileToLibrary(pf, docType, data.extracted_data || {}, shipmentIdForSave);
        }
      }

      // Sync profile to draft
      if (draftShipmentId) {
        // Use setTimeout to let profileData update first
        setTimeout(() => {
          setProfileData(current => {
            syncDraftProfile(draftShipmentId, current);
            return current;
          });
        }, 500);
      }
    } catch (err: any) {
      updateFile(fileId, { status: "error", error: err.message || "Extraction failed" });
    }
  }, [profileData.shipmentMode, profileData.countryOfOrigin, updateProfileFromExtraction, draftShipmentId, saveFileToLibrary, syncDraftProfile, files]);

  const confirmDocType = useCallback(async (fileId: string, confirmedType: string) => {
    const pf = files.find(f => f.id === fileId);
    if (!pf) return;
    await extractFile(fileId, pf.file, confirmedType, undefined, draftShipmentId || undefined);
  }, [files, extractFile, draftShipmentId]);

  const assignDocType = useCallback(async (fileId: string, assignedType: string) => {
    const pf = files.find(f => f.id === fileId);
    if (!pf) return;
    await extractFile(fileId, pf.file, assignedType, undefined, draftShipmentId || undefined);
  }, [files, extractFile, draftShipmentId]);

  const runCrossRef = useCallback(async () => {
    if (Object.keys(extractedRef.current).length < 2) return;
    try {
      const documents = Object.entries(extractedRef.current).map(([type, data]) => ({
        document_type: type, extracted_data: data,
      }));
      const { data } = await supabase.functions.invoke("workspace-crossref", {
        body: { documents, shipmentMode: profileData.shipmentMode, commodityType: "", countryOfOrigin: profileData.countryOfOrigin },
      });
      if (data?.discrepancies) setCrossRefResults(data.discrepancies);
    } catch {}
  }, [profileData]);

  const startProcessing = useCallback(async (queuedFiles: PacketFile[]) => {
    const sid = await createDraft();
    if (!sid) {
      console.error("[startProcessing] Aborting — no draft shipment id");
      return;
    }

    const promises = queuedFiles.map(pf => processFile(pf, sid!).catch(err => {
      updateFile(pf.id, { status: "error", error: err.message || "Processing failed" });
    }));
    await Promise.allSettled(promises);

    await runCrossRef();
    detectMultipleShipments();
  }, [processFile, createDraft, draftShipmentId, runCrossRef]);

  const detectMultipleShipments = useCallback(() => {
    const importers = new Map<string, string[]>();
    files.forEach(f => {
      if (f.importerName && f.status !== "error") {
        const key = f.importerName.toLowerCase().trim();
        if (!importers.has(key)) importers.set(key, []);
        importers.get(key)!.push(f.id);
      }
    });
    if (importers.size > 1) {
      const shipments: DetectedShipment[] = [];
      let i = 0;
      importers.forEach((fileIds, name) => {
        shipments.push({ id: `shipment_${++i}`, importerName: name, commodity: "", origin: "", fileIds });
      });
      setDetectedShipments(shipments);
    }
  }, [files]);

  // Activate draft → move to active status
  const activateDraft = useCallback(async (): Promise<string | null> => {
    const sid = draftShipmentId;
    if (!sid) return null;

    const ensuredId = await ensureDraftShipment(sid);
    if (!ensuredId) {
      console.error("[activateDraft] Cannot activate — draft missing:", sid);
      return null;
    }

    const modeMap: Record<string, string> = {
      "ocean": "sea", "Ocean Import": "sea", "air": "air", "Air Import": "air",
      "land": "land", "land_canada": "land",
    };

    const docCount = files.filter(f => f.status === "extracted" || f.status === "extracted_warnings").length;
    const remaining = files.filter(f => f.status === "unidentified" || f.status === "error").length;

    const { error } = await supabase.from("shipments").update({
      status: "active" as any,
      description: profileData.importerOfRecord
        ? `${profileData.importerOfRecord} — ${profileData.countryOfOrigin || ""}`.trim()
        : "New Shipment",
      consignee: profileData.importerOfRecord || "",
      hs_code: profileData.htsCodes[0] || "",
      declared_value: parseFloat(profileData.declaredValue) || 0,
      mode: (modeMap[profileData.shipmentMode] || "sea") as any,
      origin_country: profileData.countryOfOrigin || null,
      packet_score: score || null,
    } as any).eq("shipment_id", sid);

    if (error) {
      console.error("[activateDraft] Update failed:", { sid, error });
      return null;
    }

    queryClient.invalidateQueries({ queryKey: ["shipments-sidebar-list"] });

    toast({
      title: `Shipment ${sid} created`,
      description: `${docCount} documents verified · ${remaining} remaining`,
    });

    return sid;
  }, [draftShipmentId, profileData, score, files, queryClient, ensureDraftShipment]);

  // Pause draft → keep as paused
  const pauseDraft = useCallback(async (): Promise<string | null> => {
    const sid = draftShipmentId;
    if (!sid) return null;

    const ensuredId = await ensureDraftShipment(sid);
    if (!ensuredId) {
      console.error("[pauseDraft] Cannot pause — draft missing:", sid);
      return null;
    }

    const { error } = await supabase.from("shipments").update({
      status: "paused" as any,
      description: profileData.importerOfRecord
        ? `${profileData.importerOfRecord} — ${profileData.countryOfOrigin || ""}`.trim()
        : "Draft — resume intake",
      consignee: profileData.importerOfRecord || "",
      hs_code: profileData.htsCodes[0] || "",
      declared_value: parseFloat(profileData.declaredValue) || 0,
      packet_score: score || null,
    } as any).eq("shipment_id", sid);

    if (error) {
      console.error("[pauseDraft] Update failed:", { sid, error });
      return null;
    }

    queryClient.invalidateQueries({ queryKey: ["shipments-sidebar-list"] });

    toast({
      title: "Draft saved",
      description: "Resume anytime from your shipments list",
    });

    return sid;
  }, [draftShipmentId, profileData, score, queryClient, ensureDraftShipment]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
    setCrossRefResults([]);
    setDetectedShipments([]);
    setScore(0);
    extractedRef.current = {};
    setProfileData({ ...DEFAULT_PROFILE });
    // Restore to existing shipment ID if one was provided, otherwise clear
    setDraftShipmentId(existingShipmentId || null);
    setDraftReady(!!existingShipmentId);
  }, [existingShipmentId]);

  const stats = {
    total: files.length,
    identified: files.filter(f => ["extracted", "extracted_warnings", "extracting"].includes(f.status)).length,
    fieldsExtracted: files.reduce((sum, f) => sum + (f.fieldDetails?.length || 0), 0),
    crossChecks: crossRefResults.length,
    issues: crossRefResults.filter(cr => cr.severity === "critical" || cr.severity === "high").length,
    processing: files.some(f => ["queued", "uploading", "identifying", "extracting"].includes(f.status)),
  };

  return {
    files, addFiles, removeFile, startProcessing,
    confirmDocType, assignDocType,
    crossRefResults, detectedShipments, profileData,
    score, stats, reset,
    draftShipmentId, draftReady, createDraft,
    activateDraft, pauseDraft, syncDraftProfile,
  };
}
