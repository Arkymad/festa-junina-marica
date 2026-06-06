
CREATE TABLE public.event_config (
  id integer PRIMARY KEY DEFAULT 1,
  event_date date,
  event_time time,
  event_location text,
  sweet_dishes text[] NOT NULL DEFAULT '{}',
  savory_dishes text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.event_config TO anon, authenticated;
GRANT ALL ON public.event_config TO service_role;

ALTER TABLE public.event_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event config" ON public.event_config FOR SELECT USING (true);
CREATE POLICY "Anyone can update event config" ON public.event_config FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can insert event config" ON public.event_config FOR INSERT WITH CHECK (true);

INSERT INTO public.event_config (id, sweet_dishes, savory_dishes) VALUES (
  1,
  ARRAY['Canjica','Pé-de-moleque','Paçoca','Bolo de fubá','Curau','Arroz doce','Cocada','Pamonha doce','Quentão (doce)','Maçã do amor','Brigadeiro de paçoca','Bolo de milho'],
  ARRAY['Pipoca','Pamonha salgada','Milho cozido','Cachorro-quente','Pastel de forno','Caldo verde','Cuscuz paulista','Espetinho de carne','Pão de queijo','Empadinha de frango','Polenta frita','Linguiça na brasa']
);
