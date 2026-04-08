
-- Add missing columns to shipments table that the frontend depends on.
-- These columns are referenced in ValidatePage inserts and Dashboard selects
-- but were never added via migration, causing all shipment saves to silently fail.

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS shipment_name TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS origin_location TEXT,
  ADD COLUMN IF NOT EXISTS dest_location TEXT,
  ADD COLUMN IF NOT EXISTS readiness_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_ship_date DATE,
  ADD COLUMN IF NOT EXISTS expected_arrival_date DATE;
