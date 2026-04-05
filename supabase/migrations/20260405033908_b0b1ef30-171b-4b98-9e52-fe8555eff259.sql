
-- Enum for match room status
CREATE TYPE public.match_room_status AS ENUM ('open', 'full', 'in_progress', 'finished', 'cancelled');

-- Enum for match room player type
CREATE TYPE public.match_room_player_type AS ENUM ('confirmed', 'waitlist');

-- Enum for friendship status
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted');

-- Table: match_rooms
CREATE TABLE public.match_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  max_players INT NOT NULL DEFAULT 10,
  status public.match_room_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.match_rooms ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read all rooms
CREATE POLICY "Authenticated users can view match rooms"
  ON public.match_rooms FOR SELECT TO authenticated
  USING (true);

-- RLS: Authenticated users can create rooms
CREATE POLICY "Authenticated users can create match rooms"
  ON public.match_rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS: Creator can update own room
CREATE POLICY "Creator can update own match room"
  ON public.match_rooms FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- RLS: Creator or admin can delete room
CREATE POLICY "Creator or admin can delete match room"
  ON public.match_rooms FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- RLS: Admins manage all
CREATE POLICY "Admins manage match rooms"
  ON public.match_rooms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_match_rooms_updated_at
  BEFORE UPDATE ON public.match_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: match_room_players
CREATE TABLE public.match_room_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.match_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  position INT NOT NULL DEFAULT 0,
  type public.match_room_player_type NOT NULL DEFAULT 'confirmed',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

ALTER TABLE public.match_room_players ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated can read
CREATE POLICY "Authenticated users can view match room players"
  ON public.match_room_players FOR SELECT TO authenticated
  USING (true);

-- RLS: Users can join (insert themselves)
CREATE POLICY "Users can join match rooms"
  ON public.match_room_players FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

-- RLS: Users can leave (delete themselves)
CREATE POLICY "Users can leave match rooms"
  ON public.match_room_players FOR DELETE TO authenticated
  USING (auth.uid() = player_id OR public.has_role(auth.uid(), 'admin'));

-- RLS: Admins manage all
CREATE POLICY "Admins manage match room players"
  ON public.match_room_players FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table: friendships (phase 4 - DB only)
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendship requests"
  ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friendships"
  ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete own friendships"
  ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Table: match_room_comments (phase 4 - DB only)
CREATE TABLE public.match_room_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.match_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.match_room_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments"
  ON public.match_room_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create own comments"
  ON public.match_room_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.match_room_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_room_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
