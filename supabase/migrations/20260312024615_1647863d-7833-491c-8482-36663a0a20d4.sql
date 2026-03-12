
-- Broker/forwarder master table
CREATE TABLE public.brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  broker_type text DEFAULT 'customs_broker',
  region text,
  office text,
  contact_name text,
  contact_email text,
  contact_phone text,
  internal_vendor_id text,
  watchlist_tag text DEFAULT 'none',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers viewable by authenticated" ON public.brokers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Brokers insertable by authenticated" ON public.brokers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Brokers updatable by authenticated" ON public.brokers FOR UPDATE TO authenticated USING (true);

-- Add broker_id foreign key to shipments
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS broker_id uuid REFERENCES public.brokers(id) ON DELETE SET NULL;

-- Enhance shipment_events with broker/evidence fields
ALTER TABLE public.shipment_events ADD COLUMN IF NOT EXISTS broker_id uuid REFERENCES public.brokers(id) ON DELETE SET NULL;
ALTER TABLE public.shipment_events ADD COLUMN IF NOT EXISTS evidence_quality text DEFAULT 'unverified';
ALTER TABLE public.shipment_events ADD COLUMN IF NOT EXISTS confidence_level integer DEFAULT 50;
ALTER TABLE public.shipment_events ADD COLUMN IF NOT EXISTS attribution text DEFAULT 'unknown';
ALTER TABLE public.shipment_events ADD COLUMN IF NOT EXISTS evidence_reference text;

-- Trigger for brokers updated_at
CREATE TRIGGER update_brokers_updated_at
  BEFORE UPDATE ON public.brokers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
