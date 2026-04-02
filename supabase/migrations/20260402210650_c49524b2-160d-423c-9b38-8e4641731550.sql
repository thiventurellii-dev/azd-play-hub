
-- Enum for season type
DO $$ BEGIN
  CREATE TYPE public.season_type AS ENUM ('boardgame', 'blood');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for BotC role types
DO $$ BEGIN
  CREATE TYPE public.blood_role_type AS ENUM ('townsfolk', 'outsider', 'minion', 'demon');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for BotC teams
DO $$ BEGIN
  CREATE TYPE public.blood_team AS ENUM ('good', 'evil');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add type column to seasons
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS type public.season_type NOT NULL DEFAULT 'boardgame';

-- Blood Scripts table
CREATE TABLE IF NOT EXISTS public.blood_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blood scripts viewable by everyone" ON public.blood_scripts FOR SELECT USING (true);
CREATE POLICY "Admins manage blood scripts" ON public.blood_scripts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Blood Characters table
CREATE TABLE IF NOT EXISTS public.blood_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.blood_scripts(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_en text NOT NULL,
  role_type public.blood_role_type NOT NULL,
  team public.blood_team NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blood characters viewable by everyone" ON public.blood_characters FOR SELECT USING (true);
CREATE POLICY "Admins manage blood characters" ON public.blood_characters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Season Blood Scripts (junction)
CREATE TABLE IF NOT EXISTS public.season_blood_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  script_id uuid NOT NULL REFERENCES public.blood_scripts(id) ON DELETE CASCADE,
  UNIQUE(season_id, script_id)
);
ALTER TABLE public.season_blood_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Season blood scripts viewable by everyone" ON public.season_blood_scripts FOR SELECT USING (true);
CREATE POLICY "Admins manage season blood scripts" ON public.season_blood_scripts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Blood Matches
CREATE TABLE IF NOT EXISTS public.blood_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  script_id uuid NOT NULL REFERENCES public.blood_scripts(id),
  played_at timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer,
  storyteller_player_id uuid NOT NULL,
  winning_team public.blood_team NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blood matches viewable by everyone" ON public.blood_matches FOR SELECT USING (true);
CREATE POLICY "Admins manage blood matches" ON public.blood_matches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Blood Match Players
CREATE TABLE IF NOT EXISTS public.blood_match_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.blood_matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  character_id uuid NOT NULL REFERENCES public.blood_characters(id),
  team public.blood_team NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_match_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blood match players viewable by everyone" ON public.blood_match_players FOR SELECT USING (true);
