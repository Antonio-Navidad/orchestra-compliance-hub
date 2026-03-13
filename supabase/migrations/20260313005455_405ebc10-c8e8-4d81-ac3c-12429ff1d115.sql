
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to call notify edge function via pg_net
CREATE OR REPLACE FUNCTION public.trigger_notify(
  _event_type text,
  _severity text,
  _title text,
  _body text DEFAULT NULL,
  _shipment_id text DEFAULT NULL,
  _workspace_id uuid DEFAULT NULL,
  _link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  _supabase_url text;
  _anon_key text;
BEGIN
  -- Use vault or hardcoded project URL
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- Fallback: use the edge function URL directly via pg_net
  PERFORM net.http_post(
    url := concat('https://xdygwvkapjrrolxhdaie.supabase.co/functions/v1/notify'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', concat('Bearer ', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkeWd3dmthcGpycm9seGhkYWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQzMDUsImV4cCI6MjA4ODgzMDMwNX0.Hn7mHy8duq-5D80D94RjqnWFdzXX6_ORqBEnJCRxhxk')
    ),
    body := jsonb_build_object(
      'event_type', _event_type,
      'severity', _severity,
      'title', _title,
      'body', _body,
      'shipment_id', _shipment_id,
      'workspace_id', _workspace_id,
      'link', _link
    )
  );
END;
$$;

-- Trigger: notify on compliance block
CREATE OR REPLACE FUNCTION public.notify_on_compliance_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status IN ('blocked', 'escalated') AND (OLD IS NULL OR OLD.status NOT IN ('blocked', 'escalated')) THEN
    PERFORM trigger_notify(
      'compliance_block',
      CASE WHEN NEW.status = 'blocked' THEN 'critical' ELSE 'warning' END,
      concat('Compliance ', NEW.status, ': ', NEW.check_type),
      concat('Shipment ', NEW.shipment_id, ' has a compliance ', NEW.status, ' (', NEW.severity, ')'),
      NEW.shipment_id,
      NEW.workspace_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER compliance_block_notify
  AFTER INSERT OR UPDATE ON public.compliance_checks
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_compliance_block();

-- Trigger: notify when Decision Twin readiness drops
CREATE OR REPLACE FUNCTION public.notify_on_twin_evaluated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'evaluated' AND NEW.readiness_state IN ('revise_before_dispatch', 'escalate_for_review', 'high_risk_do_not_proceed') THEN
    PERFORM trigger_notify(
      'readiness_dropped',
      CASE 
        WHEN NEW.readiness_state = 'high_risk_do_not_proceed' THEN 'critical'
        WHEN NEW.readiness_state = 'escalate_for_review' THEN 'warning'
        ELSE 'warning'
      END,
      concat('Decision Twin: ', replace(NEW.readiness_state, '_', ' ')),
      concat('Shipment ', NEW.shipment_id, ' readiness score: ', round(COALESCE(NEW.readiness_score, 0) * 100), '%'),
      NEW.shipment_id,
      NEW.workspace_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER twin_evaluated_notify
  AFTER INSERT OR UPDATE ON public.decision_twins
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_twin_evaluated();

-- Trigger: notify on new sanctions alert
CREATE OR REPLACE FUNCTION public.notify_on_sanctions_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM trigger_notify(
    'sanctions_alert',
    'critical',
    concat('Sanctions match: ', NEW.entity_name),
    concat('Potential sanctions match on shipment ', COALESCE(NEW.shipment_id, 'N/A'), ' (confidence: ', round(COALESCE(NEW.match_confidence, 0) * 100), '%)'),
    NEW.shipment_id,
    NEW.workspace_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER sanctions_alert_notify
  AFTER INSERT ON public.sanctions_alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_sanctions_alert();
