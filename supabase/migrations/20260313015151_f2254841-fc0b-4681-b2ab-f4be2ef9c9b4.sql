
-- =============================================
-- 1. Extend outbound_event_queue with missing columns
-- =============================================
ALTER TABLE public.outbound_event_queue
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS related_object_type text,
  ADD COLUMN IF NOT EXISTS related_object_id text,
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS queued_at timestamptz DEFAULT now();

-- =============================================
-- 2. Extend inbound_webhook_log with missing columns
-- =============================================
ALTER TABLE public.inbound_webhook_log
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'make',
  ADD COLUMN IF NOT EXISTS payload_hash text,
  ADD COLUMN IF NOT EXISTS related_object_type text,
  ADD COLUMN IF NOT EXISTS related_object_id text,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS received_at timestamptz DEFAULT now();

-- =============================================
-- 3. Extend sync_jobs with missing columns
-- =============================================
ALTER TABLE public.sync_jobs
  ADD COLUMN IF NOT EXISTS source_system text DEFAULT 'lovable',
  ADD COLUMN IF NOT EXISTS target_system text DEFAULT 'make',
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;

-- =============================================
-- 4. Extend external_object_links with missing columns
-- =============================================
ALTER TABLE public.external_object_links
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz DEFAULT now();

-- =============================================
-- 5. Create automation_endpoints table
-- =============================================
CREATE TABLE public.automation_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  integration_type text NOT NULL DEFAULT 'make',
  event_type text NOT NULL,
  make_webhook_url_ref text,
  is_enabled boolean NOT NULL DEFAULT true,
  scenario_name text,
  scenario_group text,
  description text,
  retry_policy jsonb DEFAULT '{"max_retries":5,"backoff_multiplier":2,"initial_delay_seconds":30}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, integration_type, event_type)
);

ALTER TABLE public.automation_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Automation endpoints viewable by workspace members" ON public.automation_endpoints
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = automation_endpoints.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Automation endpoints manageable by admins" ON public.automation_endpoints
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_workspace_permission(auth.uid(), workspace_id, 'manage_workspace'));

-- =============================================
-- 6. Create connector_health_status table
-- =============================================
CREATE TABLE public.connector_health_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connector_name text NOT NULL,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  freshness_status text NOT NULL DEFAULT 'unknown',
  status text NOT NULL DEFAULT 'unknown',
  last_error text,
  consecutive_failures integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, connector_name)
);

ALTER TABLE public.connector_health_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connector health viewable by workspace members" ON public.connector_health_status
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = connector_health_status.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Connector health manageable by system" ON public.connector_health_status
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_workspace_permission(auth.uid(), workspace_id, 'manage_workspace'));

-- =============================================
-- 7. Create replay_queue table
-- =============================================
CREATE TABLE public.replay_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  failed_event_id uuid REFERENCES public.outbound_event_queue(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  replay_status text NOT NULL DEFAULT 'requested',
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  replayed_at timestamptz,
  result jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.replay_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Replay queue viewable by workspace members" ON public.replay_queue
  FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = replay_queue.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Replay queue insertable by admins" ON public.replay_queue
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_workspace_permission(auth.uid(), workspace_id, 'manage_workspace'));

CREATE POLICY "Replay queue updatable by system" ON public.replay_queue
  FOR UPDATE TO authenticated
  USING (true);

-- =============================================
-- 8. Create webhook_subscriptions table
-- =============================================
CREATE TABLE public.webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  target_url text NOT NULL,
  secret_ref text,
  is_active boolean NOT NULL DEFAULT true,
  failure_count integer NOT NULL DEFAULT 0,
  last_triggered_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhook subs viewable by workspace members" ON public.webhook_subscriptions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = webhook_subscriptions.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Webhook subs manageable by admins" ON public.webhook_subscriptions
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_workspace_permission(auth.uid(), workspace_id, 'manage_workspace'));

-- =============================================
-- 9. Create reconciliation_jobs table
-- =============================================
CREATE TABLE public.reconciliation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  scope text DEFAULT 'full',
  status text NOT NULL DEFAULT 'pending',
  total_checked integer DEFAULT 0,
  mismatches_found integer DEFAULT 0,
  auto_fixed integer DEFAULT 0,
  manual_review_needed integer DEFAULT 0,
  summary jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  triggered_by uuid,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reconciliation jobs viewable by workspace members" ON public.reconciliation_jobs
  FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = reconciliation_jobs.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Reconciliation jobs insertable by admins" ON public.reconciliation_jobs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_workspace_permission(auth.uid(), workspace_id, 'manage_workspace'));

CREATE POLICY "Reconciliation jobs updatable by system" ON public.reconciliation_jobs
  FOR UPDATE TO authenticated
  USING (true);

-- =============================================
-- 10. Enable realtime for key new tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.connector_health_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.replay_queue;

-- =============================================
-- 11. Create indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_outbound_event_queue_status ON public.outbound_event_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_outbound_event_queue_workspace ON public.outbound_event_queue(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbound_event_queue_correlation ON public.outbound_event_queue(correlation_id);
CREATE INDEX IF NOT EXISTS idx_inbound_webhook_log_workspace ON public.inbound_webhook_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_webhook_log_idempotency ON public.inbound_webhook_log(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_integration_error_log_unresolved ON public.integration_error_log(workspace_id, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_event ON public.delivery_attempts(event_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_external_object_links_lookup ON public.external_object_links(workspace_id, internal_entity_type, internal_entity_id);
CREATE INDEX IF NOT EXISTS idx_replay_queue_status ON public.replay_queue(workspace_id, replay_status);
CREATE INDEX IF NOT EXISTS idx_connector_health_workspace ON public.connector_health_status(workspace_id, connector_name);
CREATE INDEX IF NOT EXISTS idx_automation_endpoints_workspace ON public.automation_endpoints(workspace_id, event_type);
