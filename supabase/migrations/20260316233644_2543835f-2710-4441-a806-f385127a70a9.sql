
CREATE TABLE public.lanes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  origin text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'sea',
  workflow_stage text DEFAULT 'pre_shipment',
  rules_version text DEFAULT NULL,
  source_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'template_only',
  usage_count integer NOT NULL DEFAULT 0,
  last_used timestamp with time zone DEFAULT NULL,
  notes text DEFAULT NULL,
  created_by uuid DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lanes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lanes viewable by authenticated" ON public.lanes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lanes insertable by authenticated" ON public.lanes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Lanes updatable by authenticated" ON public.lanes
  FOR UPDATE TO authenticated USING (true);
