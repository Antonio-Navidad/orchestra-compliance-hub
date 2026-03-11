
-- Create transport mode enum
CREATE TYPE public.transport_mode AS ENUM ('air', 'sea', 'land');

-- Create shipment status enum
CREATE TYPE public.shipment_status AS ENUM ('in_transit', 'customs_hold', 'cleared', 'flagged');

-- Shipments table
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id TEXT NOT NULL UNIQUE,
  mode transport_mode NOT NULL,
  description TEXT NOT NULL,
  consignee TEXT NOT NULL,
  hs_code TEXT NOT NULL,
  declared_value NUMERIC NOT NULL DEFAULT 0,
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_notes TEXT,
  status shipment_status NOT NULL DEFAULT 'in_transit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shipments are viewable by everyone" ON public.shipments FOR SELECT USING (true);
CREATE POLICY "Shipments can be inserted by everyone" ON public.shipments FOR INSERT WITH CHECK (true);
CREATE POLICY "Shipments can be updated by everyone" ON public.shipments FOR UPDATE USING (true);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES public.shipments(shipment_id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_value NUMERIC NOT NULL,
  hs_code TEXT NOT NULL,
  net_weight_kg NUMERIC NOT NULL,
  gross_weight_kg NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  exporter_name TEXT,
  exporter_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoices are viewable by everyone" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Invoices can be inserted by everyone" ON public.invoices FOR INSERT WITH CHECK (true);

-- Manifests table
CREATE TABLE public.manifests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES public.shipments(shipment_id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  total_value NUMERIC NOT NULL,
  hs_code TEXT NOT NULL,
  net_weight_kg NUMERIC NOT NULL,
  gross_weight_kg NUMERIC NOT NULL,
  packages INTEGER NOT NULL DEFAULT 1,
  bill_of_lading TEXT,
  vessel_voyage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.manifests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manifests are viewable by everyone" ON public.manifests FOR SELECT USING (true);
CREATE POLICY "Manifests can be inserted by everyone" ON public.manifests FOR INSERT WITH CHECK (true);

-- Legal Knowledge table
CREATE TABLE public.legal_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  regulation_body TEXT NOT NULL,
  hs_codes_affected TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL,
  full_text TEXT,
  effective_date DATE NOT NULL,
  source_url TEXT,
  transport_modes transport_mode[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Legal knowledge is viewable by everyone" ON public.legal_knowledge FOR SELECT USING (true);
CREATE POLICY "Legal knowledge can be inserted by everyone" ON public.legal_knowledge FOR INSERT WITH CHECK (true);
CREATE POLICY "Legal knowledge can be updated by everyone" ON public.legal_knowledge FOR UPDATE USING (true);

-- Admin settings table
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_prompt TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin settings are viewable by everyone" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "Admin settings can be updated by everyone" ON public.admin_settings FOR UPDATE USING (true);
CREATE POLICY "Admin settings can be inserted by everyone" ON public.admin_settings FOR INSERT WITH CHECK (true);

-- Insert default admin settings
INSERT INTO public.admin_settings (system_prompt) VALUES (
  'You are Orchestra''s Compliance AI. Analyze shipments against current customs regulations stored in the Legal Knowledge database. Flag mismatches between HS codes and product descriptions. Check for required export licenses, emissions certificates, and weight discrepancies. Prioritize safety checks based on transport mode: IATA for Air, D&D/Maritime for Sea, USMCA/Border for Land.'
);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_legal_knowledge_updated_at BEFORE UPDATE ON public.legal_knowledge FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
