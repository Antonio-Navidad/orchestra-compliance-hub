
-- Shipment holds tracking
CREATE TABLE public.shipment_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id TEXT NOT NULL,
  hold_type TEXT NOT NULL,
  hold_received_date TIMESTAMPTZ,
  port_ces_location TEXT,
  free_time_expires TIMESTAMPTZ,
  demurrage_total NUMERIC DEFAULT 0,
  documents_submitted JSONB DEFAULT '[]'::jsonb,
  hold_status TEXT NOT NULL DEFAULT 'active',
  resolution_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  workspace_id UUID REFERENCES public.workspaces(id)
);

ALTER TABLE public.shipment_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view holds" ON public.shipment_holds
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert holds" ON public.shipment_holds
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update holds" ON public.shipment_holds
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Importer profiles for repeat client memory
CREATE TABLE public.importer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importer_name TEXT NOT NULL,
  ein_cbp_number TEXT,
  poa_status TEXT DEFAULT 'unknown',
  poa_expiry TIMESTAMPTZ,
  bond_status TEXT DEFAULT 'unknown',
  bond_number TEXT,
  surety_company TEXT,
  ach_status BOOLEAN DEFAULT false,
  commodity_types TEXT[] DEFAULT '{}',
  hts_codes_used TEXT[] DEFAULT '{}',
  fta_programs TEXT[] DEFAULT '{}',
  hold_count INTEGER DEFAULT 0,
  risk_flags TEXT[] DEFAULT '{}',
  last_shipment_id TEXT,
  last_shipment_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  workspace_id UUID REFERENCES public.workspaces(id),
  user_id UUID REFERENCES auth.users(id),
  UNIQUE(importer_name, workspace_id)
);

ALTER TABLE public.importer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view importer profiles" ON public.importer_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert importer profiles" ON public.importer_profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update importer profiles" ON public.importer_profiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Supplier directory from extracted documents
CREATE TABLE public.supplier_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  supplier_address TEXT,
  supplier_country TEXT,
  associated_importer TEXT,
  associated_hold BOOLEAN DEFAULT false,
  hold_details TEXT,
  source_documents TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  workspace_id UUID REFERENCES public.workspaces(id),
  UNIQUE(supplier_name, workspace_id)
);

ALTER TABLE public.supplier_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers" ON public.supplier_directory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert suppliers" ON public.supplier_directory
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update suppliers" ON public.supplier_directory
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
