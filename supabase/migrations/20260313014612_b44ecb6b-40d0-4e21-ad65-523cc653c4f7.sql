
-- Outbound event queue: persists domain events before dispatch to Make.com
CREATE TABLE public.outbound_event_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  shipment_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(idempotency_key)
);

-- Inbound webhook log: records all incoming Make.com callbacks
CREATE TABLE public.inbound_webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  callback_type text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  shipment_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  signature_valid boolean DEFAULT false,
  processing_status text NOT NULL DEFAULT 'received',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sync jobs: tracks ongoing synchronization operations
CREATE TABLE public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  status text NOT NULL DEFAULT 'pending',
  total_events integer NOT NULL DEFAULT 0,
  processed_events integer NOT NULL DEFAULT 0,
  failed_events integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Delivery attempts: tracks each attempt to deliver an outbound event
CREATE TABLE public.delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.outbound_event_queue(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  http_status integer,
  response_body text,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- External object links: maps Lovable entities to Make.com/external IDs
CREATE TABLE public.external_object_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  internal_entity_type text NOT NULL,
  internal_entity_id text NOT NULL,
  external_system text NOT NULL DEFAULT 'make',
  external_entity_type text,
  external_entity_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, internal_entity_type, internal_entity_id, external_system)
);

-- Idempotency keys: prevents duplicate processing
CREATE TABLE public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  scope text NOT NULL DEFAULT 'global',
  result jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(key, scope)
);

-- Integration runs: tracks Make.com scenario execution runs
CREATE TABLE public.integration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scenario_name text NOT NULL,
  event_type text NOT NULL,
  run_id text,
  status text NOT NULL DEFAULT 'running',
  input_event_id uuid REFERENCES public.outbound_event_queue(id),
  output_summary jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Integration error log: dead-letter queue for failed integrations
CREATE TABLE public.integration_error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source text NOT NULL,
  event_type text,
  event_id uuid,
  error_code text,
  error_message text NOT NULL,
  payload jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Workspace integration settings
CREATE TABLE public.workspace_integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'make',
  enabled boolean NOT NULL DEFAULT false,
  webhook_url text,
  shared_secret text,
  scenario_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_filters text[] NOT NULL DEFAULT '{}'::text[],
  retry_policy jsonb NOT NULL DEFAULT '{"max_retries": 5, "backoff_multiplier": 2, "initial_delay_seconds": 30}'::jsonb,
  last_successful_sync timestamptz,
  last_failed_sync timestamptz,
  health_status text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider)
);

-- Enable RLS on all tables
ALTER TABLE public.outbound_event_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_object_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_integration_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies: workspace-scoped tables viewable by workspace members
CREATE POLICY "Outbound events viewable by workspace members" ON public.outbound_event_queue FOR SELECT TO authenticated USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = outbound_event_queue.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "Outbound events insertable by authenticated" ON public.outbound_event_queue FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Outbound events updatable by authenticated" ON public.outbound_event_queue FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Webhook logs viewable by workspace members" ON public.inbound_webhook_log FOR SELECT TO authenticated USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = inbound_webhook_log.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "Webhook logs insertable by authenticated" ON public.inbound_webhook_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Webhook logs updatable by authenticated" ON public.inbound_webhook_log FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Sync jobs viewable by workspace members" ON public.sync_jobs FOR SELECT TO authenticated USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = sync_jobs.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "Sync jobs insertable by authenticated" ON public.sync_jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Sync jobs updatable by authenticated" ON public.sync_jobs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Delivery attempts viewable by authenticated" ON public.delivery_attempts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Delivery attempts insertable by authenticated" ON public.delivery_attempts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "External links viewable by workspace members" ON public.external_object_links FOR SELECT TO authenticated USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = external_object_links.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "External links insertable by authenticated" ON public.external_object_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "External links updatable by authenticated" ON public.external_object_links FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Idempotency keys viewable by authenticated" ON public.idempotency_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Idempotency keys insertable by authenticated" ON public.idempotency_keys FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Integration runs viewable by workspace members" ON public.integration_runs FOR SELECT TO authenticated USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = integration_runs.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "Integration runs insertable by authenticated" ON public.integration_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Integration runs updatable by authenticated" ON public.integration_runs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Error log viewable by workspace members" ON public.integration_error_log FOR SELECT TO authenticated USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = integration_error_log.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "Error log insertable by authenticated" ON public.integration_error_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Error log updatable by admins" ON public.integration_error_log FOR UPDATE TO authenticated USING (is_admin(auth.uid()) OR has_workspace_permission(auth.uid(), workspace_id, 'manage_workspace'));

CREATE POLICY "Integration settings viewable by workspace members" ON public.workspace_integration_settings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_integration_settings.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "Integration settings manageable by admins" ON public.workspace_integration_settings FOR ALL TO authenticated USING (is_admin(auth.uid()) OR has_workspace_permission(auth.uid(), workspace_id, 'manage_workspace'));

-- Enable realtime for outbound queue and error log
ALTER PUBLICATION supabase_realtime ADD TABLE public.outbound_event_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_error_log;
