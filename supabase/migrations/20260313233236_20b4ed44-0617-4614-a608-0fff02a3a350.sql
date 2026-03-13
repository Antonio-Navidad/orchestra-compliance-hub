
-- Saved routes table with full lifecycle states
CREATE TABLE public.saved_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id),
  name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  is_template boolean NOT NULL DEFAULT false,
  origin_name text,
  origin_lat numeric,
  origin_lng numeric,
  destination_name text,
  destination_lat numeric,
  destination_lng numeric,
  mode text NOT NULL DEFAULT 'sea',
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  network_route jsonb,
  notes text DEFAULT '',
  sensitivity text DEFAULT 'medium',
  tags text[] DEFAULT '{}',
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Saved routes viewable by owner"
  ON public.saved_routes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Saved routes insertable by authenticated"
  ON public.saved_routes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Saved routes updatable by owner"
  ON public.saved_routes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Saved routes deletable by owner"
  ON public.saved_routes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_saved_routes_updated_at
  BEFORE UPDATE ON public.saved_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for quick lookups
CREATE INDEX idx_saved_routes_user_status ON public.saved_routes(user_id, status);
CREATE INDEX idx_saved_routes_deleted ON public.saved_routes(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
