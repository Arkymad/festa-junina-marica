
CREATE TABLE public.confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sweet_dish text NOT NULL,
  savory_dish text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.confirmations TO anon, authenticated;
GRANT ALL ON public.confirmations TO service_role;
ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view confirmations" ON public.confirmations FOR SELECT USING (true);
CREATE POLICY "Anyone can create confirmations" ON public.confirmations FOR INSERT WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.confirmations;
