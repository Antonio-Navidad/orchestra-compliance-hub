
-- Add direction enum and column to shipments
CREATE TYPE public.shipment_direction AS ENUM ('inbound', 'outbound');

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS direction public.shipment_direction DEFAULT 'inbound';
