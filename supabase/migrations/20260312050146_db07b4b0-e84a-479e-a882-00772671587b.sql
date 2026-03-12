
CREATE TABLE public.logic_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  user_role text,
  action_type text NOT NULL,
  module text NOT NULL,
  rule_set text,
  jurisdiction text,
  broker_id uuid REFERENCES public.brokers(id),
  field_changed text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason text,
  status text NOT NULL DEFAULT 'active',
  requires_approval boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  approval_status text DEFAULT 'not_required',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.logic_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log viewable by authenticated"
  ON public.logic_audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Audit log insertable by authenticated"
  ON public.logic_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Audit log updatable by admins"
  ON public.logic_audit_log FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_audit_log_module ON public.logic_audit_log(module);
CREATE INDEX idx_audit_log_created ON public.logic_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON public.logic_audit_log(user_id);
CREATE INDEX idx_audit_log_status ON public.logic_audit_log(status);
