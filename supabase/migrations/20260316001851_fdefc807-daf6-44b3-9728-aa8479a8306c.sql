
-- Validation sessions table for storing validation history
CREATE TABLE public.validation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text,
  workspace_id uuid REFERENCES public.workspaces(id),
  user_id uuid,
  template_id text,
  shipment_mode text DEFAULT 'sea',
  origin_country text,
  destination_country text,
  hs_code text,
  declared_value text,
  status text NOT NULL DEFAULT 'draft',
  completeness_score numeric,
  consistency_score numeric,
  overall_readiness text,
  documents jsonb DEFAULT '[]'::jsonb,
  validation_result jsonb,
  cross_doc_mismatches jsonb DEFAULT '[]'::jsonb,
  disposition text DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.validation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Validation sessions viewable by authenticated"
  ON public.validation_sessions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Validation sessions insertable by authenticated"
  ON public.validation_sessions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Validation sessions updatable by authenticated"
  ON public.validation_sessions FOR UPDATE TO authenticated
  USING (true);

CREATE TRIGGER update_validation_sessions_updated_at
  BEFORE UPDATE ON public.validation_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
