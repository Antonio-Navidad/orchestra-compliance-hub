
-- Expand shipment_status enum with new workflow states
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'in_review';
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'waiting_docs';
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'sent_to_broker';
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'escalated';
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'corrected';
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'filed';
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'closed_avoided';
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'closed_incident';

-- Shipment events / audit trail table
CREATE TABLE public.shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shipment events viewable by authenticated" ON public.shipment_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Shipment events insertable by authenticated" ON public.shipment_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- Shipment comments table
CREATE TABLE public.shipment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated" ON public.shipment_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Comments insertable by authenticated" ON public.shipment_comments
  FOR INSERT TO authenticated WITH CHECK (true);

-- Add Panama jurisdiction support: no schema change needed, it's in the adapter code

-- Add origin/destination fields to shipments for lane intelligence
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS origin_country TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS destination_country TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS assigned_broker TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS jurisdiction_code TEXT DEFAULT 'US';
