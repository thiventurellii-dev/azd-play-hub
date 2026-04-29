-- Enum de tags de jogador
CREATE TYPE public.player_tag AS ENUM ('boardgamer', 'blood', 'storyteller', 'aventureiro', 'mestre');

-- Tabela de tags por perfil (multi-select)
CREATE TABLE public.profile_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tag public.player_tag NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag)
);

CREATE INDEX idx_profile_tags_user ON public.profile_tags(user_id);

ALTER TABLE public.profile_tags ENABLE ROW LEVEL SECURITY;

-- Visível para todos (assim aparecem no perfil público / cards)
CREATE POLICY "Profile tags viewable by everyone"
  ON public.profile_tags FOR SELECT
  USING (true);

-- Usuário gerencia as próprias tags
CREATE POLICY "Users insert own tags"
  ON public.profile_tags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own tags"
  ON public.profile_tags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin pode revogar (necessário para revogar tag 'mestre' em caso de abuso)
CREATE POLICY "Admins manage all profile tags"
  ON public.profile_tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Slug em rpg_adventures e rpg_systems (Fase 2)
ALTER TABLE public.rpg_adventures ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.rpg_systems ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;