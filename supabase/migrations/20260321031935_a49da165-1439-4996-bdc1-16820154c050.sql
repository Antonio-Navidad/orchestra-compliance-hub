ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'paused';