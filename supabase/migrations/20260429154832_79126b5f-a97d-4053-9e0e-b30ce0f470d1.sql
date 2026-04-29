-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.rpg_campaign_status AS ENUM ('planning', 'active', 'completed', 'abandoned');
CREATE TYPE public.rpg_campaign_player_status AS ENUM ('invited', 'accepted', 'pending_request', 'left', 'declined');
CREATE TYPE public.rpg_character_campaign_status AS ENUM ('active', 'left', 'dead', 'retired');
CREATE TYPE public.rpg_session_event_type AS ENUM ('death', 'level_up', 'milestone', 'legendary_item', 'important_npc', 'betrayal', 'achievement');
CREATE TYPE public.rpg_pillar_intensity AS ENUM ('baixa', 'media', 'alta', 'muito_alta');

-- ============================================================
-- HELPER: is the current user a master (has 'mestre' player_tag)?
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_tags
    WHERE user_id = _user_id AND tag = 'mestre'
  );
$$;

-- ============================================================
-- 1. ENRICH rpg_adventures
-- ============================================================
ALTER TABLE public.rpg_adventures
  ADD COLUMN IF NOT EXISTS recommended_level text,
  ADD COLUMN IF NOT EXISTS min_players integer,
  ADD COLUMN IF NOT EXISTS max_players integer,
  ADD COLUMN IF NOT EXISTS estimated_duration_hours integer,
  ADD COLUMN IF NOT EXISTS setting text,
  ADD COLUMN IF NOT EXISTS tone text,
  ADD COLUMN IF NOT EXISTS pillar_combat rpg_pillar_intensity,
  ADD COLUMN IF NOT EXISTS pillar_mystery rpg_pillar_intensity,
  ADD COLUMN IF NOT EXISTS pillar_exploration rpg_pillar_intensity,
  ADD COLUMN IF NOT EXISTS pillar_roleplay rpg_pillar_intensity,
  ADD COLUMN IF NOT EXISTS pillar_danger rpg_pillar_intensity,
  ADD COLUMN IF NOT EXISTS tips text,
  ADD COLUMN IF NOT EXISTS hooks text,
  ADD COLUMN IF NOT EXISTS variations text,
  ADD COLUMN IF NOT EXISTS secrets text,
  ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]'::jsonb;

-- ============================================================
-- 2. ADVENTURE INTERESTS
-- ============================================================
CREATE TABLE public.rpg_adventure_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adventure_id uuid NOT NULL REFERENCES public.rpg_adventures(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (adventure_id, player_id)
);
ALTER TABLE public.rpg_adventure_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Adventure interests viewable by everyone"
  ON public.rpg_adventure_interests FOR SELECT USING (true);

CREATE POLICY "Users mark own adventure interest"
  ON public.rpg_adventure_interests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users remove own adventure interest"
  ON public.rpg_adventure_interests FOR DELETE TO authenticated
  USING (auth.uid() = player_id);

CREATE POLICY "Admins manage adventure interests"
  ON public.rpg_adventure_interests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 3. CHARACTERS
-- ============================================================
CREATE TABLE public.rpg_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  system_id uuid REFERENCES public.rpg_systems(id) ON DELETE SET NULL,
  name text NOT NULL,
  race text,
  class text,
  level integer DEFAULT 1,
  portrait_url text,
  backstory text,
  alignment text,
  traits text,
  gear text,
  external_url text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rpg_characters_player ON public.rpg_characters(player_id);