CREATE POLICY "Admins manage blood match players" ON public.blood_match_players FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Blood MMR Ratings
CREATE TABLE IF NOT EXISTS public.blood_mmr_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  wins_evil integer NOT NULL DEFAULT 0,
  wins_good integer NOT NULL DEFAULT 0,
  games_as_storyteller integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, season_id)
);
ALTER TABLE public.blood_mmr_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blood MMR viewable by everyone" ON public.blood_mmr_ratings FOR SELECT USING (true);
CREATE POLICY "Admins manage blood MMR" ON public.blood_mmr_ratings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed scripts
INSERT INTO public.blood_scripts (id, name, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Trouble Brewing', 'Script iniciante, recomendado para novos jogadores'),
  ('a0000000-0000-0000-0000-000000000002', 'Bad Moon Rising', 'Script intermediário, múltiplas mortes por noite')
ON CONFLICT DO NOTHING;

-- Seed Trouble Brewing characters
INSERT INTO public.blood_characters (script_id, name, name_en, role_type, team, description) VALUES
-- Townsfolk
('a0000000-0000-0000-0000-000000000001', 'Lavadeira', 'Washerwoman', 'townsfolk', 'good', 'Você começa sabendo que 1 de 2 jogadores é um Aldeão específico.'),
('a0000000-0000-0000-0000-000000000001', 'Bibliotecário', 'Librarian', 'townsfolk', 'good', 'Você começa sabendo que 1 de 2 jogadores é um Forasteiro específico (ou que nenhum está em jogo).'),
('a0000000-0000-0000-0000-000000000001', 'Investigador', 'Investigator', 'townsfolk', 'good', 'Você começa sabendo que 1 de 2 jogadores é um Lacaio específico.'),
('a0000000-0000-0000-0000-000000000001', 'Chefe', 'Chef', 'townsfolk', 'good', 'Você começa sabendo quantos pares de jogadores malignos existem.'),
('a0000000-0000-0000-0000-000000000001', 'Empático', 'Empath', 'townsfolk', 'good', 'Cada noite, você descobre quantos dos seus 2 vizinhos vivos são malignos.'),
('a0000000-0000-0000-0000-000000000001', 'Vidente', 'Fortune Teller', 'townsfolk', 'good', 'Cada noite, escolha 2 jogadores: você descobre se algum deles é o Demônio.'),
('a0000000-0000-0000-0000-000000000001', 'Coveiro', 'Undertaker', 'townsfolk', 'good', 'Cada noite (exceto a primeira), você descobre qual personagem foi executado hoje.'),
('a0000000-0000-0000-0000-000000000001', 'Monge', 'Monk', 'townsfolk', 'good', 'Cada noite (exceto a primeira), escolha um jogador (não você mesmo): eles ficam protegidos do Demônio esta noite.'),
('a0000000-0000-0000-0000-000000000001', 'Mestre dos Corvos', 'Ravenkeeper', 'townsfolk', 'good', 'Se você morrer à noite, pode escolher um jogador e descobrir qual personagem ele é.'),
('a0000000-0000-0000-0000-000000000001', 'Virgem', 'Virgin', 'townsfolk', 'good', 'Pela primeira vez que você for nomeado para execução, se o nomeador for Aldeão, eles morrem imediatamente.'),
('a0000000-0000-0000-0000-000000000001', 'Atirador', 'Slayer', 'townsfolk', 'good', 'Uma vez por jogo, durante o dia, escolha um jogador: se ele for o Demônio, ele morre.'),
('a0000000-0000-0000-0000-000000000001', 'Soldado', 'Soldier', 'townsfolk', 'good', 'Você não pode ser morto pelo Demônio.'),
('a0000000-0000-0000-0000-000000000001', 'Prefeito', 'Mayor', 'townsfolk', 'good', 'Se apenas 3 jogadores estiverem vivos e nenhuma execução acontecer, seu time vence. Se você morrer à noite, outro jogador pode morrer no seu lugar.'),
-- Outsiders
('a0000000-0000-0000-0000-000000000001', 'Bêbado', 'Drunk', 'outsider', 'good', 'Você não sabe que é o Bêbado. Você acredita ser um Aldeão, mas suas habilidades não funcionam corretamente.'),
('a0000000-0000-0000-0000-000000000001', 'Recluso', 'Recluse', 'outsider', 'good', 'Você pode se registrar como maligno e como Lacaio ou Demônio, mesmo sendo bom.'),
('a0000000-0000-0000-0000-000000000001', 'Santo', 'Saint', 'outsider', 'good', 'Se você for executado, seu time perde.'),
('a0000000-0000-0000-0000-000000000001', 'Mordomo', 'Butler', 'outsider', 'good', 'Cada noite, escolha um jogador (seu Mestre): você só pode votar se ele votar primeiro.'),
-- Minions
('a0000000-0000-0000-0000-000000000001', 'Envenenador', 'Poisoner', 'minion', 'evil', 'Cada noite, escolha um jogador: ele fica envenenado até a próxima noite (habilidade não funciona).'),
('a0000000-0000-0000-0000-000000000001', 'Espião', 'Spy', 'minion', 'evil', 'Você pode ver o Grimório a cada noite. Você pode se registrar como bom e como Aldeão ou Forasteiro.'),
('a0000000-0000-0000-0000-000000000001', 'Mulher Escarlate', 'Scarlet Woman', 'minion', 'evil', 'Se houver 5 ou mais jogadores e o Demônio morrer, você se torna o Demônio.'),
('a0000000-0000-0000-0000-000000000001', 'Barão', 'Baron', 'minion', 'evil', 'Quando a partida começa, há 2 Forasteiros extras em jogo. [+2 Forasteiros]'),
('a0000000-0000-0000-0000-000000000001', 'Marionete', 'Marionette', 'minion', 'evil', 'Você acredita ser um Aldeão, mas na verdade é maligno. O Demônio sabe quem você é.'),
-- Demon
('a0000000-0000-0000-0000-000000000001', 'Capeta', 'Imp', 'demon', 'evil', 'Cada noite (exceto a primeira), escolha um jogador: ele morre. Se você se matar, um Lacaio se torna o novo Capeta.');

-- Seed Bad Moon Rising characters
INSERT INTO public.blood_characters (script_id, name, name_en, role_type, team, description) VALUES
-- Townsfolk
('a0000000-0000-0000-0000-000000000002', 'Avó', 'Grandmother', 'townsfolk', 'good', 'Você começa sabendo um jogador bom e qual personagem ele é. Se o Demônio matá-lo, você morre também.'),
('a0000000-0000-0000-0000-000000000002', 'Camareira', 'Chambermaid', 'townsfolk', 'good', 'Cada noite, escolha 2 jogadores vivos (não você): você descobre quantos acordaram esta noite por suas habilidades.'),
('a0000000-0000-0000-0000-000000000002', 'Cortesão', 'Courtier', 'townsfolk', 'good', 'Uma vez por jogo, à noite, escolha um personagem: ele fica bêbado por 3 noites e 3 dias.'),
('a0000000-0000-0000-0000-000000000002', 'Exorcista', 'Exorcist', 'townsfolk', 'good', 'Cada noite (exceto a primeira), escolha um jogador diferente do de ontem: se for o Demônio, ele aprende quem você é e não age esta noite.'),
('a0000000-0000-0000-0000-000000000002', 'Hosteleiro', 'Innkeeper', 'townsfolk', 'good', 'Cada noite (exceto a primeira), escolha 2 jogadores: eles não podem morrer esta noite, mas 1 deles fica bêbado até o amanhecer.'),
('a0000000-0000-0000-0000-000000000002', 'Apostador', 'Gambler', 'townsfolk', 'good', 'Cada noite (exceto a primeira), escolha um jogador e adivinhe seu personagem: se errar, você morre.'),
('a0000000-0000-0000-0000-000000000002', 'Fofoqueiro', 'Gossip', 'townsfolk', 'good', 'Cada dia, você pode fazer uma declaração pública. Esta noite, se for verdade, um jogador morre.'),
('a0000000-0000-0000-0000-000000000002', 'Professor', 'Professor', 'townsfolk', 'good', 'Uma vez por jogo, à noite (exceto a primeira), escolha um jogador morto: se for Aldeão, ele ressuscita.'),
('a0000000-0000-0000-0000-000000000002', 'Menestrel', 'Minstrel', 'townsfolk', 'good', 'Quando um Lacaio morre por execução, todos os outros jogadores ficam bêbados até o amanhecer de amanhã.'),
('a0000000-0000-0000-0000-000000000002', 'Pacifista', 'Pacifist', 'townsfolk', 'good', 'Jogadores bons executados podem não morrer.'),
('a0000000-0000-0000-0000-000000000002', 'Marinheiro', 'Sailor', 'townsfolk', 'good', 'Cada noite, escolha um jogador vivo: ou você, ou ele, ficará bêbado até o amanhecer. Você não pode morrer.'),
('a0000000-0000-0000-0000-000000000002', 'Senhora do Chá', 'Tea Lady', 'townsfolk', 'good', 'Se ambos os seus vizinhos vivos forem bons, eles não podem morrer.'),
('a0000000-0000-0000-0000-000000000002', 'Tolo', 'Fool', 'townsfolk', 'good', 'A primeira vez que você deveria morrer, você não morre.'),
-- Outsiders
('a0000000-0000-0000-0000-000000000002', 'Excêntrico', 'Goon', 'outsider', 'good', 'Quando um jogador usa sua habilidade para escolher você (primeiro desta noite), ele fica bêbado e você muda de alinhamento.'),
('a0000000-0000-0000-0000-000000000002', 'Filho da Lua', 'Moonchild', 'outsider', 'good', 'Quando você descobrir que morreu, escolha publicamente 1 jogador vivo: se for bom, ele morre.'),
('a0000000-0000-0000-0000-000000000002', 'Funileiro', 'Tinker', 'outsider', 'good', 'Você pode morrer a qualquer momento.'),
('a0000000-0000-0000-0000-000000000002', 'Lunático', 'Lunatic', 'outsider', 'good', 'Você acredita ser o Demônio. O Demônio real sabe quem você é.'),
-- Minions
('a0000000-0000-0000-0000-000000000002', 'Advogado do Diabo', 'Devil''s Advocate', 'minion', 'evil', 'Cada noite, escolha um jogador vivo (diferente do de ontem): se for executado amanhã, ele não morre.'),
('a0000000-0000-0000-0000-000000000002', 'Assassino', 'Assassin', 'minion', 'evil', 'Uma vez por jogo, à noite (exceto a primeira), escolha um jogador: ele morre, mesmo que nada pudesse matá-lo.'),
('a0000000-0000-0000-0000-000000000002', 'Mestre das Mentes', 'Mastermind', 'minion', 'evil', 'Se o Demônio morrer por execução (encerrando o jogo), jogue mais 1 dia. Se um jogador for executado, seu time perde.'),
('a0000000-0000-0000-0000-000000000002', 'Padrinho', 'Godfather', 'minion', 'evil', 'Você começa sabendo quais Forasteiros estão em jogo. Se 1 morreu hoje, escolha um jogador esta noite: ele morre. [-1 ou +1 Forasteiro]'),
-- Demons
('a0000000-0000-0000-0000-000000000002', 'Zombuul', 'Zombuul', 'demon', 'evil', 'Cada noite (exceto a primeira), se ninguém morreu hoje, escolha um jogador: ele morre. Na primeira vez que você morrer, você vive mas se registra como morto.'),
('a0000000-0000-0000-0000-000000000002', 'Pukka', 'Pukka', 'demon', 'evil', 'Cada noite, escolha um jogador: ele fica envenenado. O jogador envenenado anteriormente morre e fica saudável.'),
('a0000000-0000-0000-0000-000000000002', 'Shabaloth', 'Shabaloth', 'demon', 'evil', 'Cada noite (exceto a primeira), escolha 2 jogadores: eles morrem. Um jogador morto que você escolheu na noite anterior pode ser regurgitado.'),
('a0000000-0000-0000-0000-000000000002', 'Po', 'Po', 'demon', 'evil', 'Cada noite (exceto a primeira), você pode escolher um jogador: ele morre. Se você escolheu ninguém na noite anterior, escolha 3 jogadores esta noite.');
