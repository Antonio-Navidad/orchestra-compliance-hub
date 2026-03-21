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
          // Create a placeholder File so uploadedFiles registers the doc as uploaded
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
  }, [shipmentId, libraryLoaded]);

  // Reset library loaded flag when shipmentId changes
  useEffect(() => { setLibraryLoaded(false); }, [shipmentId]);

  // Auto-load on shipmentId change
  useEffect(() => { loadFromLibrary(); }, [loadFromLibrary]);

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

      setExtractedDocs(prev => {
        const next = { ...prev, [docId]: extracted };
        return next;
      });

      toast.success(`${docId.replace(/_/g, " ")} extracted successfully`);

      // Save to document_library for persistence
      if (shipmentId && shipmentId !== 'draft') {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("document_library").upsert({
            shipment_id: shipmentId,
            document_type: docId,
            file_name: file.name,
            file_path: filePath,
            mime_type: file.type || "application/pdf",
            file_size_bytes: file.size,
            extraction_status: "complete",
            extracted_fields: data.extracted_data || {},
            user_id: user?.id || null,
          }, { onConflict: "shipment_id,document_type" });
        } catch (libErr) {
          console.error("[extractDocument] Failed to save to document_library:", libErr);
        }
      }

      // Trigger cross-reference if we have 2+ extracted docs
      const allExtracted = { ...extractedDocsRef.current, [docId]: extracted };
      if (Object.keys(allExtracted).length >= 2) {
        runCrossReference(allExtracted);
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
  }, [shipmentMode, commodityType, countryOfOrigin, shipmentId]);

  const runCrossReference = useCallback(async (docs: Record<string, ExtractedDocData>) => {
    try {
      const documents = Object.values(docs).map(d => ({
        document_type: d.docId,
        extracted_data: d.extractedData,
      }));

      const { data, error } = await supabase.functions.invoke("workspace-crossref", {
        body: { documents, shipmentMode, commodityType, countryOfOrigin },
      });

      if (error) throw error;
      setCrossRefResults(data?.discrepancies || []);
    } catch (err: any) {
      console.error("Cross-reference failed:", err);
    }
  }, [shipmentMode, commodityType, countryOfOrigin]);

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

    // Build extracted fields display
    const fields: ExtractedField[] = ext.fieldDetails.slice(0, 20).map(fd => ({
      label: fd.field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: typeof fd.value === "object" ? JSON.stringify(fd.value) : String(fd.value ?? "—"),
      status: fd.confidence >= 90 ? "verified" : fd.confidence >= 70 ? "flagged" : "error",
    }));

    // Build cross-ref checks for this document
    const checks: CrossRefCheck[] = crossRefResults
      .filter(cr => cr.document_a === docId || cr.document_b === docId)
      .map(cr => ({
        againstDoc: cr.document_a === docId ? cr.document_b.replace(/_/g, " ") : cr.document_a.replace(/_/g, " "),
        label: cr.finding,
        passed: false,
      }));

    // Also add passing checks for pairs with no issues
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

    // Critical discrepancies as red boxes
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

  // Calculate score
  const getScore = useCallback((totalRequired: number, uploadedDocTypes: string[]) => {
    let score = 0;
    let maxScore = totalRequired;

    for (const docId of uploadedDocTypes) {
      const ext = extractedDocs[docId];
      if (!ext) {
        score += 0.5; // uploaded but not yet extracted
        continue;
      }
      const hasCritical = crossRefResults.some(
        cr => (cr.document_a === docId || cr.document_b === docId) && cr.severity === "critical"
      );
      score += hasCritical ? 0.5 : 1;
    }

    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    // Cap at 85% if any unresolved critical discrepancy
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
