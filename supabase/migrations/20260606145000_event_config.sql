-- Tabela de configuração do evento
CREATE TABLE public.event_config (
  id           integer PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
  event_date   date,
  event_time   time,
  event_location text,
  sweet_dishes text[] NOT NULL DEFAULT ARRAY[
    'Canjica','Pé-de-moleque','Paçoca','Bolo de fubá','Curau',
    'Arroz doce','Cocada','Pamonha doce','Quentão (doce)',
    'Maçã do amor','Brigadeiro de paçoca','Bolo de milho'
  ],
  savory_dishes text[] NOT NULL DEFAULT ARRAY[
    'Pipoca','Pamonha salgada','Milho cozido','Cachorro-quente',
    'Pastel de forno','Caldo verde','Cuscuz paulista',
    'Espetinho de carne','Pão de queijo','Empadinha de frango',
    'Polenta frita','Linguiça na brasa'
  ],
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Insere a linha singleton com os valores padrão
INSERT INTO public.event_config (id) VALUES (1);

-- Permissões: qualquer um pode ler; apenas service_role pode escrever
GRANT SELECT ON public.event_config TO anon, authenticated;
GRANT ALL ON public.event_config TO service_role;

ALTER TABLE public.event_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read event_config" ON public.event_config FOR SELECT USING (true);
CREATE POLICY "Service role can update event_config" ON public.event_config FOR UPDATE USING (true);
