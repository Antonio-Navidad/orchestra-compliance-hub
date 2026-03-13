
-- 1. Create delay_signals table
CREATE TABLE public.delay_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT NOT NULL,  -- weather, congestion, carrier_delay, strike, holiday, geopolitical
  source TEXT,                -- provider/connector name
  location TEXT,              -- port, airport, or region name
  location_code TEXT,         -- UNLOCODE or airport code
  severity TEXT NOT NULL DEFAULT 'info',  -- info, warning, critical
  confidence NUMERIC,        -- 0.0 to 1.0
  metadata JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  affects_modes TEXT[] DEFAULT '{}'::TEXT[],  -- air, sea, land
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delay_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delay signals viewable by authenticated"
  ON public.delay_signals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Delay signals insertable by authenticated"
  ON public.delay_signals FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_delay_signals_location ON public.delay_signals(location_code);
CREATE INDEX idx_delay_signals_type ON public.delay_signals(signal_type);
CREATE INDEX idx_delay_signals_expires ON public.delay_signals(expires_at);

-- 2. Create notify_on_eta_drift trigger function
CREATE OR REPLACE FUNCTION public.notify_on_eta_drift()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $func$
DECLARE
  v_prior RECORD;
  v_drift_hours NUMERIC;
  v_workspace_id UUID;
BEGIN
  -- Only fire if there's a prior prediction to compare against
  IF NEW.prior_prediction_id IS NOT NULL THEN
    SELECT predicted_earliest, predicted_latest INTO v_prior
    FROM public.eta_predictions WHERE id = NEW.prior_prediction_id;

    IF v_prior.predicted_latest IS NOT NULL AND NEW.predicted_latest IS NOT NULL THEN
      v_drift_hours := EXTRACT(EPOCH FROM (NEW.predicted_latest - v_prior.predicted_latest)) / 3600;

      -- Notify if ETA drifted by more than 48 hours
      IF ABS(v_drift_hours) > 48 THEN
        -- Get workspace_id from shipment
        SELECT s.workspace_id INTO v_workspace_id
        FROM public.shipments s WHERE s.shipment_id = NEW.shipment_id;

        PERFORM public.trigger_notify(
          _title := 'ETA drift: ' || ROUND(ABS(v_drift_hours)) || 'h ' || CASE WHEN v_drift_hours > 0 THEN 'later' ELSE 'earlier' END,
          _body := 'Shipment ' || NEW.shipment_id || ' ETA shifted by ' || ROUND(ABS(v_drift_hours)) || ' hours.',
          _event_type := 'eta_worsened',
          _severity := CASE WHEN ABS(v_drift_hours) > 96 THEN 'critical' ELSE 'warning' END,
          _shipment_id := NEW.shipment_id,
          _workspace_id := v_workspace_id
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_notify_on_eta_drift
  AFTER INSERT ON public.eta_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_eta_drift();

-- 3. Mark Decision Twins stale when new ETA prediction is inserted
CREATE OR REPLACE FUNCTION public.stale_twin_on_eta()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $func$
BEGIN
  UPDATE public.decision_twins
  SET status = 'stale', stale_at = now()
  WHERE shipment_id = NEW.shipment_id
    AND status NOT IN ('stale', 'running', 'queued');
  RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_stale_twin_on_eta
  AFTER INSERT ON public.eta_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.stale_twin_on_eta();
