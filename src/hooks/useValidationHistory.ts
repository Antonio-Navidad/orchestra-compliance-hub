import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UploadedDocument } from "@/lib/validationExport";
import type { CrossDocMismatch } from "@/lib/crossDocMatching";

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

  const saveSession = useCallback(async (params: {
    shipmentId: string;
    templateId?: string;
    shipmentMode: string;
    originCountry: string;
    destinationCountry: string;
    hsCode: string;
    declaredValue: string;
    documents: UploadedDocument[];
    validationResult: any;
    crossDocMismatches: CrossDocMismatch[];
    disposition: string;
  }) => {
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
        completeness_score: params.validationResult?.completenessScore || null,
        consistency_score: params.validationResult?.consistencyScore || null,
        overall_readiness: params.validationResult?.overallReadiness || null,
        documents: docsSerialized,
        validation_result: params.validationResult,
        cross_doc_mismatches: params.crossDocMismatches,
        disposition: params.disposition,
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
