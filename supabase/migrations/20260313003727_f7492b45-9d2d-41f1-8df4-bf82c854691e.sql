
-- =============================================
-- PHASE 7: Decision Twin
-- =============================================

CREATE TABLE public.decision_twins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  input_snapshot jsonb NOT NULL DEFAULT '{}',
  readiness_score numeric,
  readiness_state text DEFAULT 'not_run',
  clearance_probability numeric,
  delay_probability numeric,
  hold_probability numeric,
  landed_cost_range jsonb,
  eta_range jsonb,
  top_failure_point text,
  prescriptive_actions jsonb DEFAULT '[]',
  explanation text,
  confidence numeric,
  status text NOT NULL DEFAULT 'not_run',
  evaluated_at timestamptz,
  stale_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_twins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Twins viewable by workspace members"
  ON public.decision_twins FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = decision_twins.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Twins insertable by authenticated"
  ON public.decision_twins FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Twins updatable by authenticated"
  ON public.decision_twins FOR UPDATE TO authenticated
  USING (true);

-- Decision Scenarios
CREATE TABLE public.decision_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id uuid NOT NULL REFERENCES public.decision_twins(id) ON DELETE CASCADE,
  label text NOT NULL,
  route_summary text,
  projected_cost jsonb,
  projected_eta jsonb,
  hold_probability numeric,
  doc_risk_score numeric,
  compliance_risk_score numeric,
  complexity_score numeric,
  rank integer,
  rank_explanation text,
  is_selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scenarios viewable by authenticated"
  ON public.decision_scenarios FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Scenarios insertable by authenticated"
  ON public.decision_scenarios FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Scenarios updatable by authenticated"
  ON public.decision_scenarios FOR UPDATE TO authenticated
  USING (true);

-- Decision Approvals
CREATE TABLE public.decision_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id uuid NOT NULL REFERENCES public.decision_twins(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.decision_scenarios(id),
  action text NOT NULL,
  comment text,
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approvals viewable by authenticated"
  ON public.decision_approvals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Approvals insertable by authenticated"
  ON public.decision_approvals FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================
-- PHASE 8: Outcome Memory
-- =============================================

CREATE TABLE public.outcome_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  twin_id uuid REFERENCES public.decision_twins(id),
  actual_clearance_result text,
  actual_delivery_date timestamptz,
  actual_landed_cost numeric,
  actual_delays jsonb DEFAULT '[]',
  actual_issues jsonb DEFAULT '[]',
  actual_route_used text,
  prediction_accuracy jsonb DEFAULT '{}',
  validated boolean NOT NULL DEFAULT false,
  validated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outcome_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Outcomes viewable by workspace members"
  ON public.outcome_records FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = outcome_records.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Outcomes insertable by authenticated"
  ON public.outcome_records FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Outcomes updatable by authenticated"
  ON public.outcome_records FOR UPDATE TO authenticated
  USING (true);

-- =============================================
-- PHASE 9: Alert Rules, Notification Prefs, View Presets, Workspace Settings
-- =============================================

CREATE TABLE public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  user_id uuid,
  event_type text NOT NULL,
  channels text[] DEFAULT '{in_app}',
  severity_threshold text DEFAULT 'warning',
  quiet_hours jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alert rules viewable by owner or workspace admin"
  ON public.alert_rules FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = alert_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin')
    )
  );

CREATE POLICY "Alert rules insertable by authenticated"
  ON public.alert_rules FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Alert rules updatable by owner"
  ON public.alert_rules FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Alert rules deletable by owner"
  ON public.alert_rules FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  channel_preferences jsonb DEFAULT '{}',
  quiet_hours jsonb,
  critical_override boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prefs viewable by own user"
  ON public.notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Prefs insertable by own user"
  ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Prefs updatable by own user"
  ON public.notification_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.view_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  name text NOT NULL,
  preset_type text NOT NULL DEFAULT 'dashboard',
  config jsonb NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.view_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Presets viewable by own user"
  ON public.view_presets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Presets insertable by own user"
  ON public.view_presets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Presets updatable by own user"
  ON public.view_presets FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Presets deletable by own user"
  ON public.view_presets FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.workspace_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, setting_key)
);

ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings viewable by workspace members"
  ON public.workspace_settings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_settings.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Settings insertable by workspace admin"
  ON public.workspace_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_settings.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin')
    )
  );

CREATE POLICY "Settings updatable by workspace admin"
  ON public.workspace_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_settings.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin')
    )
  );

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_twins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.compliance_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eta_predictions;
