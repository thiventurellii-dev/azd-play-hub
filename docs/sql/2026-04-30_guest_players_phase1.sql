-- =====================================================================
-- Migração 1 — Sistema de Convidados (Fase 1A + 1B)
-- Aplicar manualmente no SQL Editor da instância EXTERNA
-- (npinawelxdtsrcvzzvvs)
--
-- Objetivos:
--   1. Expandir ghost_players com nick, nome, contato e claim_token
--   2. Permitir guests em blood_match_players
--   3. Garantir que match_results / blood_match_players exijam
--      pelo menos um identificador (player_id OU ghost_player_id)
--   4. RPC unificada de busca (profiles + guests não-claimados)
--   5. View v_all_players para histórico unificado
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. ghost_players — colunas novas
-- ---------------------------------------------------------------------
ALTER TABLE public.ghost_players
  ADD COLUMN IF NOT EXISTS nickname        text,
  ADD COLUMN IF NOT EXISTS name            text,
  ADD COLUMN IF NOT EXISTS email           text,
  ADD COLUMN IF NOT EXISTS phone           text,
  ADD COLUMN IF NOT EXISTS country_code    text DEFAULT '+55',
  ADD COLUMN IF NOT EXISTS created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claim_token     text;

-- Backfill: nickname = display_name quando vazio
UPDATE public.ghost_players
   SET nickname = display_name
 WHERE nickname IS NULL OR nickname = '';

-- Backfill: claim_token = claim_code (mantém compat) ou gera
UPDATE public.ghost_players
   SET claim_token = COALESCE(claim_code, encode(gen_random_bytes(12), 'hex'))
 WHERE claim_token IS NULL;

-- Backfill: claimed_by_user_id a partir de linked_profile_id
UPDATE public.ghost_players
   SET claimed_by_user_id = linked_profile_id,
       claimed_at = COALESCE(claimed_at, now())
 WHERE linked_profile_id IS NOT NULL
   AND claimed_by_user_id IS NULL;

-- Constraints / índices
ALTER TABLE public.ghost_players
  ALTER COLUMN nickname SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ghost_players_claim_token_key
  ON public.ghost_players (claim_token);

CREATE INDEX IF NOT EXISTS ghost_players_email_idx
  ON public.ghost_players (lower(email)) WHERE email IS NOT NULL AND email <> '';

CREATE INDEX IF NOT EXISTS ghost_players_nickname_idx
  ON public.ghost_players (lower(nickname));

CREATE INDEX IF NOT EXISTS ghost_players_phone_idx
  ON public.ghost_players (phone) WHERE phone IS NOT NULL AND phone <> '';

CREATE INDEX IF NOT EXISTS ghost_players_claimed_by_idx
  ON public.ghost_players (claimed_by_user_id) WHERE claimed_by_user_id IS NOT NULL;

-- Trigger: gerar claim_token automaticamente em novos registros
CREATE OR REPLACE FUNCTION public.trg_ghost_players_set_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.claim_token IS NULL OR NEW.claim_token = '' THEN
    NEW.claim_token := encode(gen_random_bytes(12), 'hex');
  END IF;
  -- Mantém display_name sincronizado com nickname (compat)
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    NEW.display_name := NEW.nickname;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ghost_players_set_token ON public.ghost_players;
CREATE TRIGGER ghost_players_set_token
  BEFORE INSERT OR UPDATE ON public.ghost_players
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_ghost_players_set_token();

-- RLS extra: criadores podem inserir guests (não só admins)
DROP POLICY IF EXISTS "Authenticated users can create guests" ON public.ghost_players;
CREATE POLICY "Authenticated users can create guests"
  ON public.ghost_players
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- 2. blood_match_players — suporte a guests
-- ---------------------------------------------------------------------
ALTER TABLE public.blood_match_players
  ADD COLUMN IF NOT EXISTS ghost_player_id uuid
    REFERENCES public.ghost_players(id) ON DELETE SET NULL;

ALTER TABLE public.blood_match_players
  ALTER COLUMN player_id DROP NOT NULL;

-- CHECK: pelo menos um identificador deve existir
ALTER TABLE public.blood_match_players
  DROP CONSTRAINT IF EXISTS blood_match_players_player_or_ghost;
ALTER TABLE public.blood_match_players
  ADD CONSTRAINT blood_match_players_player_or_ghost
  CHECK (player_id IS NOT NULL OR ghost_player_id IS NOT NULL);

-- ---------------------------------------------------------------------
-- 3. match_results — garantir CHECK player_id OR ghost_player_id
-- ---------------------------------------------------------------------
ALTER TABLE public.match_results
  DROP CONSTRAINT IF EXISTS match_results_player_or_ghost;
ALTER TABLE public.match_results
  ADD CONSTRAINT match_results_player_or_ghost
  CHECK (player_id IS NOT NULL OR ghost_player_id IS NOT NULL);

-- ---------------------------------------------------------------------
-- 4. RPC unificada para autocomplete de jogadores
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_players_unified(
  p_query text DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE(
  kind          text,         -- 'registered' | 'guest'
  id            uuid,         -- profile.id ou ghost.id
  name          text,
  nickname      text,
  avatar_url    text,
  email         text,
  is_claimable  boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH q AS (SELECT NULLIF(lower(trim(p_query)), '') AS term)
  SELECT 'registered'::text AS kind,
         p.id, p.name, p.nickname, p.avatar_url, p.email,
         false AS is_claimable
    FROM public.profiles p, q
   WHERE p.status <> 'disabled' OR p.status IS NULL
     AND (q.term IS NULL
          OR lower(p.name)     LIKE '%' || q.term || '%'
          OR lower(p.nickname) LIKE '%' || q.term || '%'
          OR lower(p.email)    LIKE '%' || q.term || '%')

  UNION ALL

  SELECT 'guest'::text AS kind,
         g.id, g.name, g.nickname, NULL::text AS avatar_url, g.email,
         true AS is_claimable
    FROM public.ghost_players g, q
   WHERE g.claimed_by_user_id IS NULL
     AND (q.term IS NULL
          OR lower(g.name)     LIKE '%' || q.term || '%'
          OR lower(g.nickname) LIKE '%' || q.term || '%'
          OR lower(coalesce(g.email,'')) LIKE '%' || q.term || '%')

  LIMIT GREATEST(p_limit, 1);
$$;

-- ---------------------------------------------------------------------
-- 5. View unificada v_all_players (histórico, stats, rankings)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_all_players AS
  SELECT 'registered'::text AS kind,
         p.id,
         p.name,
         p.nickname,
         p.avatar_url,
         p.email,
         p.status,
         p.created_at,
         NULL::uuid  AS claimed_by_user_id
    FROM public.profiles p
  UNION ALL
  SELECT 'guest'::text AS kind,
         g.id,
         g.name,
         g.nickname,
         NULL::text AS avatar_url,
         g.email,
         CASE WHEN g.claimed_by_user_id IS NOT NULL THEN 'claimed' ELSE 'guest' END AS status,
         g.created_at,
         g.claimed_by_user_id
    FROM public.ghost_players g
   WHERE g.claimed_by_user_id IS NULL;

GRANT SELECT ON public.v_all_players TO anon, authenticated;

COMMIT;
