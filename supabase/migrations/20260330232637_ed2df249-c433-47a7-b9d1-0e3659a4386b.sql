
-- Add new columns to games table
ALTER TABLE public.games ADD COLUMN rules_url text;
ALTER TABLE public.games ADD COLUMN video_url text;
ALTER TABLE public.games ADD COLUMN min_players integer DEFAULT 1;
ALTER TABLE public.games ADD COLUMN max_players integer DEFAULT 10;

-- Create community_rules table
CREATE TABLE public.community_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.community_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rules viewable by everyone"
ON public.community_rules FOR SELECT TO public USING (true);

CREATE POLICY "Admins manage rules"
ON public.community_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert default empty rules row
INSERT INTO public.community_rules (content) VALUES ('# Regras da Comunidade AzD

Bem-vindo à comunidade Amizade! Aqui estão as regras básicas:

1. **Respeito** — Trate todos os membros com respeito.
2. **Fair Play** — Jogue de forma justa e honesta.
3. **Pontualidade** — Chegue no horário combinado para as partidas.
4. **Diversão** — Lembre-se: o objetivo principal é se divertir!
');
