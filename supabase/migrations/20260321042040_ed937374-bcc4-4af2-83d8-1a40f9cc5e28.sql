CREATE TABLE public.crossref_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text NOT NULL,
  document_a_type text NOT NULL,
  document_b_type text NOT NULL,
  field_checked text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  finding text NOT NULL,
  recommendation text,
  estimated_financial_impact_usd numeric DEFAULT 0,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid
);

ALTER TABLE public.crossref_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crossref results"
  ON public.crossref_results FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own crossref results"
  ON public.crossref_results FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own crossref results"
  ON public.crossref_results FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own crossref results"
  ON public.crossref_results FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_crossref_results_shipment ON public.crossref_results (shipment_id);