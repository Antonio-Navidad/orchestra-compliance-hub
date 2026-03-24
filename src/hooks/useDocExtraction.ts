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
  // ── FIX: store extraction_status from DB so getCardEnhancements can use it ──
  extractionStatus?: string;
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

  // Load cross-ref results from database — never re-run AI, just read saved results
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

  // Load documents from document_library for this shipment
  // ── FIX: now stores extraction_status so card colors are correct on load ──
  const loadFromLibrary = useCallback(async () => {
    if (!shipmentId || shipmentId === 'draft') return;
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
            // ── FIX: store extraction_status from DB ──
            extractionStatus: row.extraction_status || "complete",
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

    // ── FIX: only load saved crossref results from DB — never re-run AI on page load ──
    // Cross-ref is only re-run when a new document is uploaded via extractDocument()
    await loadCrossRefFromDB();
  }, [shipmentId, loadCrossRefFromDB]);

  // ── FIX: removed runPersistentCrossRef from this useEffect ──
  // Previously this re-ran the AI cross-reference on every page load,
  // overwriting saved DB results with different findings each time.
  // Now we just load what's already saved in the DB.

  // Reset library loaded flag when shipmentId changes
  useEffect(() => { setLibraryLoaded(false); }, [shipmentId]);

  // Auto-load on shipmentId change
  useEffect(() => { if (!libraryLoaded) loadFromLibrary(); }, [loadFromLibrary, libraryLoaded]);

  // Force reload — call after intake completes to re-fetch documents and crossref
  const reloadLibrary = useCallback(() => {
    setLibraryLoaded(false);
  }, []);

  // Run cross-reference via AI — only called when a new document is uploaded
  // Results are saved to DB and won't be overwritten until the next upload
  const runCrossRefAfterUpload = useCallback(async () => {
    if (!shipmentId || shipmentId === 'draft') return;
    try {
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

      console.log("[runCrossRefAfterUpload] Comparing", documents.length, "docs");

      const { data, error } = await supabase.functions.invoke("workspace-crossref", {
        body: { documents, shipmentMode, commodityType, countryOfOrigin },
      });

      if (error) throw error;
      const discrepancies: any[] = data?.discrepancies || [];

      const { data: { user } } = await supabase.auth.getUser();

      // Save to DB — this is the single authoritative save
      await supabase.from("crossref_results").delete().eq("shipment_id", shipmentId);

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

        // Update document extraction_status based on finding severity
        const docTypesWithCritical = new Set<string>(
          discrepancies.filter((d: any) => d.severity === "critical")
            .flatMap((d: any) => [d.document_a, d.document_b])
        );
        const docTypesWithHigh = new Set<string>(
          discrepancies.filter((d: any) => d.severity === "high")
            .flatMap((d: any) => [d.document_a, d.document_b])
        );
        for (const docType of docTypesWithCritical) {
          await supabase.from("document_library")
            .update({ extraction_status: "critical_issues" })
            .eq("shipment_id", shipmentId)
            .eq("document_type", docType);
          // Update in-memory status too
          setExtractedDocs(prev => prev[docType]
            ? { ...prev, [docType]: { ...prev[docType], extractionStatus: "critical_issues" } }
            : prev
          );
        }
        for (const docType of docTypesWithHigh) {
          if (!docTypesWithCritical.has(docType)) {
            await supabase.from("document_library")
              .update({ extraction_status: "issues_found" })
              .eq("shipment_id", shipmentId)
              .eq("document_type", docType);
            setExtractedDocs(prev => prev[docType]
              ? { ...prev, [docType]: { ...prev[docType], extractionStatus: "issues_found" } }
              : prev
            );
          }
        }
      }

      // Update in-memory state
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
      console.error("[runCrossRefAfterUpload] Failed:", err);
    }
  }, [shipmentId, shipmentMode, commodityType, countryOfOrigin]);

  const extractDocument = useCallback(async (docId: string, file: File) => {
    setProcessingDocs(prev => new Set(prev).add(docId));
    setUploadedFiles(prev => ({ ...prev, [docId]: file }));

    try {
      const filePath = `${shipmentId}/${docId}/${file.name}`;
      await supabase.storage.from("shipment-documents").upload(filePath, file, { upsert: true });

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
        extractionStatus: "complete",
      };

      setExtractedDocs(prev => ({ ...prev, [docId]: extracted }));
      toast.success(`${docId.replace(/_/g, " ")} extracted successfully`);

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

        // Save packing list internal errors
        const internalErrors: any[] = data.internal_errors || [];
        if (internalErrors.length > 0 && docId.includes("packing_list")) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from("crossref_results")
              .delete()
              .eq("shipment_id", shipmentId)
              .eq("document_a_type", "packing_list")
              .eq("document_b_type", "packing_list");

            const rows = internalErrors.map((ie: any) => ({
              shipment_id: shipmentId,
              document_a_type: "packing_list",
              document_b_type: "packing_list",
              field_checked: ie.check,
              severity: ie.severity,
              finding: ie.finding,
              recommendation: ie.expected_value && ie.actual_value
                ? `Expected: ${ie.expected_value}, Found: ${ie.actual_value}`
                : "Review and correct the packing list",
              estimated_financial_impact_usd: 0,
              user_id: user?.id || null,
            }));
            await supabase.from("crossref_results").insert(rows);

            setCrossRefResults(prev => [
              ...prev.filter(r => !(r.document_a === "packing_list" && r.document_b === "packing_list")),
              ...rows.map(r => ({
                severity: r.severity as "critical" | "high" | "medium" | "low",
                document_a: r.document_a_type,
                document_b: r.document_b_type,
                field_checked: r.field_checked,
                finding: r.finding,
                recommendation: r.recommendation,
                estimated_financial_impact_usd: 0,
              })),
            ]);
          } catch (ieErr) {
            console.error("[extractDocument] Failed to save internal errors:", ieErr);
          }
        }

        // ── FIX: run cross-ref after upload (not on page load) ──
        await runCrossRefAfterUpload();
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
  }, [shipmentMode, commodityType, countryOfOrigin, shipmentId, runCrossRefAfterUpload]);

  // Build card data from extraction results
  const getCardEnhancements = useCallback((docId: string): {
    state?: DocCardState;
    statusLine?: string;
    extractedFields?: ExtractedField[];
    crossRefChecks?: CrossRefCheck[];
    discrepancies?: Array<{ severity: "critical" | "high" | "medium" | "low"; label: string; detail: string; impact?: string }>;
    notes?: string[];
  } => {
    if (processingDocs.has(docId)) {
      return { statusLine: "Processing with AI — extracting data..." };
    }

    const ext = extractedDocs[docId];
    if (!ext) return {};

    const fields: ExtractedField[] = ext.fieldDetails.slice(0, 30).map(fd => ({
      label: fd.field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: typeof fd.value === "object" ? JSON.stringify(fd.value) : String(fd.value ?? "—"),
      status: fd.confidence >= 90 ? "verified" : fd.confidence >= 70 ? "flagged" : "error",
    }));

    // Cross-ref checks from other documents
    const checks: CrossRefCheck[] = crossRefResults
      .filter(cr => (cr.document_a === docId || cr.document_b === docId) && cr.document_a !== cr.document_b)
      .map(cr => ({
        againstDoc: cr.document_a === docId ? cr.document_b.replace(/_/g, " ") : cr.document_a.replace(/_/g, " "),
        label: cr.finding,
        passed: false,
      }));

    // Internal self-check findings (e.g. packing_list vs packing_list)
    const selfChecks: CrossRefCheck[] = crossRefResults
      .filter(cr => cr.document_a === docId && cr.document_b === docId)
      .map(cr => ({
        againstDoc: "Internal check",
        label: cr.finding,
        passed: false,
      }));

    const allChecks = [...selfChecks, ...checks];

    const allDocTypes = Object.keys(extractedDocs);
    for (const otherDoc of allDocTypes) {
      if (otherDoc === docId) continue;
      const hasIssue = crossRefResults.some(cr => {
        const involves = (cr.document_a === docId && cr.document_b === otherDoc) ||
                         (cr.document_b === docId && cr.document_a === otherDoc);
        if (!involves) return false;
        const text = (cr.finding + ' ' + (cr.recommendation || '')).toLowerCase();
        return !text.includes('no action needed') && !text.includes('no discrepancy found');
      });
      if (!hasIssue) {
        allChecks.push({
          againstDoc: otherDoc.replace(/_/g, " "),
          label: "All fields match",
          passed: true,
        });
      }
    }

    // Build structured discrepancy items
    const allRelevantResults = crossRefResults
      .filter(cr => (cr.document_a === docId || cr.document_b === docId) && (cr.severity === "critical" || cr.severity === "high"))
      .filter(cr => {
        const text = (cr.finding + ' ' + cr.recommendation).toLowerCase();
        return !text.includes('no action needed') && !text.includes('no discrepancy found') && !text.includes('matches — no action');
      });

    const discrepancies = allRelevantResults.map(cr => {
      const rawLabel = cr.field_checked.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      const isInternal = cr.document_a === cr.document_b;
      const label = isInternal ? `Internal: ${rawLabel}` : `${rawLabel} Mismatch`;
      return {
        severity: cr.severity as "critical" | "high" | "medium" | "low",
        label,
        detail: cr.recommendation || cr.finding,
        impact: cr.estimated_financial_impact_usd > 0 ? `$${cr.estimated_financial_impact_usd.toLocaleString()}` : undefined,
      };
    });

    // ── FIX: use extraction_status from DB as authoritative source for card color ──
    // This ensures cards show correct color even before crossref results are computed
    const dbStatus = ext.extractionStatus || "complete";
    const hasCriticalFromDB = dbStatus === "critical_issues";
    const hasHighFromDB = dbStatus === "issues_found";

    const hasCritical = hasCriticalFromDB || crossRefResults.some(cr =>
      (cr.document_a === docId || cr.document_b === docId) && cr.severity === "critical"
    );
    const hasHigh = hasHighFromDB || crossRefResults.some(cr =>
      (cr.document_a === docId || cr.document_b === docId) && cr.severity === "high"
    );
    const hasInternalErrors = selfChecks.length > 0;
    const hasIssues = discrepancies.length > 0 || ext.warnings.length > 0;

    // ── FIX: never show green if DB status indicates issues ──
    const isClean = !hasCritical && !hasHigh && !hasInternalErrors && discrepancies.length === 0 && ext.warnings.length === 0;

    return {
      state: hasCritical ? "critical" as const :
             (hasHigh || hasInternalErrors || hasIssues) ? "issue" as const : "verified" as const,
      statusLine: hasCritical ? "AI extracted — critical issues" :
                  hasHigh ? `AI extracted — ${Math.max(discrepancies.length, 1)} issue(s) found` :
                  hasInternalErrors ? `AI extracted — ${selfChecks.length} internal error(s) detected` :
                  hasIssues ? `AI extracted — issues found` :
                  "Uploaded · AI verified clean",
      extractedFields: fields,
      crossRefChecks: allChecks.length > 0 ? allChecks : undefined,
      discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
      notes: ext.warnings.length > 0 ? ext.warnings : undefined,
    };
  }, [extractedDocs, crossRefResults, processingDocs]);

  // ── FIX: consistent score calculation ──
  // Uses the same formula in both the checklist view and the intake view:
  // (verified docs without critical issues) / (total required docs) * 100
  // Capped at 85% if any critical finding exists
  const getScore = useCallback((totalRequired: number, uploadedDocTypes: string[]) => {
    let score = 0;

    for (const docId of uploadedDocTypes) {
      const ext = extractedDocs[docId];
      if (!ext) {
        score += 0.5; // uploaded but not yet extracted = partial credit
        continue;
      }
      const hasCritical = crossRefResults.some(
        cr => (cr.document_a === docId || cr.document_b === docId) && cr.severity === "critical"
      );
      const dbStatus = ext.extractionStatus || "complete";
      const hasCriticalFromDB = dbStatus === "critical_issues";
      score += (hasCritical || hasCriticalFromDB) ? 0.5 : 1;
    }

    const pct = totalRequired > 0 ? Math.round((score / totalRequired) * 100) : 0;
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
    reloadLibrary,
  };
}
