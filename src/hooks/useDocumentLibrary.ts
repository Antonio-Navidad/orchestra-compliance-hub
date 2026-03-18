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

    // Upload to storage
    const { error: storageErr } = await supabase.storage
      .from("document-library")
      .upload(filePath, file);

    if (storageErr) {
      toast.error("Failed to upload file");
      console.error(storageErr);
      setUploading(false);
      return null;
    }

    // Insert metadata
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
      .select("id")
      .single();

    if (dbErr) {
      toast.error("Failed to save document metadata");
      console.error(dbErr);
      setUploading(false);
      return null;
    }

    toast.success(`${file.name} uploaded to library`);
    setUploading(false);
    return data?.id;
  }, [user]);

  const deleteDocument = useCallback(async (doc: LibraryDocument) => {
    // Delete from storage
    await supabase.storage.from("document-library").remove([doc.file_path]);
    // Delete metadata
    const { error } = await supabase.from("document_library").delete().eq("id", doc.id);
    if (error) {
      toast.error("Failed to delete document");
    } else {
      toast.success("Document deleted");
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    }
  }, []);

  return { documents, loading, uploading, fetchDocuments, uploadDocument, deleteDocument };
}
