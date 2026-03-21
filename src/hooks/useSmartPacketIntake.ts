import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  shipmentGroup: string | null; // for multi-shipment detection
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

export function useSmartPacketIntake(shipmentId?: string) {
  const [files, setFiles] = useState<PacketFile[]>([]);
  const [crossRefResults, setCrossRefResults] = useState<CrossRefFinding[]>([]);
  const [detectedShipments, setDetectedShipments] = useState<DetectedShipment[]>([]);
  const [profileData, setProfileData] = useState<ShipmentProfileData>({
    importerOfRecord: "", exporterSeller: "", countryOfOrigin: "",
    declaredValue: "", currency: "USD", htsCodes: [], shipmentMode: "",
    incoterms: "", ftaDetected: "", relatedParty: false,
    portOfLoading: "", portOfDischarge: "", blNumber: "",
    vesselName: "", containerNumbers: [], totalPackages: "", grossWeight: "",
  });
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const extractedRef = useRef<Record<string, any>>({});

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
        if (data.related_parties) next.relatedParty = data.related_parties;
        if (data.line_items?.length) {
          const codes = data.line_items
            .map((li: any) => li.hts_6digit)
            .filter(Boolean);
          if (codes.length) next.htsCodes = [...new Set([...next.htsCodes, ...codes])];
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
      if (docType === "air_waybill") {
        next.shipmentMode = "air";
      }
      if (docType === "paps_document" || docType === "truck_bol_carrier_manifest") {
        next.shipmentMode = "land";
      }
      if (docType === "pars_document" || docType === "aci_emanifest") {
        next.shipmentMode = "land_canada";
      }
      if (docType === "certificate_of_origin" || docType === "usmca_certification") {
        if (data.fta_program) next.ftaDetected = data.fta_program;
        if (data.country_of_origin) next.countryOfOrigin = next.countryOfOrigin || data.country_of_origin;
      }
      if (docType === "packing_list") {
        if (data.total_cartons) next.totalPackages = String(data.total_cartons);
        if (data.total_gross_weight_kg) next.grossWeight = `${data.total_gross_weight_kg} kg`;
      }
      return next;
    });
  }, []);

  const processFile = useCallback(async (pf: PacketFile) => {
    const sid = shipmentId || "draft";

    // Step 1: Upload
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
        status: "unidentified",
        confidence,
        reasoning: idResult.reasoning,
        modeInference: idResult.shipment_mode_inference,
        importerName: idResult.importer_name,
        exporterName: idResult.exporter_name,
      });
      return;
    }

    if (confidence < 0.70) {
      updateFile(pf.id, {
        status: "awaiting_confirmation",
        documentType: docType,
        confidence,
        reasoning: idResult.reasoning,
        modeInference: idResult.shipment_mode_inference,
        importerName: idResult.importer_name,
        exporterName: idResult.exporter_name,
        blOrAwbNumber: idResult.bl_or_awb_number,
      });
      return;
    }

    // High confidence — proceed to extraction
    await extractFile(pf.id, pf.file, docType, idResult);
  }, [shipmentId]);

  const extractFile = useCallback(async (
    fileId: string, file: File, docType: string, idResult?: any,
  ) => {
    updateFile(fileId, {
      status: "extracting",
      documentType: docType,
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

      // Update profile from extracted data
      updateProfileFromExtraction(docType, data.extracted_data || {});

      // Store for cross-ref
      extractedRef.current[docType] = data.extracted_data || {};

      // Update score
      setScore(prev => {
        const total = Object.keys(extractedRef.current).length;
        return Math.min(Math.round((total / Math.max(total + 3, 8)) * 100), 95);
      });
    } catch (err: any) {
      updateFile(fileId, { status: "error", error: err.message || "Extraction failed" });
    }
  }, [profileData.shipmentMode, profileData.countryOfOrigin, updateProfileFromExtraction]);

  const confirmDocType = useCallback(async (fileId: string, confirmedType: string) => {
    const pf = files.find(f => f.id === fileId);
    if (!pf) return;
    await extractFile(fileId, pf.file, confirmedType);
  }, [files, extractFile]);

  const assignDocType = useCallback(async (fileId: string, assignedType: string) => {
    const pf = files.find(f => f.id === fileId);
    if (!pf) return;
    await extractFile(fileId, pf.file, assignedType);
  }, [files, extractFile]);

  const startProcessing = useCallback(async (queuedFiles: PacketFile[]) => {
    // Process all files in parallel
    const promises = queuedFiles.map(pf => processFile(pf).catch(err => {
      updateFile(pf.id, { status: "error", error: err.message || "Processing failed" });
    }));
    await Promise.allSettled(promises);

    // Run cross-reference after all files done
    if (Object.keys(extractedRef.current).length >= 2) {
      try {
        const documents = Object.entries(extractedRef.current).map(([type, data]) => ({
          document_type: type,
          extracted_data: data,
        }));
        const { data } = await supabase.functions.invoke("workspace-crossref", {
          body: { documents, shipmentMode: profileData.shipmentMode, commodityType: "", countryOfOrigin: profileData.countryOfOrigin },
        });
        if (data?.discrepancies) setCrossRefResults(data.discrepancies);
      } catch {}
    }

    // Multi-shipment detection
    detectMultipleShipments();
    setIsComplete(true);
  }, [processFile, profileData]);

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
        shipments.push({
          id: `shipment_${++i}`,
          importerName: name,
          commodity: "",
          origin: "",
          fileIds,
        });
      });
      setDetectedShipments(shipments);
    }
  }, [files]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
    setCrossRefResults([]);
    setDetectedShipments([]);
    setIsComplete(false);
    setScore(0);
    extractedRef.current = {};
    setProfileData({
      importerOfRecord: "", exporterSeller: "", countryOfOrigin: "",
      declaredValue: "", currency: "USD", htsCodes: [], shipmentMode: "",
      incoterms: "", ftaDetected: "", relatedParty: false,
      portOfLoading: "", portOfDischarge: "", blNumber: "",
      vesselName: "", containerNumbers: [], totalPackages: "", grossWeight: "",
    });
  }, []);

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
    isComplete, score, stats, reset,
  };
}
