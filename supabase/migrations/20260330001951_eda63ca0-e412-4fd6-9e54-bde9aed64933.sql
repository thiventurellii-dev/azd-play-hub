
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'player');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'player',
  UNIQUE(user_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles viewable by everyone" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'player');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seasons
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('active', 'upcoming', 'finished')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seasons viewable by everyone" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Admins manage seasons" ON public.seasons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Games
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Games viewable by everyone" ON public.games FOR SELECT USING (true);
CREATE POLICY "Admins manage games" ON public.games FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Season games
CREATE TABLE public.season_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  UNIQUE(season_id, game_id)
);
ALTER TABLE public.season_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Season games viewable by everyone" ON public.season_games FOR SELECT USING (true);
CREATE POLICY "Admins manage season games" ON public.season_games FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins manage matches" ON public.matches FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Match results
CREATE TABLE public.match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  score INTEGER DEFAULT 0,
  mmr_before INTEGER DEFAULT 1000,
  mmr_change INTEGER DEFAULT 0,
  mmr_after INTEGER DEFAULT 1000
);
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match results viewable by everyone" ON public.match_results FOR SELECT USING (true);
CREATE POLICY "Admins manage match results" ON public.match_results FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- MMR ratings
CREATE TABLE public.mmr_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  current_mmr INTEGER NOT NULL DEFAULT 1000,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, season_id)
);
ALTER TABLE public.mmr_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MMR viewable by everyone" ON public.mmr_ratings FOR SELECT USING (true);
CREATE POLICY "Admins manage MMR" ON public.mmr_ratings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mmr_ratings_updated_at BEFORE UPDATE ON public.mmr_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
