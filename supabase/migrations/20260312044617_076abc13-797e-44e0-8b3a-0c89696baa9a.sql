
-- Document type enum
CREATE TYPE public.document_type AS ENUM (
  'commercial_invoice',
  'packing_list',
  'bill_of_lading',
  'air_waybill',
  'certificate_of_origin',
  'dangerous_goods_declaration',
  'export_license',
  'import_permit',
  'phytosanitary_certificate',
  'fumigation_certificate',
  'insurance_certificate',
  'customs_declaration',
  'inspection_certificate',
  'multimodal_transport_doc',
  'other'
);

-- Shipment documents table
CREATE TABLE public.shipment_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  document_type public.document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  replaced_by UUID REFERENCES public.shipment_documents(id),
  is_current BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents viewable by authenticated"
  ON public.shipment_documents FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Documents insertable by authenticated"
  ON public.shipment_documents FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Documents updatable by authenticated"
  ON public.shipment_documents FOR UPDATE
  TO authenticated USING (true);

-- Storage bucket for shipment documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('shipment-documents', 'shipment-documents', false, 20971520);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload shipment docs"
  ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'shipment-documents');

CREATE POLICY "Authenticated users can view shipment docs"
  ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'shipment-documents');

CREATE POLICY "Authenticated users can update shipment docs"
  ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'shipment-documents');

-- Add new shipment fields for intake
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS import_country TEXT,
  ADD COLUMN IF NOT EXISTS export_country TEXT,
  ADD COLUMN IF NOT EXISTS port_of_entry TEXT,
  ADD COLUMN IF NOT EXISTS incoterm TEXT,
  ADD COLUMN IF NOT EXISTS shipper TEXT,
  ADD COLUMN IF NOT EXISTS forwarder TEXT,
  ADD COLUMN IF NOT EXISTS coo_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS filing_status TEXT DEFAULT 'not_filed',
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS planned_departure DATE,
  ADD COLUMN IF NOT EXISTS estimated_arrival DATE,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS quantity INTEGER,
  ADD COLUMN IF NOT EXISTS packet_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS filing_readiness TEXT DEFAULT 'not_ready';
