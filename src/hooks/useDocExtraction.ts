import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ExtractedField, CrossRefCheck, DocumentCardData, DocCardState } from "@/components/workspace/DocumentCard";

export interface ExtractedDocData {
  docId: string;
  documentType: string;
  extractedData: Record<string, any>;
  fieldDetails: Array<{ field: string; value: any; confidence: number; source_location: string }>;
  warnings: string[];
  pgaFlags: Array<{ agency: string; requirement: string; mandatory: boolean; reason: string }>;
}

export interface CrossRefResult {
  severity: "critical" | "high" | "medium" | "low";
  document_a: string;
  document_b: string;
  field_checked: string;
  finding: string;
  recommendation: string;
  estimated_financial_impact_usd: number;
  id?: string;
  resolved?: boolean;
}

interface UseDocExtractionOptions {
  shipmentMode: string;
  commodityType: string;
  countryOfOrigin: string;
  shipmentId: string;
}

export function useDocExtraction({ shipmentMode, commodityType, countryOfOrigin, shipmentId }: UseDocExtractionOptions) {
  const [extractedDocs, setExtractedDocs] = useState<Record<string, ExtractedDocData>>({});
  const [crossRefResults, setCrossRefResults] = useState<CrossRefResult[]>([]);
  const [processingDocs, setProcessingDocs] = useState<Set<string>>(new Set());
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const extractedDocsRef = useRef(extractedDocs);
  extractedDocsRef.current = extractedDocs;

  // Load cross-ref results from database
  const loadCrossRefFromDB = useCallback(async () => {
    if (!shipmentId || shipmentId === 'draft') return;
    try {
      const { data } = await supabase
        .from("crossref_results")
        .select("*")
        .eq("shipment_id", shipmentId);
      if (data && data.length > 0) {
        console.log("[loadCrossRef] Found", data.length, "cross-ref results in DB");
        setCrossRefResults(data.map((r: any) => ({
          id: r.id,
          severity: r.severity,
          document_a: r.document_a_type,
          document_b: r.document_b_type,
          field_checked: r.field_checked,
          finding: r.finding,
          recommendation: r.recommendation || "",
          estimated_financial_impact_usd: Number(r.estimated_financial_impact_usd) || 0,
          resolved: r.resolved,
        })));
      }
    } catch (err) {
      console.error("[loadCrossRef] Failed:", err);
    }
  }, [shipmentId]);

  // Load documents from document_library for this shipment on mount / shipmentId change
  const loadFromLibrary = useCallback(async () => {
    if (!shipmentId || shipmentId === 'draft' || libraryLoaded) return;
    console.log("[loadFromLibrary] Loading docs for shipmentId:", shipmentId);
    try {
      const { data } = await supabase
        .from("document_library")
        .select("document_type, extracted_fields, extraction_status, file_name")
        .eq("shipment_id", shipmentId);
      if (data && data.length > 0) {
        console.log("[loadFromLibrary] Found", data.length, "docs in library");
        const newDocs: Record<string, ExtractedDocData> = {};
        const newFiles: Record<string, File> = {};
        for (const row of data) {
          const docType = row.document_type;
          if (!docType) continue;
          const fields = (row.extracted_fields || {}) as Record<string, any>;
          const fieldDetails = Object.entries(fields).map(([key, val]) => ({
            field: key,
            value: val,
            confidence: 95,
            source_location: "Smart Packet Intake",
          }));
          newDocs[docType] = {
            docId: docType,
            documentType: docType,
            extractedData: fields,
            fieldDetails,
            warnings: [],
            pgaFlags: [],
          };
          if (row.file_name) {
            newFiles[docType] = new File([], row.file_name, { type: "application/pdf" });
          }
        }
        if (Object.keys(newDocs).length > 0) {
          setExtractedDocs(prev => ({ ...prev, ...newDocs }));
          setUploadedFiles(prev => ({ ...prev, ...newFiles }));
        }
      }
    } catch (err) {
      console.error("Failed to load document library:", err);
    }
    setLibraryLoaded(true);
    // Also load persisted cross-ref results
    await loadCrossRefFromDB();
  }, [shipmentId, libraryLoaded, loadCrossRefFromDB]);

  // Reset library loaded flag when shipmentId changes
  useEffect(() => { setLibraryLoaded(false); }, [shipmentId]);

  // Auto-load on shipmentId change
  useEffect(() => { loadFromLibrary(); }, [loadFromLibrary]);

  // Persistent cross-reference: queries ALL verified docs from document_library then calls edge function
  const runPersistentCrossRef = useCallback(async () => {
    if (!shipmentId || shipmentId === 'draft') return;
    try {
      // Step 1: Get ALL verified docs from document_library for this shipment
      const { data: allDocs } = await supabase
        .from("document_library")
        .select("document_type, extracted_fields")
        .eq("shipment_id", shipmentId)
        .eq("extraction_status", "complete");

      if (!allDocs || allDocs.length < 2) return;

      const documents = allDocs
        .filter((d: any) => d.document_type && d.extracted_fields)
        .map((d: any) => ({
          document_type: d.document_type,
          extracted_data: d.extracted_fields,
        }));

      if (documents.length < 2) return;

      console.log("[runPersistentCrossRef] Comparing", documents.length, "docs from document_library");

      // Step 2: Call workspace-crossref edge function
      const { data, error } = await supabase.functions.invoke("workspace-crossref", {
        body: { documents, shipmentMode, commodityType, countryOfOrigin },
      });

      if (error) throw error;
      const discrepancies: any[] = data?.discrepancies || [];

      // Step 3: Get current user for RLS
      const { data: { user } } = await supabase.auth.getUser();

      // Step 4: Replace all crossref_results for this shipment with fresh results
      await supabase.from("crossref_results")
        .delete()
        .eq("shipment_id", shipmentId);

      if (discrepancies.length > 0) {
        const rows = discrepancies.map((d: any) => ({
          shipment_id: shipmentId,
          document_a_type: d.document_a,
          document_b_type: d.document_b,
          field_checked: d.field_checked,
          severity: d.severity,
          finding: d.finding,
          recommendation: d.recommendation || "",
          estimated_financial_impact_usd: d.estimated_financial_impact_usd || 0,
          user_id: user?.id || null,
        }));
        await supabase.from("crossref_results").insert(rows);
      }

      // Step 5: Update in-memory state
      setCrossRefResults(discrepancies.map((d: any) => ({
        severity: d.severity,
        document_a: d.document_a,
        document_b: d.document_b,
        field_checked: d.field_checked,
        finding: d.finding,
        recommendation: d.recommendation || "",
        estimated_financial_impact_usd: d.estimated_financial_impact_usd || 0,
      })));

      if (discrepancies.length > 0) {
        toast.info(`Cross-reference found ${discrepancies.length} issue(s)`);
      }
    } catch (err: any) {
      console.error("[runPersistentCrossRef] Failed:", err);
    }
  }, [shipmentId, shipmentMode, commodityType, countryOfOrigin]);

  const extractDocument = useCallback(async (docId: string, file: File) => {
    setProcessingDocs(prev => new Set(prev).add(docId));
    setUploadedFiles(prev => ({ ...prev, [docId]: file }));

    try {
      // Upload to storage
      const filePath = `${shipmentId}/${docId}/${file.name}`;
      await supabase.storage.from("shipment-documents").upload(filePath, file, { upsert: true });

      // Call extraction edge function
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", docId);
      formData.append("shipmentMode", shipmentMode);
      formData.append("commodityType", commodityType);
      formData.append("countryOfOrigin", countryOfOrigin);

      const { data, error } = await supabase.functions.invoke("workspace-extract", { body: formData });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const extracted: ExtractedDocData = {
        docId,
        documentType: data.document_type_detected || docId,
        extractedData: data.extracted_data || {},
        fieldDetails: data.field_details || [],
        warnings: data.warnings || [],
        pgaFlags: data.pga_flags || [],
      };

      setExtractedDocs(prev => ({ ...prev, [docId]: extracted }));

      toast.success(`${docId.replace(/_/g, " ")} extracted successfully`);

      // Save to document_library for persistence
      if (shipmentId && shipmentId !== 'draft') {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("document_library")
            .delete()
            .eq("shipment_id", shipmentId)
            .eq("document_type", docId);
          await supabase.from("document_library").insert({
            shipment_id: shipmentId,
            document_type: docId,
            file_name: file.name,
            file_path: filePath,
            mime_type: file.type || "application/pdf",
            file_size_bytes: file.size,
            extraction_status: "complete",
            extracted_fields: data.extracted_data || {},
            user_id: user?.id || null,
          });
        } catch (libErr) {
          console.error("[extractDocument] Failed to save to document_library:", libErr);
        }

        // Trigger persistent cross-reference against ALL docs in document_library
        runPersistentCrossRef();
      }

      return extracted;
    } catch (err: any) {
      console.error(`Extraction failed for ${docId}:`, err);
      toast.error(`Extraction failed: ${err.message || "Unknown error"}`);
      return null;
    } finally {
      setProcessingDocs(prev => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  }, [shipmentMode, commodityType, countryOfOrigin, shipmentId, runPersistentCrossRef]);

  // Build card data from extraction results
  const getCardEnhancements = useCallback((docId: string): {
    state?: DocCardState;
    statusLine?: string;
    extractedFields?: ExtractedField[];
    crossRefChecks?: CrossRefCheck[];
    discrepancies?: string[];
    notes?: string[];
  } => {
    if (processingDocs.has(docId)) {
      return { statusLine: "Processing with AI — extracting data..." };
    }

    const ext = extractedDocs[docId];
    if (!ext) return {};

    const fields: ExtractedField[] = ext.fieldDetails.slice(0, 20).map(fd => ({
      label: fd.field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: typeof fd.value === "object" ? JSON.stringify(fd.value) : String(fd.value ?? "—"),
      status: fd.confidence >= 90 ? "verified" : fd.confidence >= 70 ? "flagged" : "error",
    }));

    const checks: CrossRefCheck[] = crossRefResults
      .filter(cr => cr.document_a === docId || cr.document_b === docId)
      .map(cr => ({
        againstDoc: cr.document_a === docId ? cr.document_b.replace(/_/g, " ") : cr.document_a.replace(/_/g, " "),
        label: cr.finding,
        passed: false,
      }));

    const allDocTypes = Object.keys(extractedDocs);
    for (const otherDoc of allDocTypes) {
      if (otherDoc === docId) continue;
      const hasIssue = crossRefResults.some(
        cr => (cr.document_a === docId && cr.document_b === otherDoc) ||
              (cr.document_b === docId && cr.document_a === otherDoc)
      );
      if (!hasIssue) {
        checks.push({
          againstDoc: otherDoc.replace(/_/g, " "),
          label: "All fields match",
          passed: true,
        });
      }
    }

    const discrepancies = crossRefResults
      .filter(cr => (cr.document_a === docId || cr.document_b === docId) && (cr.severity === "critical" || cr.severity === "high"))
      .map(cr => `${cr.finding} — ${cr.recommendation}${cr.estimated_financial_impact_usd > 0 ? ` (est. $${cr.estimated_financial_impact_usd.toLocaleString()} impact)` : ""}`);

    const hasIssues = discrepancies.length > 0 || ext.warnings.length > 0;
    const hasCritical = crossRefResults.some(cr =>
      (cr.document_a === docId || cr.document_b === docId) && cr.severity === "critical"
    );

    return {
      state: hasCritical ? "issue" : hasIssues ? "issue" : "verified",
      statusLine: hasCritical ? "AI verified — critical discrepancies found" :
                  hasIssues ? `AI verified — ${discrepancies.length} issue(s) flagged` :
                  "Uploaded · AI verified clean",
      extractedFields: fields,
      crossRefChecks: checks.length > 0 ? checks : undefined,
      discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
      notes: ext.warnings.length > 0 ? ext.warnings : undefined,
    };
  }, [extractedDocs, crossRefResults, processingDocs]);

  const getScore = useCallback((totalRequired: number, uploadedDocTypes: string[]) => {
    let score = 0;
    let maxScore = totalRequired;

    for (const docId of uploadedDocTypes) {
      const ext = extractedDocs[docId];
      if (!ext) {
        score += 0.5;
        continue;
      }
      const hasCritical = crossRefResults.some(
        cr => (cr.document_a === docId || cr.document_b === docId) && cr.severity === "critical"
      );
      score += hasCritical ? 0.5 : 1;
    }

    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const hasAnyCritical = crossRefResults.some(cr => cr.severity === "critical");
    return hasAnyCritical ? Math.min(pct, 85) : pct;
  }, [extractedDocs, crossRefResults]);

  return {
    extractDocument,
    extractedDocs,
    crossRefResults,
    processingDocs,
    uploadedFiles,
    getCardEnhancements,
    getScore,
  };
}
