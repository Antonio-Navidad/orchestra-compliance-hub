/**
 * useValidation.ts
 *
 * Complete extract → cross-reference pipeline for Orchestra AI.
 *
 * Call order (this is the critical fix):
 *   1. workspace-extract   — OCR the actual document, get structured JSON
 *   2. (save to `documents` table)
 *   3. workspace-crossref  — compare extracted JSON across documents
 *   4. (save findings to `exceptions` table)
 *
 * Uses the new project schema:
 *   - `documents`           (extracted_data, extraction_status, document_type)
 *   - `exceptions`          (severity, category, field_name, source_document, found_value, expected_value)
 *   - `validation_runs`     (orchestrates the run, records readiness score)
 *   - `workspace_subscriptions` (credits)
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentSlot {
  docType: string;           // e.g. "commercial_invoice", "bill_of_lading", "packing_list"
  file: File | null;
  status: "empty" | "uploading" | "extracting" | "done" | "error";
  extractedData: Record<string, any> | null;
  warnings: string[];
  internalErrors: any[];
  pgaFlags: any[];
  error: string | null;
}

export interface ValidationFinding {
  severity: "critical" | "high" | "medium" | "low";
  document_a: string;
  document_b: string;
  field_checked: string;
  finding: string;
  recommendation: string;
  estimated_financial_impact_usd: number;
}

export interface ValidationResult {
  findings: ValidationFinding[];
  complianceWarnings: any[];
  readinessScore: number;  // 0–100
  status: "clean" | "review" | "hold";
  validationRunId: string | null;
  total_exposure_usd: number;
  total_exposure_summary: string;
  workspace_accuracy_pct: number | null;
}

interface UseValidationOptions {
  shipmentId: string;
  workspaceId?: string;
  shipmentMode?: string;
  commodityType?: string;
  countryOfOrigin?: string;
  declaredValueUsd?: number;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useValidation({
  shipmentId,
  workspaceId,
  shipmentMode = "ocean",
  commodityType = "",
  countryOfOrigin = "",
  declaredValueUsd = 0,
}: UseValidationOptions) {
  const [slots, setSlots] = useState<Record<string, DocumentSlot>>({});
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const extractedRef = useRef<Record<string, Record<string, any>>>({});

  // ─── Upload + Extract one document ─────────────────────────────────────────

  const extractDocument = useCallback(async (docType: string, file: File): Promise<boolean> => {
    setSlots(prev => ({
      ...prev,
      [docType]: {
        docType, file,
        status: "extracting",
        extractedData: null,
        warnings: [], internalErrors: [], pgaFlags: [],
        error: null,
      },
    }));

    try {
      // Upload file to storage first
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `${shipmentId}/${docType}/${Date.now()}_${file.name}`;
      await supabase.storage
        .from("shipment-documents")
        .upload(filePath, file, { upsert: true });

      // ── STEP 1: Call workspace-extract (gets REAL document content) ──────────
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", docType);
      formData.append("shipmentMode", shipmentMode);
      formData.append("commodityType", commodityType);
      formData.append("countryOfOrigin", countryOfOrigin);

      // Explicitly attach the session JWT — supabase.functions.invoke does NOT
      // automatically include the Authorization header when the body is FormData
      // (known SDK issue). Without this the edge function returns 401.
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("workspace-extract", {
        body: formData,
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      });

      // Supabase SDK v2: for non-2xx responses, data=null and error.context = Response object.
      // We must read the actual error from the response body to get the real message.
      if (error) {
        let actualMessage = error.message;
        try {
          // error.context is the raw Response — read the JSON body to get the real error
          const body = await (error as any).context?.json?.();
          if (body?.error) actualMessage = body.error;
        } catch { /* body unreadable or already consumed — fall back to SDK message */ }
        throw new Error(actualMessage);
      }
      if (data?.error) throw new Error(data.error);

      const extracted = data.extracted_data || {};
      const warnings: string[] = data.warnings || [];
      const internalErrors: any[] = data.internal_errors || [];
      const pgaFlags: any[] = data.pga_flags || [];

      // Keep a ref copy for the crossref step
      extractedRef.current[docType] = extracted;

      // ── Save extraction to `documents` table ─────────────────────────────────
      await supabase.from("documents").upsert({
        shipment_id: shipmentId,
        workspace_id: workspaceId || null,
        document_type: docType,
        file_name: file.name,
        file_url: filePath,
        file_size_bytes: file.size,
        extracted_data: extracted,
        extraction_status: "complete",
        uploaded_at: new Date().toISOString(),
      }, { onConflict: "shipment_id,document_type" });

      setSlots(prev => ({
        ...prev,
        [docType]: {
          ...prev[docType],
          status: "done",
          extractedData: extracted,
          warnings,
          internalErrors,
          pgaFlags,
        },
      }));

      toast.success(`${docType.replace(/_/g, " ")} extracted`);
      return true;

    } catch (err: any) {
      console.error(`[useValidation] extractDocument failed for ${docType}:`, err);
      setSlots(prev => ({
        ...prev,
        [docType]: { ...prev[docType], status: "error", error: err.message || "Extraction failed" },
      }));
      toast.error(`Failed to extract ${docType.replace(/_/g, " ")}: ${err.message}`);
      return false;
    }
  }, [shipmentId, workspaceId, shipmentMode, commodityType, countryOfOrigin]);

  // ─── Run cross-reference after 2+ documents are extracted ──────────────────

  const runCrossRef = useCallback(async (): Promise<ValidationResult | null> => {
    const extracted = extractedRef.current;
    const docTypes = Object.keys(extracted);

    if (docTypes.length < 2) {
      toast.info("Upload at least 2 documents to run cross-reference");
      return null;
    }

    setIsRunning(true);

    try {
      // ── STEP 2: Call workspace-crossref with REAL extracted data ─────────────
      // This is the key fix: we pass extracted_data (actual document content),
      // NOT filenames or metadata.
      const documents = docTypes.map(docType => ({
        document_type: docType,
        extracted_data: extracted[docType],
      }));

      const { data, error } = await supabase.functions.invoke("workspace-crossref", {
        body: {
          documents,
          shipmentMode,
          commodityType,
          countryOfOrigin,
          declaredValueUsd,
          shipmentId,
          workspaceId: workspaceId || null,
        },
      });

      if (error) throw new Error(error.message);

      const findings: ValidationFinding[] = data?.discrepancies || [];
      const complianceWarnings: any[] = data?.compliance_warnings || [];
      const total_exposure_usd: number = data?.total_exposure_usd || 0;
      const total_exposure_summary: string = data?.total_exposure_summary || "";
      const workspace_accuracy_pct: number | null = data?.workspace_accuracy_pct ?? null;

      // ── Save findings to `exceptions` table ──────────────────────────────────
      // Delete old findings for this shipment first
      await supabase.from("exceptions").delete().eq("shipment_id", shipmentId);

      let validationRunId: string | null = null;

      // Create a validation_run record
      const { data: runRecord } = await supabase
        .from("validation_runs")
        .insert({
          shipment_id: shipmentId,
          workspace_id: workspaceId || null,
          triggered_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          overall_status: findings.some(f => f.severity === "critical") ? "hold"
                        : findings.some(f => f.severity === "high") ? "review"
                        : "clear",
          credits_charged: 1,
        })
        .select("id")
        .single();

      validationRunId = runRecord?.id || null;

      if (findings.length > 0) {
        const exceptionRows = findings.map(f => ({
          shipment_id: shipmentId,
          workspace_id: workspaceId || null,
          validation_run_id: validationRunId,
          severity: f.severity,
          category: "cross_reference",
          field_name: f.field_checked,
          source_document: f.document_a,
          target_document: f.document_b,
          found_value: f.finding,
          expected_value: f.recommendation,
          description: f.finding,
          estimated_financial_impact_usd: f.estimated_financial_impact_usd || 0,
          is_blocker: f.severity === "critical",
          resolved: false,
        }));

        await supabase.from("exceptions").insert(exceptionRows);
      }

      // Note: credit deduction is handled in the UI layer (ValidatePage → useCredits)
      // so that it only fires when the user actually views the report, not on analysis.

      // Compute readiness score
      const criticalCount = findings.filter(f => f.severity === "critical").length;
      const highCount = findings.filter(f => f.severity === "high").length;
      const mediumCount = findings.filter(f => f.severity === "medium").length;
      const lowCount = findings.filter(f => f.severity === "low").length;
      let readinessScore = 100;
      readinessScore -= criticalCount * 30;
      readinessScore -= highCount * 15;
      readinessScore -= mediumCount * 8;
      readinessScore -= lowCount * 3;
      readinessScore = Math.max(0, Math.min(100, readinessScore));

      const status: "clean" | "review" | "hold" =
        criticalCount > 0 ? "hold" :
        highCount > 0 ? "review" :
        mediumCount > 0 ? "review" : "clean";

      const dbStatus = status === "clean" ? "clear" : status;

      // Write readiness_score + overall_status back to validation_run
      if (validationRunId) {
        await supabase.from("validation_runs").update({
          readiness_score: readinessScore,
          overall_status: dbStatus,
        }).eq("id", validationRunId);
      }

      // Also update the shipment row so Dashboard shows live data immediately
      await supabase.from("shipments").update({
        readiness_score: readinessScore,
        status: dbStatus === "hold" ? "flagged" : dbStatus === "review" ? "in_transit" : "cleared",
      } as any).eq("shipment_id", shipmentId);

      const validationResult: ValidationResult = {
        findings,
        complianceWarnings,
        readinessScore,
        status,
        validationRunId,
        total_exposure_usd,
        total_exposure_summary,
        workspace_accuracy_pct,
      };

      setResult(validationResult);

      if (findings.length === 0) {
        toast.success("All documents verified — no issues found");
      } else {
        const criticals = findings.filter(f => f.severity === "critical").length;
        const highs = findings.filter(f => f.severity === "high").length;
        toast.warning(`Found ${criticals} critical, ${highs} high severity issues`);
      }

      return validationResult;

    } catch (err: any) {
      console.error("[useValidation] runCrossRef failed:", err);
      toast.error(`Validation failed: ${err.message}`);
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [shipmentId, workspaceId, shipmentMode, commodityType, countryOfOrigin, declaredValueUsd]);

  // ─── Full pipeline: extract all + crossref ──────────────────────────────────

  const runValidation = useCallback(async (
    documents: Array<{ docType: string; file: File }>
  ): Promise<ValidationResult | null> => {
    setIsRunning(true);
    setResult(null);
    extractedRef.current = {};

    try {
      // Extract all docs in parallel
      const results = await Promise.allSettled(
        documents.map(({ docType, file }) => extractDocument(docType, file))
      );

      const successCount = results.filter(r => r.status === "fulfilled" && r.value).length;

      if (successCount < 2) {
        toast.error("Need at least 2 documents extracted successfully to validate");
        return null;
      }

      // Cross-reference with actual extracted content
      return await runCrossRef();

    } finally {
      setIsRunning(false);
    }
  }, [extractDocument, runCrossRef]);

  // ─── Load existing results from DB ─────────────────────────────────────────

  const loadExisting = useCallback(async () => {
    if (!shipmentId) return;

    // Load extracted documents
    const { data: docs } = await supabase
      .from("documents")
      .select("document_type, extracted_data, extraction_status, file_name")
      .eq("shipment_id", shipmentId)
      .eq("extraction_status", "complete");

    if (docs?.length) {
      const newSlots: Record<string, DocumentSlot> = {};
      for (const doc of docs) {
        extractedRef.current[doc.document_type] = doc.extracted_data || {};
        newSlots[doc.document_type] = {
          docType: doc.document_type,
          file: doc.file_name ? new File([], doc.file_name) : null,
          status: "done",
          extractedData: doc.extracted_data || {},
          warnings: [], internalErrors: [], pgaFlags: [],
          error: null,
        };
      }
      setSlots(newSlots);
    }

    // Load latest exceptions
    const { data: exceptions } = await supabase
      .from("exceptions")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false });

    if (exceptions?.length) {
      const findings: ValidationFinding[] = exceptions.map((e: any) => ({
        severity: e.severity,
        document_a: e.source_document || "",
        document_b: "",
        field_checked: e.field_name || "",
        finding: e.description || e.found_value || "",
        recommendation: e.expected_value || "",
        estimated_financial_impact_usd: 0,
      }));

      const criticalCount = findings.filter(f => f.severity === "critical").length;
      const highCount = findings.filter(f => f.severity === "high").length;
      const mediumCount = findings.filter(f => f.severity === "medium").length;
      const lowCount = findings.filter(f => f.severity === "low").length;
      let readinessScore = 100 - criticalCount * 30 - highCount * 15 - mediumCount * 8 - lowCount * 3;
      readinessScore = Math.max(0, readinessScore);

      setResult({
        findings,
        complianceWarnings: [],
        readinessScore,
        status: criticalCount > 0 ? "hold" : (highCount > 0 || mediumCount > 0) ? "review" : "clean",
        validationRunId: null,
        total_exposure_usd: 0,
        total_exposure_summary: "",
        workspace_accuracy_pct: null,
      });
    }
  }, [shipmentId]);

  const docsExtracted = Object.values(slots).filter(s => s.status === "done").length;
  const docsProcessing = Object.values(slots).filter(s => s.status === "extracting" || s.status === "uploading").length;

  return {
    slots,
    result,
    isRunning,
    docsExtracted,
    docsProcessing,
    extractDocument,
    runCrossRef,
    runValidation,
    loadExisting,
  };
}
