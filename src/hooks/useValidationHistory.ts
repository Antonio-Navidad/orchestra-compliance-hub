import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UploadedDocument } from "@/lib/validationExport";
import type { CrossDocMismatch } from "@/lib/crossDocMatching";
import type { RuleEngineResult } from "@/lib/validationRules";

export interface ValidationSession {
  id: string;
  shipment_id: string | null;
  template_id: string | null;
  shipment_mode: string | null;
  origin_country: string | null;
  destination_country: string | null;
  hs_code: string | null;
  declared_value: string | null;
  status: string;
  completeness_score: number | null;
  consistency_score: number | null;
  overall_readiness: string | null;
  disposition: string | null;
  documents: any;
  validation_result: any;
  cross_doc_mismatches: any;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // New: full deterministic result preserved
  rule_engine_result?: RuleEngineResult | null;
  audit_meta?: {
    packetHash: string;
    rulesVersion: string;
    engineId: string;
    modelVersion: string;
    workflowStage: string;
    validationTimestamp: string;
    fieldCount: number;
    docCount: number;
  } | null;
}

export interface SaveSessionParams {
  shipmentId: string;
  templateId?: string;
  shipmentMode: string;
  originCountry: string;
  destinationCountry: string;
  hsCode: string;
  declaredValue: string;
  documents: UploadedDocument[];
  ruleEngineResult: RuleEngineResult;
  crossDocMismatches: CrossDocMismatch[];
  disposition: string;
  auditMeta: {
    packetHash: string;
    rulesVersion: string;
    engineId: string;
    modelVersion: string;
    workflowStage: string;
    validationTimestamp: string;
    fieldCount: number;
    docCount: number;
  };
}

export function useValidationHistory() {
  const [sessions, setSessions] = useState<ValidationSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("validation_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to fetch validation sessions:", error);
    } else {
      setSessions((data || []) as ValidationSession[]);
    }
    setLoading(false);
  }, []);

  const saveSession = useCallback(async (params: SaveSessionParams) => {
    const docsSerialized = params.documents.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      detectedType: d.detectedType,
      overallQuality: d.overallQuality,
      extractedFields: d.extractedFields,
      extractionId: d.extractionId,
      parseWarnings: d.parseWarnings,
      rawTextSummary: d.rawTextSummary,
      isMultiDocument: d.isMultiDocument,
      parentUploadId: d.parentUploadId,
    }));

    const { data, error } = await supabase
      .from("validation_sessions")
      .insert({
        shipment_id: params.shipmentId || null,
        template_id: params.templateId || null,
        shipment_mode: params.shipmentMode,
        origin_country: params.originCountry,
        destination_country: params.destinationCountry,
        hs_code: params.hsCode || null,
        declared_value: params.declaredValue || null,
        status: "validated",
        completeness_score: params.ruleEngineResult.completenessScore,
        consistency_score: params.ruleEngineResult.consistencyScore,
        overall_readiness: params.ruleEngineResult.packetIntegrity,
        documents: docsSerialized,
        validation_result: params.ruleEngineResult as any,
        cross_doc_mismatches: params.crossDocMismatches,
        disposition: params.disposition,
        notes: JSON.stringify(params.auditMeta),
      } as any)
      .select("id")
      .single();

    if (error) {
      toast.error("Failed to save validation session");
      console.error(error);
      return null;
    }

    toast.success("Validation session saved");
    return data?.id;
  }, []);

  return { sessions, loading, fetchSessions, saveSession };
}
