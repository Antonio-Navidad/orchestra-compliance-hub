
CREATE TYPE public.checkpoint_type AS ENUM (
  'factory_release', 'warehouse_transfer', 'port_handoff', 'airport_handoff',
  'customs_checkpoint', 'cross_dock', 'inland_carrier_transfer', 'bonded_warehouse',
  'distributor_transfer', 'final_consignee_delivery'
);

CREATE TYPE public.handoff_status AS ENUM (
  'pending', 'upcoming', 'awaiting_sender', 'awaiting_receiver',
  'verified', 'issue_flagged', 'completed'
);

CREATE TYPE public.condition_status AS ENUM (
  'intact', 'minor_damage', 'major_damage', 'seal_broken',
  'packaging_compromised', 'temperature_concern', 'quantity_mismatch',
  'wrong_goods_suspected', 'rejected', 'accepted_with_notes'
);

CREATE TABLE public.handoff_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id text NOT NULL,
  route_id text,
  sequence_number integer NOT NULL DEFAULT 1,
  checkpoint_name text NOT NULL,
  checkpoint_type public.checkpoint_type NOT NULL DEFAULT 'warehouse_transfer',
  latitude numeric,
  longitude numeric,
  address_or_region text,
  planned_arrival timestamptz,
  actual_arrival timestamptz,
  sender_name text,
  sender_team text,
  sender_contact text,
  receiver_name text,
  receiver_team text,
  receiver_contact text,
  handoff_status public.handoff_status NOT NULL DEFAULT 'pending',
  quantity_expected integer,
  quantity_received integer,
  product_condition public.condition_status DEFAULT 'intact',
  quality_notes text,
  incident_flag boolean NOT NULL DEFAULT false,
  incident_type text,
  incident_notes text,
  next_checkpoint_id uuid,
  workspace_id uuid REFERENCES public.workspaces(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

ALTER TABLE public.handoff_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checkpoints viewable by workspace members" ON public.handoff_checkpoints
  FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = handoff_checkpoints.workspace_id AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Checkpoints insertable by authenticated" ON public.handoff_checkpoints
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Checkpoints updatable by authenticated" ON public.handoff_checkpoints
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Checkpoints deletable by creator or admin" ON public.handoff_checkpoints
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR is_admin(auth.uid()));

CREATE TABLE public.handoff_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id uuid NOT NULL REFERENCES public.handoff_checkpoints(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'receiver',
  verified_by uuid,
  verified_by_name text,
  quantity_confirmed integer,
  condition_status public.condition_status DEFAULT 'intact',
  quality_status text DEFAULT 'acceptable',
  notes text,
  photo_urls text[] DEFAULT '{}',
  accepted boolean NOT NULL DEFAULT true,
  discrepancy_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.handoff_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verifications viewable by authenticated" ON public.handoff_verifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Verifications insertable by authenticated" ON public.handoff_verifications
  FOR INSERT TO authenticated WITH CHECK (true);
