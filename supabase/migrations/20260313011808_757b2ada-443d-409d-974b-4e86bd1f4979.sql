
-- Trigger 1: Stale twin on classification change
CREATE OR REPLACE FUNCTION public.stale_twin_on_classification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.accepted_code IS DISTINCT FROM NEW.accepted_code THEN
    UPDATE public.decision_twins
    SET status = 'stale', stale_at = now()
    WHERE shipment_id = NEW.shipment_id
      AND status NOT IN ('stale', 'running', 'queued');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_stale_twin_on_classification
  AFTER UPDATE ON public.product_classifications
  FOR EACH ROW
  EXECUTE FUNCTION public.stale_twin_on_classification();

-- Trigger 2: Stale twin on route change
CREATE OR REPLACE FUNCTION public.stale_twin_on_route()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.decision_twins
  SET status = 'stale', stale_at = now()
  WHERE shipment_id = NEW.shipment_id
    AND status NOT IN ('stale', 'running', 'queued');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_stale_twin_on_route
  AFTER INSERT ON public.route_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.stale_twin_on_route();

-- Trigger 3: Notify on packet incomplete
CREATE OR REPLACE FUNCTION public.notify_on_packet_incomplete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('incomplete', 'inconsistent') AND (OLD.status IS NULL OR OLD.status NOT IN ('incomplete', 'inconsistent')) THEN
    PERFORM public.trigger_notify(
      _title := 'Document packet ' || NEW.status,
      _body := 'Shipment ' || NEW.shipment_id || ' has an ' || NEW.status || ' document packet.',
      _event_type := 'packet_incomplete',
      _severity := 'warning',
      _shipment_id := NEW.shipment_id,
      _workspace_id := NEW.workspace_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_on_packet_incomplete
  AFTER UPDATE ON public.document_packets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_packet_incomplete();

-- Trigger 4: Notify on approval request
CREATE OR REPLACE FUNCTION public.notify_on_approval_request()
RETURNS TRIGGER AS $$
DECLARE
  v_shipment_id TEXT;
  v_workspace_id UUID;
BEGIN
  IF NEW.action IN ('request_approval', 'approve', 'reject', 'revision_requested') THEN
    SELECT dt.shipment_id, s.workspace_id
    INTO v_shipment_id, v_workspace_id
    FROM public.decision_twins dt
    JOIN public.shipments s ON s.shipment_id = dt.shipment_id
    WHERE dt.id = NEW.twin_id;

    PERFORM public.trigger_notify(
      _title := 'Decision Twin: ' || NEW.action,
      _body := 'Approval action "' || NEW.action || '" on shipment ' || COALESCE(v_shipment_id, 'unknown'),
      _event_type := CASE
        WHEN NEW.action = 'request_approval' THEN 'approval_requested'
        WHEN NEW.action = 'approve' THEN 'approval_granted'
        WHEN NEW.action = 'reject' THEN 'approval_rejected'
        ELSE 'approval_requested'
      END,
      _severity := CASE WHEN NEW.action = 'reject' THEN 'warning' ELSE 'info' END,
      _shipment_id := v_shipment_id,
      _workspace_id := v_workspace_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_on_approval_request
  AFTER INSERT ON public.decision_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_approval_request();

-- Trigger 5: Compute accuracy on outcome insert
CREATE OR REPLACE FUNCTION public.compute_accuracy_on_outcome()
RETURNS TRIGGER AS $$
DECLARE
  v_twin RECORD;
  v_accuracy JSONB;
BEGIN
  IF NEW.twin_id IS NOT NULL AND NEW.prediction_accuracy IS NULL THEN
    SELECT * INTO v_twin FROM public.decision_twins WHERE id = NEW.twin_id;

    IF v_twin.id IS NOT NULL THEN
      v_accuracy := jsonb_build_object(
        'hold_prediction_correct',
          CASE
            WHEN v_twin.hold_probability IS NOT NULL AND NEW.actual_clearance_result IS NOT NULL
            THEN (v_twin.hold_probability > 0.5) = (NEW.actual_clearance_result = 'held')
            ELSE NULL
          END,
        'clearance_prediction_correct',
          CASE
            WHEN v_twin.clearance_probability IS NOT NULL AND NEW.actual_clearance_result IS NOT NULL
            THEN (v_twin.clearance_probability > 0.5) = (NEW.actual_clearance_result = 'cleared')
            ELSE NULL
          END,
        'delay_prediction_correct',
          CASE
            WHEN v_twin.delay_probability IS NOT NULL AND NEW.actual_delays IS NOT NULL
            THEN (v_twin.delay_probability > 0.5) = (jsonb_array_length(COALESCE(NEW.actual_delays, '[]'::jsonb)) > 0)
            ELSE NULL
          END,
        'readiness_state', v_twin.readiness_state,
        'evaluated_at', v_twin.evaluated_at
      );

      UPDATE public.outcome_records
      SET prediction_accuracy = v_accuracy
      WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_compute_accuracy_on_outcome
  AFTER INSERT ON public.outcome_records
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_accuracy_on_outcome();
