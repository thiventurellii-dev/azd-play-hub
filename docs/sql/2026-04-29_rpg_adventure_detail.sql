-- ============================================================
-- RPG Adventure Detail page — extra fields + interests table
-- Run this manually on the EXTERNAL Supabase project:
-- https://npinawelxdtsrcvzzvvs.supabase.co
-- ============================================================

-- 1) Extra optional columns on rpg_adventures
ALTER TABLE public.rpg_adventures
  ADD COLUMN IF NOT EXISTS tagline             text,
  ADD COLUMN IF NOT EXISTS level_min           int,
  ADD COLUMN IF NOT EXISTS level_max           int,
  ADD COLUMN IF NOT EXISTS players_min         int,
  ADD COLUMN IF NOT EXISTS players_max         int,
  ADD COLUMN IF NOT EXISTS duration_hours_min  int,
  ADD COLUMN IF NOT EXISTS duration_hours_max  int,
  ADD COLUMN IF NOT EXISTS tone                text,
  ADD COLUMN IF NOT EXISTS genres              text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS intensity           jsonb  DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS about_long          text,
  ADD COLUMN IF NOT EXISTS highlights          jsonb  DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS master_notes        jsonb  DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS materials           jsonb  DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS materials_url       text;

-- 2) Interests table
CREATE TABLE IF NOT EXISTS public.rpg_adventure_interests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adventure_id  uuid NOT NULL REFERENCES public.rpg_adventures(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (adventure_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rpg_adventure_interests_adv  ON public.rpg_adventure_interests(adventure_id);
CREATE INDEX IF NOT EXISTS idx_rpg_adventure_interests_user ON public.rpg_adventure_interests(user_id);

ALTER TABLE public.rpg_adventure_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Interests viewable by authenticated" ON public.rpg_adventure_interests;
CREATE POLICY "Interests viewable by authenticated"
  ON public.rpg_adventure_interests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users insert own interest" ON public.rpg_adventure_interests;
CREATE POLICY "Users insert own interest"
  ON public.rpg_adventure_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own interest" ON public.rpg_adventure_interests;
CREATE POLICY "Users delete own interest"
  ON public.rpg_adventure_interests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all interests" ON public.rpg_adventure_interests;
CREATE POLICY "Admins manage all interests"
  ON public.rpg_adventure_interests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
