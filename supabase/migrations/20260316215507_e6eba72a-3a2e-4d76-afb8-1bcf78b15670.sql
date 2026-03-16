
CREATE TABLE public.finding_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  rule_id text NOT NULL,
  finding_key text NOT NULL,
  action text NOT NULL CHECK (action IN ('resolved', 'accept_risk', 'approve_warning', 'override_false_positive', 'escalate', 'note')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'accepted', 'overridden', 'escalated')),
  note text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finding_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finding reviews viewable by authenticated" ON public.finding_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Finding reviews insertable by authenticated" ON public.finding_reviews FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_finding_reviews_session ON public.finding_reviews(session_id);
