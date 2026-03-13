
-- Chat channels (workspace-wide, shipment-specific, or direct)
CREATE TABLE public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel_type text NOT NULL DEFAULT 'general' CHECK (channel_type IN ('general', 'shipment', 'direct')),
  shipment_id text NULL,
  created_by uuid NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat channels viewable by authenticated" ON public.chat_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Chat channels insertable by authenticated" ON public.chat_channels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Chat channels updatable by authenticated" ON public.chat_channels FOR UPDATE TO authenticated USING (true);

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NULL,
  user_name text NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  mentions text[] NOT NULL DEFAULT '{}',
  metadata jsonb NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat messages viewable by authenticated" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Chat messages insertable by authenticated" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Chat messages updatable by owner" ON public.chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
