
-- Document Library: stores metadata for every uploaded document
CREATE TABLE public.document_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  shipment_id TEXT,
  lane_id UUID REFERENCES public.lanes(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  document_type TEXT,
  classification_confidence NUMERIC,
  origin_country TEXT,
  destination_country TEXT,
  transport_mode TEXT,
  tags TEXT[] DEFAULT '{}',
  extracted_fields JSONB DEFAULT '{}',
  extraction_status TEXT DEFAULT 'pending',
  packet_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.document_library
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own documents" ON public.document_library
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own documents" ON public.document_library
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own documents" ON public.document_library
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for common queries
CREATE INDEX idx_document_library_user ON public.document_library(user_id);
CREATE INDEX idx_document_library_shipment ON public.document_library(shipment_id);
CREATE INDEX idx_document_library_type ON public.document_library(document_type);
CREATE INDEX idx_document_library_created ON public.document_library(created_at DESC);

-- Storage bucket for document originals
INSERT INTO storage.buckets (id, name, public) VALUES ('document-library', 'document-library', false);

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users upload own docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'document-library' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users view own docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'document-library' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'document-library' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Trigger to update updated_at
CREATE TRIGGER update_document_library_updated_at
  BEFORE UPDATE ON public.document_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for document_library
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_library;