CREATE INDEX idx_rpg_characters_system ON public.rpg_characters(system_id);
ALTER TABLE public.rpg_characters ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_rpg_characters_updated_at
  BEFORE UPDATE ON public.rpg_characters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public characters viewable by everyone"
  ON public.rpg_characters FOR SELECT
  USING (is_public OR auth.uid() = player_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Players create own characters"
  ON public.rpg_characters FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players update own characters"
  ON public.rpg_characters FOR UPDATE TO authenticated
  USING (auth.uid() = player_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = player_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Players delete own characters"
  ON public.rpg_characters FOR DELETE TO authenticated
  USING (auth.uid() = player_id OR has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 4. CAMPAIGNS
-- ============================================================
CREATE TABLE public.rpg_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adventure_id uuid REFERENCES public.rpg_adventures(id) ON DELETE SET NULL,
  master_id uuid NOT NULL,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  image_url text,
  status rpg_campaign_status NOT NULL DEFAULT 'planning',
  is_public boolean NOT NULL DEFAULT true,
  open_join boolean NOT NULL DEFAULT false,
  max_players integer DEFAULT 6,
  started_at date,
  ended_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rpg_campaigns_master ON public.rpg_campaigns(master_id);
CREATE INDEX idx_rpg_campaigns_adventure ON public.rpg_campaigns(adventure_id);
ALTER TABLE public.rpg_campaigns ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_rpg_campaigns_updated_at
  BEFORE UPDATE ON public.rpg_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. CAMPAIGN PLAYERS (party membership)
-- ============================================================
CREATE TABLE public.rpg_campaign_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.rpg_campaigns(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  status rpg_campaign_player_status NOT NULL DEFAULT 'invited',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, player_id)
);
CREATE INDEX idx_rpg_campaign_players_campaign ON public.rpg_campaign_players(campaign_id);
CREATE INDEX idx_rpg_campaign_players_player ON public.rpg_campaign_players(player_id);
ALTER TABLE public.rpg_campaign_players ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: is _user member (accepted) of _campaign?
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_campaign_member(_campaign_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rpg_campaign_players
    WHERE campaign_id = _campaign_id
      AND player_id = _user_id
      AND status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_campaign_master(_campaign_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rpg_campaigns
    WHERE id = _campaign_id AND master_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_campaign(_campaign_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rpg_campaigns c
    WHERE c.id = _campaign_id
      AND (
        c.is_public
        OR c.master_id = _user_id
        OR has_role(_user_id, 'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.rpg_campaign_players p
          WHERE p.campaign_id = c.id
            AND p.player_id = _user_id
            AND p.status IN ('accepted','invited','pending_request')
        )
      )
  );
$$;

-- ============================================================
-- CAMPAIGN policies (now that helpers exist)
-- ============================================================
CREATE POLICY "Public campaigns viewable by everyone"
  ON public.rpg_campaigns FOR SELECT
  USING (
    is_public
    OR auth.uid() = master_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.rpg_campaign_players p
      WHERE p.campaign_id = id AND p.player_id = auth.uid()
    )
  );

CREATE POLICY "Masters create campaigns"
  ON public.rpg_campaigns FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = master_id
    AND (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Master updates own campaign"
  ON public.rpg_campaigns FOR UPDATE TO authenticated
  USING (auth.uid() = master_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = master_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master deletes own campaign"
  ON public.rpg_campaigns FOR DELETE TO authenticated
  USING (auth.uid() = master_id OR has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- CAMPAIGN PLAYERS policies
-- ============================================================
CREATE POLICY "Campaign members visible to viewers"
  ON public.rpg_campaign_players FOR SELECT
  USING (
    can_view_campaign(campaign_id, auth.uid())
    OR auth.uid() = player_id
  );

CREATE POLICY "Master invites or player requests"
  ON public.rpg_campaign_players FOR INSERT TO authenticated
  WITH CHECK (
    -- master inviting someone
    is_campaign_master(campaign_id, auth.uid())
    -- player joining themselves (request or open join)
    OR (auth.uid() = player_id)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Master updates membership / player updates self"
  ON public.rpg_campaign_players FOR UPDATE TO authenticated
  USING (
    is_campaign_master(campaign_id, auth.uid())
    OR auth.uid() = player_id
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    is_campaign_master(campaign_id, auth.uid())
    OR auth.uid() = player_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Master removes member or player leaves"
  ON public.rpg_campaign_players FOR DELETE TO authenticated
  USING (
    is_campaign_master(campaign_id, auth.uid())
    OR auth.uid() = player_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 6. CAMPAIGN <-> CHARACTERS junction
-- ============================================================
CREATE TABLE public.rpg_campaign_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.rpg_campaigns(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.rpg_characters(id) ON DELETE CASCADE,
  status rpg_character_campaign_status NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  exit_room_id uuid,
  UNIQUE (campaign_id, character_id)
);
CREATE INDEX idx_rpg_campaign_characters_campaign ON public.rpg_campaign_characters(campaign_id);
CREATE INDEX idx_rpg_campaign_characters_character ON public.rpg_campaign_characters(character_id);
ALTER TABLE public.rpg_campaign_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign characters visible to campaign viewers"
  ON public.rpg_campaign_characters FOR SELECT
  USING (can_view_campaign(campaign_id, auth.uid()));

CREATE POLICY "Master or character owner manages campaign characters"
  ON public.rpg_campaign_characters FOR INSERT TO authenticated
  WITH CHECK (
    is_campaign_master(campaign_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.rpg_characters c WHERE c.id = character_id AND c.player_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Master or owner updates campaign character"
  ON public.rpg_campaign_characters FOR UPDATE TO authenticated
  USING (
    is_campaign_master(campaign_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.rpg_characters c WHERE c.id = character_id AND c.player_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    is_campaign_master(campaign_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.rpg_characters c WHERE c.id = character_id AND c.player_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Master or owner removes campaign character"
  ON public.rpg_campaign_characters FOR DELETE TO authenticated
  USING (
    is_campaign_master(campaign_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.rpg_characters c WHERE c.id = character_id AND c.player_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 7. CAMPAIGN POSTS (mural)
-- ============================================================
CREATE TABLE public.rpg_campaign_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.rpg_campaigns(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rpg_campaign_posts_campaign ON public.rpg_campaign_posts(campaign_id, created_at DESC);
ALTER TABLE public.rpg_campaign_posts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_rpg_campaign_posts_updated_at
  BEFORE UPDATE ON public.rpg_campaign_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Campaign posts visible to viewers"
  ON public.rpg_campaign_posts FOR SELECT
  USING (can_view_campaign(campaign_id, auth.uid()));

CREATE POLICY "Master and accepted members post"
  ON public.rpg_campaign_posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (
      is_campaign_master(campaign_id, auth.uid())
      OR is_campaign_member(campaign_id, auth.uid())
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Author updates own post"
  ON public.rpg_campaign_posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Author or master deletes post"
  ON public.rpg_campaign_posts FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id
    OR is_campaign_master(campaign_id, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 8. INVITE TOKENS (link compartilhável)
-- ============================================================
CREATE TABLE public.rpg_campaign_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.rpg_campaigns(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  created_by uuid NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rpg_campaign_invites_campaign ON public.rpg_campaign_invites(campaign_id);
ALTER TABLE public.rpg_campaign_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master views invites"
  ON public.rpg_campaign_invites FOR SELECT TO authenticated
  USING (
    is_campaign_master(campaign_id, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Master creates invites"
  ON public.rpg_campaign_invites FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (is_campaign_master(campaign_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Master revokes invites"
  ON public.rpg_campaign_invites FOR UPDATE TO authenticated
  USING (is_campaign_master(campaign_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_campaign_master(campaign_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master deletes invites"
  ON public.rpg_campaign_invites FOR DELETE TO authenticated
  USING (is_campaign_master(campaign_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Public lookup of invite by token (so anyone with link can join)
CREATE OR REPLACE FUNCTION public.lookup_campaign_invite(_token text)
RETURNS TABLE(campaign_id uuid, valid boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.campaign_id,
    (i.revoked_at IS NULL AND (i.expires_at IS NULL OR i.expires_at > now())) AS valid
  FROM public.rpg_campaign_invites i
  WHERE i.token = _token
  LIMIT 1;
$$;

-- ============================================================
-- 9. SESSIONS = match_rooms with campaign_id
-- ============================================================
ALTER TABLE public.match_rooms
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.rpg_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_title text,
  ADD COLUMN IF NOT EXISTS session_recap text,
  ADD COLUMN IF NOT EXISTS session_number integer;

CREATE INDEX IF NOT EXISTS idx_match_rooms_campaign ON public.match_rooms(campaign_id);

-- Auto-assign session_number per campaign on finish
CREATE OR REPLACE FUNCTION public.trg_rpg_assign_session_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.campaign_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.session_number IS NULL THEN
    SELECT COALESCE(MAX(session_number), 0) + 1
      INTO NEW.session_number
      FROM public.match_rooms
      WHERE campaign_id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_match_rooms_assign_session_number
  BEFORE INSERT OR UPDATE OF campaign_id ON public.match_rooms
  FOR EACH ROW EXECUTE FUNCTION public.trg_rpg_assign_session_number();

-- ============================================================
-- 10. SESSION EVENTS
-- ============================================================
CREATE TABLE public.rpg_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.match_rooms(id) ON DELETE CASCADE,
  event_type rpg_session_event_type NOT NULL,
  character_id uuid REFERENCES public.rpg_characters(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rpg_session_events_room ON public.rpg_session_events(room_id);
ALTER TABLE public.rpg_session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session events visible to campaign viewers"
  ON public.rpg_session_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.match_rooms r
      WHERE r.id = room_id
        AND (r.campaign_id IS NULL OR can_view_campaign(r.campaign_id, auth.uid()))
    )
  );

CREATE POLICY "Master or admin manages session events"
  ON public.rpg_session_events FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.match_rooms r
      WHERE r.id = room_id
        AND (
          r.created_by = auth.uid()
          OR (r.campaign_id IS NOT NULL AND is_campaign_master(r.campaign_id, auth.uid()))
          OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.match_rooms r
      WHERE r.id = room_id
        AND (
          r.created_by = auth.uid()
          OR (r.campaign_id IS NOT NULL AND is_campaign_master(r.campaign_id, auth.uid()))
          OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- ============================================================
-- 11. SESSION ATTENDANCE
-- ============================================================
CREATE TABLE public.rpg_session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.match_rooms(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  present boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, player_id)
);
CREATE INDEX idx_rpg_session_attendance_room ON public.rpg_session_attendance(room_id);
ALTER TABLE public.rpg_session_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendance visible to campaign viewers"
  ON public.rpg_session_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.match_rooms r
      WHERE r.id = room_id
        AND (r.campaign_id IS NULL OR can_view_campaign(r.campaign_id, auth.uid()))
    )
  );

CREATE POLICY "Master or admin manages attendance"
  ON public.rpg_session_attendance FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.match_rooms r
      WHERE r.id = room_id
        AND (
          r.created_by = auth.uid()
          OR (r.campaign_id IS NOT NULL AND is_campaign_master(r.campaign_id, auth.uid()))
          OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.match_rooms r
      WHERE r.id = room_id
        AND (
          r.created_by = auth.uid()
          OR (r.campaign_id IS NOT NULL AND is_campaign_master(r.campaign_id, auth.uid()))
          OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );
