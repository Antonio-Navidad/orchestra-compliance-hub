
-- Phase 3 Table 1: override_events
CREATE TABLE public.override_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_overridden TEXT NOT NULL,
  original_value JSONB,
  override_value JSONB,
  reason TEXT,
  workspace_id UUID REFERENCES public.workspaces(id),
  validated BOOLEAN DEFAULT false,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  outcome_success BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.override_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace override events"
  ON public.override_events FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL AND user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert override events"
  ON public.override_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and managers can validate overrides"
  ON public.override_events FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_workspace_permission(auth.uid(), workspace_id, 'validate_documents')
  );

CREATE INDEX idx_override_events_entity ON public.override_events(entity_type, entity_id);
CREATE INDEX idx_override_events_workspace ON public.override_events(workspace_id);

-- Phase 3 Table 2: escalation_rules
CREATE TABLE public.escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  event_type TEXT NOT NULL,
  unread_threshold_minutes INTEGER NOT NULL DEFAULT 30,
  escalate_to_role TEXT NOT NULL DEFAULT 'admin',
  escalate_channel TEXT NOT NULL DEFAULT 'in_app',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view escalation rules"
  ON public.escalation_rules FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage escalation rules"
  ON public.escalation_rules FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_workspace_permission(auth.uid(), workspace_id, 'manage_workspace')
  );

CREATE INDEX idx_escalation_rules_workspace ON public.escalation_rules(workspace_id);

-- Phase 3 Table 3: notification_delivery_log
CREATE TABLE public.notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_number INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification delivery logs"
  ON public.notification_delivery_log FOR SELECT TO authenticated
  USING (
    notification_id IN (
      SELECT id FROM public.notifications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert delivery logs"
  ON public.notification_delivery_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_delivery_log_notification ON public.notification_delivery_log(notification_id);
CREATE INDEX idx_delivery_log_status ON public.notification_delivery_log(status);
