import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export interface LibraryDocument {
  id: string;
  user_id: string | null;
  workspace_id: string | null;
  shipment_id: string | null;
  lane_id: string | null;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  document_type: string | null;
  classification_confidence: number | null;
  origin_country: string | null;
  destination_country: string | null;
  transport_mode: string | null;
  tags: string[];
  extracted_fields: Record<string, any>;
  extraction_status: string;
  packet_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface LibraryFilters {
  search: string;
  documentType: string;
  shipmentId: string;
  dateFrom: string;
  dateTo: string;
}

export function useDocumentLibrary() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async (filters?: Partial<LibraryFilters>) => {
    setLoading(true);
    let query = supabase
      .from("document_library")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filters?.documentType) {
      query = query.eq("document_type", filters.documentType);
    }
    if (filters?.shipmentId) {
      query = query.eq("shipment_id", filters.shipmentId);
    }
    if (filters?.search) {
      query = query.ilike("file_name", `%${filters.search}%`);
    }
    if (filters?.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte("created_at", filters.dateTo);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to fetch documents:", error);
      toast.error("Failed to load document library");
    } else {
      setDocuments((data || []) as LibraryDocument[]);
    }
    setLoading(false);
  }, []);

  /** Update a single document in local state */
  const updateDocLocally = useCallback((id: string, updates: Partial<LibraryDocument>) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  /** Run extraction on a document via the edge function */
  const extractDocument = useCallback(async (doc: LibraryDocument) => {
    // Mark as processing locally + in DB
    updateDocLocally(doc.id, { extraction_status: "processing" });
    await supabase.from("document_library").update({ extraction_status: "processing" } as any).eq("id", doc.id);

    try {
      // Download file from storage
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("document-library")
        .download(doc.file_path);
      if (dlErr || !fileData) throw new Error("Failed to download file for extraction");

      const file = new File([fileData], doc.file_name, { type: doc.mime_type || "application/octet-stream" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", doc.document_type || "unknown");
      formData.append("shipmentContext", JSON.stringify({
        originCountry: doc.origin_country,
        destinationCountry: doc.destination_country,
        shipmentMode: doc.transport_mode,
      }));

      const { data: result, error: fnErr } = await supabase.functions.invoke("extract-document", {
        body: formData,
      });

      if (fnErr) throw fnErr;
      if (result?.error) throw new Error(result.error);

      // Build extracted_fields with confidence info
      const fields: Record<string, any> = {};
      for (const f of result.fields || []) {
        fields[f.fieldName] = {
          value: f.value,
          confidence: f.confidence,
          source: f.sourceDocumentType || null,
          page: f.sourceLocation || null,
        };
      }

      const updates: Record<string, any> = {
        extraction_status: "complete",
        extracted_fields: fields,
        document_type: result.detectedDocumentType !== "multi_document_packet"
          ? result.detectedDocumentType
          : doc.document_type,
        classification_confidence: result.detectedDocuments?.[0]?.confidence ?? null,
      };

      await supabase.from("document_library").update(updates as any).eq("id", doc.id);
      updateDocLocally(doc.id, updates as Partial<LibraryDocument>);
      toast.success(`Extraction complete: ${doc.file_name}`);
    } catch (err: any) {
      console.error("Extraction failed:", err);
      const updates = { extraction_status: "failed" };
      await supabase.from("document_library").update(updates as any).eq("id", doc.id);
      updateDocLocally(doc.id, updates);
      toast.error(`Extraction failed: ${err.message || "Unknown error"}`);
    }
  }, [updateDocLocally]);

  const uploadDocument = useCallback(async (
    file: File,
    meta: {
      shipmentId?: string;
      documentType?: string;
      originCountry?: string;
      destinationCountry?: string;
      transportMode?: string;
      tags?: string[];
    }
  ) => {
    if (!user) { toast.error("Not authenticated"); return null; }

    setUploading(true);
    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    const { error: storageErr } = await supabase.storage
      .from("document-library")
      .upload(filePath, file);

    if (storageErr) {
      toast.error("Failed to upload file");
      console.error(storageErr);
      setUploading(false);
      return null;
    }

    const { data, error: dbErr } = await supabase
      .from("document_library")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size_bytes: file.size,
        mime_type: file.type,
        document_type: meta.documentType || null,
        shipment_id: meta.shipmentId || null,
        origin_country: meta.originCountry || null,
        destination_country: meta.destinationCountry || null,
        transport_mode: meta.transportMode || null,
        tags: meta.tags || [],
        extraction_status: "pending",
      } as any)
      .select("*")
      .single();

    if (dbErr) {
      toast.error("Failed to save document metadata");
      console.error(dbErr);
      setUploading(false);
      return null;
    }

    toast.success(`${file.name} uploaded — starting extraction...`);
    setUploading(false);

    // Add to local state and auto-trigger extraction
    const newDoc = data as LibraryDocument;
    setDocuments(prev => [newDoc, ...prev]);

    // Fire extraction in background (don't await to unblock UI)
    extractDocument(newDoc);

    return newDoc.id;
  }, [user, extractDocument]);

  const deleteDocument = useCallback(async (doc: LibraryDocument) => {
    await supabase.storage.from("document-library").remove([doc.file_path]);
    const { error } = await supabase.from("document_library").delete().eq("id", doc.id);
    if (error) {
      toast.error("Failed to delete document");
    } else {
      toast.success("Document deleted");
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    }
  }, []);

  return { documents, loading, uploading, fetchDocuments, uploadDocument, deleteDocument, extractDocument, updateDocLocally };
}
