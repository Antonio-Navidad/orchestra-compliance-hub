
CREATE TABLE public.shipment_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shipment_id text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'normal',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, shipment_id)
);

ALTER TABLE public.shipment_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist"
  ON public.shipment_watchlist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own watchlist"
  ON public.shipment_watchlist FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own watchlist"
  ON public.shipment_watchlist FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own watchlist"
  ON public.shipment_watchlist FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
