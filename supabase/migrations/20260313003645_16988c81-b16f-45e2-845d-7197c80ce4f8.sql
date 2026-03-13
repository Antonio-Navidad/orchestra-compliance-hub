
-- =============================================
-- PHASE 2: Products & Classifications
-- =============================================

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  title text NOT NULL,
  description text,
  material_composition text,
  dimensions jsonb,
  weight_kg numeric,
  intended_use text,
  origin_country text,
  destination_country text,
  image_urls text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products viewable by workspace members"
  ON public.products FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = products.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Products insertable by authenticated"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Products updatable by creator or workspace admin"
  ON public.products FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = products.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin','manager')
    )
  );

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Product Classifications
CREATE TABLE public.product_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  shipment_id text,
  candidate_codes jsonb NOT NULL DEFAULT '[]',
  accepted_code text,
  override_reason text,
  overridden_by uuid,
  evidence jsonb DEFAULT '{}',
  restricted_flags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  confidence numeric,
  ai_model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Classifications viewable by authenticated"
  ON public.product_classifications FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Classifications insertable by authenticated"
  ON public.product_classifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Classifications updatable by authenticated"
  ON public.product_classifications FOR UPDATE TO authenticated
  USING (true);

-- =============================================
-- PHASE 3: Document Intelligence
-- =============================================

CREATE TABLE public.document_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  completeness_score numeric DEFAULT 0,
  filing_readiness_score numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  country_requirements jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Packets viewable by workspace members"
  ON public.document_packets FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = document_packets.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Packets insertable by authenticated"
  ON public.document_packets FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Packets updatable by authenticated"
  ON public.document_packets FOR UPDATE TO authenticated
  USING (true);

CREATE TRIGGER update_document_packets_updated_at
  BEFORE UPDATE ON public.document_packets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Document Extractions
CREATE TABLE public.document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.shipment_documents(id) ON DELETE CASCADE,
  packet_id uuid REFERENCES public.document_packets(id) ON DELETE SET NULL,
  extracted_fields jsonb NOT NULL DEFAULT '[]',
  raw_text text,
  parse_warnings text[] DEFAULT '{}',
  field_confidence jsonb DEFAULT '{}',
  extraction_model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Extractions viewable by authenticated"
  ON public.document_extractions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Extractions insertable by authenticated"
  ON public.document_extractions FOR INSERT TO authenticated
  WITH CHECK (true);

-- Document Issues
CREATE TABLE public.document_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id uuid REFERENCES public.document_packets(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  field_name text,
  description text NOT NULL,
  suggestion text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issues viewable by authenticated"
  ON public.document_issues FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Issues insertable by authenticated"
  ON public.document_issues FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Issues updatable by authenticated"
  ON public.document_issues FOR UPDATE TO authenticated
  USING (true);

-- =============================================
-- PHASE 4: Route Recommendations
-- =============================================

CREATE TABLE public.route_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text,
  workspace_id uuid REFERENCES public.workspaces(id),
  origin jsonb NOT NULL,
  destination jsonb NOT NULL,
  mode text NOT NULL,
  priority text NOT NULL DEFAULT 'balanced',
  constraints jsonb DEFAULT '{}',
  options jsonb NOT NULL DEFAULT '[]',
  selected_option_index integer,
  ai_model_version text,
  confidence numeric,
  freshness timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.route_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Routes viewable by workspace members"
  ON public.route_recommendations FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = route_recommendations.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Routes insertable by authenticated"
  ON public.route_recommendations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Routes updatable by authenticated"
  ON public.route_recommendations FOR UPDATE TO authenticated
  USING (true);

-- =============================================
-- PHASE 5: Compliance & Sanctions
-- =============================================

CREATE TABLE public.compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  check_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  severity text NOT NULL DEFAULT 'info',
  findings jsonb DEFAULT '[]',
  source_freshness timestamptz,
  checked_at timestamptz DEFAULT now(),
  resolved_by uuid,
  resolved_at timestamptz
);

ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Compliance viewable by workspace members"
  ON public.compliance_checks FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = compliance_checks.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Compliance insertable by authenticated"
  ON public.compliance_checks FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Compliance updatable by authenticated"
  ON public.compliance_checks FOR UPDATE TO authenticated
  USING (true);

CREATE TABLE public.sanctions_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text,
  workspace_id uuid REFERENCES public.workspaces(id),
  entity_name text NOT NULL,
  match_type text,
  match_confidence numeric,
  list_source text,
  list_freshness timestamptz,
  status text NOT NULL DEFAULT 'open',
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sanctions_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sanctions viewable by workspace members"
  ON public.sanctions_alerts FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = sanctions_alerts.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Sanctions insertable by authenticated"
  ON public.sanctions_alerts FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Sanctions updatable by authenticated"
  ON public.sanctions_alerts FOR UPDATE TO authenticated
  USING (true);

-- =============================================
-- PHASE 6: ETA Predictions
-- =============================================

CREATE TABLE public.eta_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  predicted_earliest timestamptz,
  predicted_latest timestamptz,
  confidence numeric,
  factors jsonb DEFAULT '[]',
  route_version_id uuid REFERENCES public.route_recommendations(id),
  prior_prediction_id uuid REFERENCES public.eta_predictions(id),
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eta_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ETA viewable by workspace members"
  ON public.eta_predictions FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = eta_predictions.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "ETA insertable by authenticated"
  ON public.eta_predictions FOR INSERT TO authenticated
  WITH CHECK (true);
